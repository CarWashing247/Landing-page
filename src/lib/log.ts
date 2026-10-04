/**
 * The only place this repo writes a log line. See AGENT.md section 5.8 for the
 * rule and Design.md section 1.5 for why the format is fixed.
 *
 *   [timestamp] [source IP] [LEVEL] [action / method] [content]
 *
 * There is no log aggregator and there will not be one. The only tool is
 * Vercel's log stream, so the four leading fields exist to make it greppable:
 * `grep ' [ERROR] '`, `grep '[vault:'`, `grep '203.0.113.7'`. Free-form
 * `console.log` is none of those things.
 *
 * Writes with `console.*` deliberately: it is what Vercel captures, it needs no
 * dependency, and it works unchanged in the Node and Edge runtimes.
 */

export const LEVELS = ['debug', 'info', 'error'] as const

export type Level = (typeof LEVELS)[number]

/**
 * Scalars only. An object would have to be serialised to be logged, and the
 * object someone reaches for is the one holding the credential — see
 * `redact()`. `undefined` lets a caller pass an optional field without
 * branching; those pairs are dropped.
 */
export type Fields = Record<string, string | number | boolean | undefined>

/**
 * `-` when there is no request: module init, `next build`, `payload migrate`,
 * `payload generate:types`, a cron. Not a degraded case — it is what tells
 * build-time lines from request-time ones at a glance.
 */
const NO_REQUEST = '-'

/** Widths chosen so the common cases line up; a longer value just overflows. */
const IP_WIDTH = 15
const LEVEL_WIDTH = 5

const RANK: Record<Level, number> = { debug: 0, info: 1, error: 2 }

/**
 * Read per call rather than cached at module load. `vi.stubEnv` in a test and
 * `LOG_LEVEL=debug npm run start` both have to take effect, and the cost is a
 * property read.
 */
const threshold = (): number => {
  const raw = process.env.LOG_LEVEL?.toLowerCase()

  // An unrecognised value behaves as `info` rather than throwing. Logging is
  // not worth failing a boot over, and a typo must not silence the log.
  return RANK[(LEVELS as readonly string[]).includes(raw ?? '') ? (raw as Level) : 'info']
}

/**
 * Key names whose values never appear in a log line. This catches the common
 * shape, not every case — a secret passed as a positional value is invisible
 * here, which is why the contract is "scalars and named fields" and why
 * AGENT.md 5.7 is the actual rule.
 */
const SECRET_KEY = /secret|token|password|passwd|credential|authorization|cookie|signature|_id$/i

const redactValue = (key: string, value: string | number | boolean): string =>
  SECRET_KEY.test(key) ? '[redacted]' : String(value)

/**
 * `key=value` pairs, space separated, in the order given.
 *
 * Values are not quoted: a log line is read, not parsed, and quoting every
 * value to survive a space costs more legibility than it buys. A value
 * containing a space is collapsed instead, so one field cannot masquerade as
 * two and forge a pair that was never logged.
 */
const format = (fields?: Fields): string => {
  if (!fields) return ''

  const pairs = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${redactValue(key, value!).replace(/\s+/g, '_')}`)

  return pairs.length > 0 ? ` ${pairs.join(' ')}` : ''
}

/**
 * The caller's IP, from the first hop of `x-forwarded-for`.
 *
 * The first hop is the client; later hops are proxies. On Vercel the platform
 * overwrites that first entry, which is what makes it usable — the header is
 * caller-supplied and trivially spoofable, so a logged IP is evidence for a
 * human reading the log and **never** an input to an access-control decision.
 */
export const sourceIp = (from?: Request | Headers | null): string => {
  if (!from) return NO_REQUEST

  const headers = from instanceof Headers ? from : from.headers
  const forwarded = headers.get('x-forwarded-for')

  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  // Vercel sets this one; some proxies set neither, and then there is nothing
  // honest to report.
  return headers.get('x-real-ip')?.trim() || NO_REQUEST
}

const write = (level: Level, action: string, ip: string, message: string, fields?: Fields): void => {
  if (RANK[level] < threshold()) return

  // One event is one line. A caught error's message is routinely multi-line —
  // Vault's "1 error occurred:\n\t* permission denied" is the example in this
  // repo — and a line break would split it into a fragment with no timestamp,
  // no level and no action, which `grep` then cannot attribute to anything.
  // Spaces survive, unlike in a field value: the message is prose and is read.
  const oneLine = message.replace(/\s+/g, ' ').trim()

  const line =
    `[${new Date().toISOString()}] ` +
    `[${ip.padEnd(IP_WIDTH)}] ` +
    `[${level.toUpperCase().padEnd(LEVEL_WIDTH)}] ` +
    `[${action}] ` +
    oneLine +
    format(fields)

  // `error` to stderr, the rest to stdout, so a platform that separates the
  // two keeps the distinction. Both are captured.
  if (level === 'error') console.error(line)
  else console.log(line)
}

export type Logger = {
  debug: (message: string, fields?: Fields) => void
  error: (message: string, fields?: Fields) => void
  info: (message: string, fields?: Fields) => void
  /** The same action, bound to a request's IP. */
  forRequest: (from?: Request | Headers | null) => Logger
}

/**
 * A logger for one action: `METHOD /path` when serving a request,
 * `module:operation` otherwise (`vault:login`, `r2:config`).
 *
 * Nothing here may be called from a page or a layout. Resolving the IP needs
 * `headers()`, which makes the route `ƒ` and breaks AGENT.md 5.1 — the rule the
 * whole static-rendering design rests on. Route handlers, Payload hooks and
 * library code only.
 */
export const logger = (action: string, ip: string = NO_REQUEST): Logger => ({
  debug: (message, fields) => write('debug', action, ip, message, fields),
  error: (message, fields) => write('error', action, ip, message, fields),
  info: (message, fields) => write('info', action, ip, message, fields),
  forRequest: (from) => logger(action, sourceIp(from)),
})
