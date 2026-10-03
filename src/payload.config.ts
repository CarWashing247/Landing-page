import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'

import { Users } from './collections/Users'
import { requireEnv } from './lib/env'

const dirname = path.dirname(fileURLToPath(import.meta.url))

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
  collections: [Users],
  db: postgresAdapter({
    pool: {
      connectionString: requireEnv('DATABASE_URI'),
    },
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  editor: lexicalEditor(),
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
