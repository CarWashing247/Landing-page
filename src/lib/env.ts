/**
 * Fail loudly at module load rather than at the first request.
 *
 * A missing PAYLOAD_SECRET or DATABASE_URI that defaults to something
 * plausible is worse than a crash: the app boots, the admin issues sessions
 * signed with a guessable key, and nothing says so.
 */
export const requireEnv = (name: string): string => {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `See .env.example for what it is and how to generate it.`,
    )
  }

  return value
}
