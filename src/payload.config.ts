import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { requireEnv } from './lib/env'
import { resolveR2Config } from './lib/r2'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// null means local disk, which resolveR2Config only permits in development.
const r2 = resolveR2Config()

export default buildConfig({
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
  collections: [Media, Users],
  db: postgresAdapter({
    pool: {
      connectionString: requireEnv('DATABASE_URI'),
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
  secret: requireEnv('PAYLOAD_SECRET'),
  // Generated file — never hand-edit, always commit alongside the config
  // change that produced it (AGENT.md section 3).
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
