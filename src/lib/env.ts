import { SECRET_KEYS } from './secrets'

/**
 * Non-secret configuration, from the environment.
 *
 * Credentials do not come from here — they come from Vault, via
 * `loadSecrets()` in `./secrets.ts` (AGENT.md section 5.7). This function
 * refuses them outright rather than trusting the convention to hold: the
 * failure mode it prevents is a credential quietly reappearing in
 * `process.env` because that was the path of least resistance during a
 * later task.
 */
export const requireEnv = (name: string): string => {
  if ((SECRET_KEYS as readonly string[]).includes(name)) {
    throw new Error(
      `${name} is a credential and comes from Vault, not the environment. ` +
        `Read it with getSecret('${name}') from src/lib/secrets.ts. ` +
        `See AGENT.md section 7.2.`,
    )
  }

  const value = process.env[name]

  /**
   * Fail loudly at module load rather than at the first request.
   *
   * A missing DATABASE_URI that defaults to something plausible is worse
   * than a crash: the app boots, connects to the wrong place, and nothing
   * says so.
   */
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `See .env.example for what it is and how to generate it.`,
    )
  }

  return value
}

/**
 * The site's origin, with no trailing slash.
 *
 * Every absolute URL the site emits for a crawler is built from this: the
 * `Sitemap:` line in `robots.txt`, every `<loc>` and `hreflang` in the sitemap,
 * and every `@id` and `url` in the JSON-LD. They have to agree character for
 * character, because a schema `@id` that differs from the canonical URL by a
 * trailing slash is a different node to Google, and T-14 links the `Service` on
 * a service page to the business node emitted on the home page by exactly that
 * string.
 *
 * The trailing slash is stripped here rather than at each call site because
 * `NEXT_PUBLIC_SITE_URL` is written by hand in three environments and half of
 * them will have one.
 */
export const siteOrigin = (): string => requireEnv('NEXT_PUBLIC_SITE_URL').replace(/\/$/, '')
