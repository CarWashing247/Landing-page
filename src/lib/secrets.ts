/**
 * Every credential this app holds, read from HashiCorp Vault once per
 * process. Nothing else may read a credential — see AGENT.md section 5.7.
 *
 * Environment variables are not insecure in themselves. They are
 * unauditable and unrotatable: a value pasted into a hosting dashboard has
 * no record of who set it, no record of who read it, and no way to rotate
 * it except by hand in every environment at once. Vault answers each of
 * those. The cost is that Vault is now a dependency of anything that loads
 * the Payload config, including `next build` and `payload migrate`.
 *
 * There is deliberately no `process.env` fallback. An app that boots with a
 * guessable PAYLOAD_SECRET issues sessions that look valid and says nothing;
 * a crash names the problem on the first line of the log.
 */

import { logger } from './log'

/**
 * Keys held in Vault. Named identically to the environment variables they
 * replaced, so `grep` still finds every consumer.
 *
 * Only PAYLOAD_SECRET is required unconditionally. The four R2 keys are
 * all-or-nothing and may be absent in development (see `resolveR2Config`),
 * and the two route secrets land with the routes that read them — T-11 and
 * T-12 respectively.
 */
export const SECRET_KEYS = [
  'PAYLOAD_SECRET',
  'REVALIDATE_SECRET',
  'PREVIEW_SECRET',
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
] as const

export type SecretKey = (typeof SECRET_KEYS)[number]

/**
 * `PAYLOAD_SECRET` is non-optional because the Payload config cannot be
 * built without it, so a missing value is a boot failure rather than a
 * decision any caller gets to make. Everything else is `string | undefined`
 * and goes through `getSecret()` at the point of use, which keeps the error
 * message next to the feature that needed it.
 */
export type Secrets = Readonly<
  { PAYLOAD_SECRET: string } & Partial<Record<Exclude<SecretKey, 'PAYLOAD_SECRET'>, string>>
>

/**
 * A Vault failure, and whether trying again could possibly help.
 *
 * `permanent` means the credential or the policy is wrong: nothing changes
 * until someone edits configuration and restarts, so a retry is not merely
 * useless, it is harmful. Five failed AppRole logins lock the `role_id` for 15
 * minutes, after which Vault refuses the *correct* `secret_id` identically —
 * so a process that retries on every request turns a one-line fix into a
 * 15-minute outage that outlasts the fix.
 */
class VaultError extends Error {
  readonly permanent: boolean

  constructor(message: string, permanent: boolean, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'VaultError'
    this.permanent = permanent
  }
}

/** Vault can be slow to answer under load; a build should fail, not hang. */
const REQUEST_TIMEOUT_MS = 10_000

type ApproleLoginResponse = { auth?: { client_token?: string } }
type KvReadResponse = { data?: { data?: Record<string, unknown> } }

const vaultEnv = (name: string): string => {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `Missing ${name}. It is part of the Vault bootstrap, which cannot ` +
        `itself live in Vault — a secret store cannot hold the key to ` +
        `itself. See AGENT.md section 7.1.`,
    )
  }

  return value
}

