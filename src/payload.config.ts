import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Users } from './collections/Users'
import { BusinessInfo } from './globals/BusinessInfo'
import { SiteSettings } from './globals/SiteSettings'
import { adminTranslations } from './i18n/admin-translations'
import { requireEnv } from './lib/env'
import { logger } from './lib/log'
import { DEFAULT_LOCALE, LOCALES } from './lib/locales'
import { resolveR2Config } from './lib/r2'
import { loadSecrets } from './lib/secrets'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Credentials come from Vault, which is asynchronous, so the config is
 * assembled inside a function and the module exports the promise.
 *
 * This needs no top-level `await` and asks nothing new of any loader:
 * `buildConfig` already returns `Promise<SanitizedConfig>`, and every
 * consumer already awaits the default export — `getPayload({ config })`,
 * the `@payloadcms/next` route handlers, and Payload's own CLI, which does
 * `config = await config.default`. The export's shape is unchanged.
 */
/**
 * Which database this process will talk to, without its credentials.
 *
 * Payload's adapter owns the socket, so a connection success is not observable
 * from here — what is, is the target it was handed, and "pointing at the wrong
 * (empty) database" is a documented failure in the runbook that this makes
 * visible at boot instead of at the first 500.
 */
const databaseTarget = (uri: string): string => {
  try {
    const { hostname, port, pathname } = new URL(uri)

    return `${hostname}${port ? `:${port}` : ''}${pathname}`
  } catch {
    // A malformed URI must not take the boot down here — the adapter will fail
    // with a better message than this function could.
    return 'unparseable'
  }
}

const buildConfigFromVault = async () => {
  const secrets = await loadSecrets()

  // null means local disk, which resolveR2Config only permits in development.
  const r2 = resolveR2Config(secrets)

  const databaseUri = requireEnv('DATABASE_URI')

  logger('db:config').info('target resolved', { at: databaseTarget(databaseUri) })

  return buildConfig({
    admin: {
      user: Users.slug,
      importMap: {
        baseDir: path.resolve(dirname),
        // Payload otherwise looks for src/app/(payload)/admin/ by hardcoded
        // path (payload/dist/bin/generateImportMap/utilities/
        // resolveImportMapFilePath.js). The admin lives in the plain `crm`
        // folder here, so without this `generate:importmap` cannot find it.
        importMapFile: path.resolve(dirname, 'app/crm/admin/importMap.js'),
      },
    },
    collections: [Pages, Media, Users],
    /**
     * Single source for every business detail and site-wide default (T-05).
     * A phone number or a title suffix written into a component is a bug.
     */
    globals: [BusinessInfo, SiteSettings],
    /**
     * Content localization. Which fields are localized is a schema decision —
     * Payload stores localized values in separate tables — so this must be in
     * place before the collections are built (Design.md section 1.1a, T-04A).
     */
    localization: {
      locales: LOCALES.map((code) => ({
        code,
        label: { en: code === 'vi' ? 'Vietnamese' : 'English', vi: code === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh' },
      })),
      defaultLocale: DEFAULT_LOCALE,
      /**
       * Field-level fallback, so a half-translated document still renders.
       * It is NOT permission to publish an untranslated page: the noindex
       * guard in T-08 keeps those out of the index.
       */
      fallback: true,
    },
    /**
     * Admin panel language. Independent of the content locale being edited —
     * a Vietnamese-speaking editor translating into English should not have to
     * read the CMS chrome in English to do it.
     */
    i18n: {
      fallbackLanguage: DEFAULT_LOCALE,
      translations: adminTranslations,
    },
    db: postgresAdapter({
      pool: {
        connectionString: databaseUri,
      },
      migrationDir: path.resolve(dirname, 'migrations'),
      // Without this the adapter pushes schema changes straight to the database
      // in development. That diverges dev from deployed environments, and
      // `payload migrate` then refuses to run without a data-loss prompt
      // because it cannot tell what the push already applied. Migrations are
      // the only way the schema changes here (AGENT.md section 3).
      push: false,
    }),
    editor: lexicalEditor(),
    // Required for upload.imageSizes; without it Payload stores the original
    // and silently generates no sizes.
    sharp,
    plugins: r2
      ? [
          s3Storage({
            collections: {
              media: {
                // Serve straight from R2's public host instead of proxying every
                // image through the Next server, which would put the whole media
                // library on the critical path for LCP (AGENT.md section 5.5).
                disablePayloadAccessControl: true,
                generateFileURL: ({ filename, prefix }) =>
                  [r2.publicUrl, prefix, filename].filter(Boolean).join('/'),
              },
            },
            bucket: r2.bucket,
            config: {
              credentials: {
                accessKeyId: r2.accessKeyId,
                secretAccessKey: r2.secretAccessKey,
              },
              endpoint: r2.endpoint,
              // R2 requires both: it has no concept of AWS regions, and it
              // rejects virtual-host-style addressing.
              forcePathStyle: true,
              region: 'auto',
            },
          }),
        ]
      : [],
    // Nothing in Design.md uses GraphQL. Left on, it serves a public schema
    // playground in production and a second login path (a `login` mutation)
    // that controls on /api/users/login would not cover.
    graphQL: {
      disable: true,
    },
    secret: secrets.PAYLOAD_SECRET,
    // Generated file — never hand-edit, always commit alongside the config
    // change that produced it (AGENT.md section 3).
    typescript: {
      outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
  })
}

export default buildConfigFromVault()
