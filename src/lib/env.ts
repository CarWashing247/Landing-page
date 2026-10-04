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
