import { logger } from './log'
import type { Secrets } from './secrets'

/**
 * Cloudflare R2 configuration, resolved once.
 *
 * Media must leave the deploy: Vercel's filesystem is ephemeral, so an upload
 * written there disappears on the next deployment. Local disk is therefore an
 * explicit opt-in for development only (`MEDIA_LOCAL_DISK`), never a silent
 * fallback — a deployed environment missing its R2 credentials fails loudly
 * instead of accepting uploads it will lose.
 *
 * The four credentials come from Vault. `R2_PUBLIC_URL` does not and cannot:
 * `next.config.mjs` reads it at build time to build `images.remotePatterns`,
 * which is baked into the build output, and it is a public CDN hostname
 * rather than a credential (AGENT.md section 7.1).
 */
export type R2Config = {
  accessKeyId: string
  bucket: string
  endpoint: string
  /** Public base URL the browser fetches images from (CDN or r2.dev host). */
  publicUrl: string
  secretAccessKey: string
}

/** From Vault. All four or none — a partial set is a configuration error. */
const SECRET_KEYS = [
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
] as const

/** `null` means "store on local disk", which is only legal in development. */
export const resolveR2Config = (secrets: Secrets): R2Config | null => {
  const missing: string[] = SECRET_KEYS.filter((key) => !secrets[key])

  if (!process.env.R2_PUBLIC_URL) {
    missing.push('R2_PUBLIC_URL (environment, not Vault)')
  }

  const log = logger('media:config')

  if (missing.length === 0) {
    // Logged because the alternative — uploads quietly going to a filesystem
    // that does not survive a deployment — is the exact failure this function
    // exists to prevent, and it is silent. One line per process says which
    // backend won. The host, never the credentials.
    log.info('storing in R2', { bucket: secrets.R2_BUCKET, endpoint: secrets.R2_ENDPOINT })

    return {
      accessKeyId: secrets.R2_ACCESS_KEY_ID!,
      bucket: secrets.R2_BUCKET!,
      endpoint: secrets.R2_ENDPOINT!,
      publicUrl: process.env.R2_PUBLIC_URL!.replace(/\/$/, ''),
      secretAccessKey: secrets.R2_SECRET_ACCESS_KEY!,
    }
  }

  if (process.env.MEDIA_LOCAL_DISK !== 'true') {
    throw new Error(
      `Media storage is not configured: ${missing.join(', ')} ${
        missing.length === 1 ? 'is' : 'are'
      } missing. The four R2 credentials live in Vault at ` +
        `${process.env.VAULT_SECRET_PATH ?? '<VAULT_SECRET_PATH>'} ` +
        `(AGENT.md section 7.2); R2_PUBLIC_URL is an environment variable. ` +
        `Or set MEDIA_LOCAL_DISK=true to store uploads on local disk — ` +
        `development only, because the deploy's filesystem does not survive ` +
        `a deployment.`,
    )
  }

  /**
   * "Development only" was a comment, not a rule, and a comment does not stop
   * `MEDIA_LOCAL_DISK=true` being pasted into a hosting dashboard alongside the
   * rest of `.env.example`. The result is silent: the storage plugin never
   * loads, uploads land on the deploy's filesystem, and they disappear on the
   * next deployment with nothing in the admin UI saying so.
   *
   * `VERCEL_ENV` is the signal, not `NODE_ENV`. `next build` sets
   * `NODE_ENV=production` on a developer's machine too, so gating on it would
   * refuse every local production build — the one this repo's verification
   * steps actually run.
   */
  const deployedEnv = process.env.VERCEL_ENV

  if (deployedEnv) {
    throw new Error(
      `MEDIA_LOCAL_DISK is set in a deployed environment (VERCEL_ENV=` +
        `${deployedEnv}). Uploads would be written to the deploy's filesystem, ` +
        `which does not survive the next deployment, and they would be lost ` +
        `without any error. Unset it and give this environment the four R2 ` +
        `credentials in Vault (AGENT.md section 7.2).`,
    )
  }

  log.info('storing on local disk', { reason: 'MEDIA_LOCAL_DISK', missing: missing.length })

  return null
}
