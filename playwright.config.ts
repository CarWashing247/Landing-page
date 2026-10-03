import { defineConfig } from '@playwright/test'

// Playwright does not read .env. Load it when present (local runs); CI
// provides real environment variables instead.
try {
  process.loadEnvFile('.env')
} catch {
  // no .env — rely on the environment
}

const baseURL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/**
 * End-to-end suite. Runs against a production build, because the rewrite
 * layer in next.config.mjs behaves the same there as on Vercel and a dev
 * server is not what crawlers see.
 *
 * Needs a reachable database (DATABASE_URI). Specs that log in also need
 * E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD and are skipped without them.
 */
export default defineConfig({
  testDir: './e2e',
  use: { baseURL },
  webServer: {
    command: 'npm run build && npm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
})
