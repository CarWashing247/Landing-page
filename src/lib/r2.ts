/**
 * Cloudflare R2 configuration, resolved once.
 *
 * Media must leave the deploy: Vercel's filesystem is ephemeral, so an upload
 * written there disappears on the next deployment. Local disk is therefore an
 * explicit opt-in for development only (`MEDIA_LOCAL_DISK`), never a silent
 * fallback — a deployed environment missing its R2 variables fails loudly
 * instead of accepting uploads it will lose.
 */
export type R2Config = {
  accessKeyId: string
  bucket: string
  endpoint: string
  /** Public base URL the browser fetches images from (CDN or r2.dev host). */
  publicUrl: string
  secretAccessKey: string
}

const KEYS = [
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
  'R2_PUBLIC_URL',
] as const

/** `null` means "store on local disk", which is only legal in development. */
export const resolveR2Config = (): R2Config | null => {
  const missing = KEYS.filter((key) => !process.env[key])

  if (missing.length === 0) {
    return {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      bucket: process.env.R2_BUCKET!,
      endpoint: process.env.R2_ENDPOINT!,
      publicUrl: process.env.R2_PUBLIC_URL!.replace(/\/$/, ''),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    }
  }

  if (process.env.MEDIA_LOCAL_DISK !== 'true') {
    throw new Error(
      `Media storage is not configured: ${missing.join(', ')} ${
        missing.length === 1 ? 'is' : 'are'
      } missing. Set them for this environment, or set MEDIA_LOCAL_DISK=true ` +
        `to store uploads on local disk — development only, because the ` +
        `deploy's filesystem does not survive a deployment. See .env.example.`,
    )
  }

  return null
}