const vaultFetch = async (
  url: string,
  init: RequestInit & { token?: string },
): Promise<unknown> => {
  const { token, ...rest } = init
  const namespace = process.env.VAULT_NAMESPACE

  let response: Response

  try {
    response = await fetch(url, {
      ...rest,
      headers: {
        'content-type': 'application/json',
        ...(namespace ? { 'x-vault-namespace': namespace } : {}),
        ...(token ? { 'x-vault-token': token } : {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (cause) {
    // A DNS failure, a refused connection or the timeout above. The cause
    // carries no credential, so it is safe to attach.
    // Transient by nature: a refused connection, a DNS failure or the timeout
    // above. None of them counts against Vault's login-failure lockout, and
    // the next attempt may well succeed.
    throw new VaultError(
      `Could not reach Vault at ${process.env.VAULT_ADDR}. Locally, that ` +
        `usually means \`docker compose up -d\` has not been run.`,
      false,
      { cause },
    )
  }

  if (!response.ok) {
    // Vault's own error strings ("permission denied", "no handler for
    // route") are what make a 403 diagnosable, and never contain a secret.
    // The request body does — so it is never echoed here.
    const detail = await response
      .json()
      .then((body) => (body as { errors?: string[] })?.errors?.join('; ') ?? '')
      .catch(() => '')

    const pathname = new URL(url).pathname

    // Vault's 403 is the same "permission denied" for several unrelated
    // causes, so the hints are narrowed to the ones that can apply here.
    // A hint that fires on every 403 gets read as the answer and sends
    // whoever is debugging at the wrong thing.
    const hints: string[] = []

    const isLogin = pathname.endsWith('/auth/approle/login')

    // On a read, the overwhelmingly likely cause is the policy: this AppRole is
    // scoped to one path and was pointed at another. Observed misleading a real
    // debugging session — a self-hosted Vault 403'd a read for exactly this
    // reason while the only hint on offer talked about HCP namespaces.
    if (response.status === 403 && !isLogin) {
      hints.push(
        `The AppRole's policy grants read on one path only — check ` +
          `VAULT_SECRET_PATH against the policy before anything else.`,
      )
    }

    if (response.status === 403 && !namespace) {
      hints.push(
        `If this is HCP Vault, VAULT_NAMESPACE must be "admin"; unset, it ` +
          `403s every request without mentioning namespaces. Self-hosted ` +
          `Vault does not use namespaces, so this is not the cause there.`,
      )
    }

    if (response.status === 403 && isLogin) {
      // Found the hard way: five failed logins locks the role_id, and the
      // lockout then refuses the *correct* secret_id with this same message.
      // Fixing the credential and redeploying looks like it changed nothing.
      hints.push(
        `Vault locks a role_id for 15 minutes after 5 failed logins and ` +
          `then refuses the correct secret_id identically. Check ` +
          `sys/locked-users before concluding the secret_id is wrong.`,
      )
    }

    // A 4xx is a verdict on the credential or the policy and will be identical
    // next time; a 5xx or a 429 is Vault having a bad moment.
    const permanent = response.status >= 400 && response.status < 500 && response.status !== 429

    throw new VaultError(
      `Vault returned ${response.status} for ${pathname}` +
        (detail ? `: ${detail}` : '') +
        (hints.length > 0 ? `. ${hints.join(' ')}` : ''),
      permanent,
    )
  }

  return response.json()
}

/**
 * Exchange the AppRole pair for a short-lived token.
 *
 * The token is used for exactly one read and then dropped. Caching the
 * values rather than the session is what removes renewal from this file —
 * there is no lease to watch and no expiry to get wrong.
 */
const login = async (addr: string): Promise<string> => {
  const log = logger('vault:login')

  // Logged before the attempt as well as after it, because a hang is the one
  // failure the outcome line cannot report: the 10s timeout is indistinguishable
  // from a cold start that never got going unless something recorded the try.
  log.debug('authenticating', { addr })

  const body = await vaultFetch(`${addr}/v1/auth/approle/login`, {
    method: 'POST',
    body: JSON.stringify({
      role_id: vaultEnv('VAULT_ROLE_ID'),
      secret_id: vaultEnv('VAULT_SECRET_ID'),
    }),
  })

  const token = (body as ApproleLoginResponse)?.auth?.client_token

  if (!token) {
    throw new Error('Vault AppRole login returned no client token.')
  }

  // The success line is the point of this task. This runs once per process, at
  // init, and it is the only evidence the Vault round trip ever worked — without
  // it a cold start that authenticated looks exactly like one that did not, and
  // T-04B's rule that a rotated value lands on the next start is unobservable.
  // Neither the role id, the secret id nor the token appears here.
  log.info('connected', { addr })

  return token
}

/**
 * KV v2 splits the mount from the path and injects `data` between them:
 * `kv/autowash247/production` is read at `kv/data/autowash247/production`.
 * Getting this wrong returns a 404 that reads like a missing secret rather
 * than a malformed URL, so it is done in one place.
 */
const kvDataPath = (secretPath: string): string => {
  const segments = secretPath.replace(/^\/+|\/+$/g, '').split('/')

  if (segments.length < 2) {
    throw new Error(
      `VAULT_SECRET_PATH must be "<mount>/<path>", e.g. ` +
        `"kv/autowash247/production". Got "${secretPath}".`,
    )
  }

  const [mount, ...rest] = segments

  return `${mount}/data/${rest.join('/')}`
}

const read = async (): Promise<Secrets> => {
  const log = logger('vault:read')
  const addr = vaultEnv('VAULT_ADDR').replace(/\/$/, '')
  const path = kvDataPath(vaultEnv('VAULT_SECRET_PATH'))

  const token = await login(addr)
  const body = await vaultFetch(`${addr}/v1/${path}`, { method: 'GET', token })
  const data = (body as KvReadResponse)?.data?.data

  if (!data) {
    throw new Error(
      `Vault returned no data at ${path}. The path exists but holds no ` +
        `secret version, or the mount is not KV v2.`,
    )
  }

  const secrets: Record<string, string> = {}

  for (const key of SECRET_KEYS) {
    const value = data[key]

    // An empty string in Vault is the same mistake as an absent key and is
    // treated as one, so `?? fallback` cannot quietly succeed downstream.
    if (typeof value === 'string' && value.length > 0) {
      secrets[key] = value
    }
  }

  if (!secrets.PAYLOAD_SECRET) {
    throw new Error(
      `PAYLOAD_SECRET is missing or empty at ${path}. Payload signs admin ` +
        `session JWTs with it and cannot start without one.`,
    )
  }

  const unknown = Object.keys(data).filter(
    (key) => !(SECRET_KEYS as readonly string[]).includes(key),
  )

  if (unknown.length > 0) {
    // Not fatal — Vault is shared and may hold keys for a later task. Worth
    // saying, because a typo in a key name is otherwise invisible: the write
    // succeeds and the read silently ignores it.
    //
    // This is the one warn-shaped line in the repo and it is INFO, because the
    // logger carries three levels. Design.md 5a records what that costs: in a
    // stream filtered to errors, a mistyped key name is invisible again. Key
    // NAMES are safe to log; their values are what must never appear.
    log.info('unread keys at path', { path, keys: unknown.join(',') })
  }

  // Count, never names-with-values: enough to confirm the path held what this
  // process needed, with nothing a reader of the log could use.
  log.info('loaded', { path, keys: Object.keys(secrets).length })

  return Object.freeze(secrets) as Secrets
}

/**
 * Module-scope cache, so a warm instance pays one round trip for its whole
 * life. The promise itself is cached rather than its result: concurrent
 * first callers then share one login instead of racing.
 */
let cached: Promise<Secrets> | undefined

export const loadSecrets = (): Promise<Secrets> => {
  if (!cached) {
    cached = read().catch((error: unknown) => {
      /**
       * Whether a later caller retries depends on what went wrong.
       *
       * Transient (Vault unreachable, 5xx, 429): drop the rejected promise so
       * the next caller tries again. This is what makes `next dev` usable —
       * the module outlives a restart of the thing that was broken.
       *
       * Permanent (a 4xx: wrong secret_id, policy denies the path): keep the
       * rejection and hand it to every later caller untried. Retrying cannot
       * succeed, and it actively harms: five failed logins lock the `role_id`
       * for 15 minutes, after which Vault refuses the *correct* secret_id in
       * exactly the same way. Without this, one wrong variable plus any traffic
       * turns a redeploy-to-fix into a lockout that outlives the fix. The cost
       * is that correcting a credential needs a restart, which a deploy does
       * anyway, and which is cheaper than the outage it replaces.
       */
      if (!(error instanceof VaultError) || !error.permanent) {
        cached = undefined
      }

      // The throw alone is not enough. It surfaces as a stack trace, which is
      // unfiltered by LOG_LEVEL, unsearchable alongside the other lines, and
      // in a build it scrolls past above whatever the deploy prints next. One
      // ERROR line in the format is what makes `grep ' [ERROR] '` find it.
      //
      // The message is safe: section 5.7 keeps values out of it by
      // construction, and the role id and secret id are never in it.
      // The reason goes in the content field, not a `key=value`: it is prose,
      // often a sentence or three, and a field value has its spaces collapsed.
      logger('vault:load').error(
        error instanceof Error ? error.message : 'failed for an unknown reason',
      )

      throw error
    })
  }

  return cached
}

/** Test-only: forget the cached read. Never call this from app code. */
export const resetSecretsCacheForTests = (): void => {
  cached = undefined
}

/**
 * One secret, by name, with a failure that names the key and the task that
 * owns it. Use this at the point of use rather than destructuring, so the
 * error arrives next to the feature that needed the value.
 */
export const getSecret = async (key: SecretKey): Promise<string> => {
  const secrets = await loadSecrets()
  const value = secrets[key]

  if (!value) {
    throw new Error(
      `Missing secret ${key} in Vault at ${process.env.VAULT_SECRET_PATH}. ` +
        `Add it to all three paths (AGENT.md section 7.2) — it does not ` +
        `belong in .env.example.`,
    )
  }

  return value
}
