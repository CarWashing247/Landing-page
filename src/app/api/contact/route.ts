import { logger, sourceIp } from '../../../lib/log'
import { isLocale } from '../../../lib/locales'
import { getPayload } from '../../../lib/payload'
import { contactSchema } from '../../../lib/validation/contact'

/**
 * The contact form's submission endpoint, and the control that actually
 * enforces the rules.
 *
 * The client-side validation in `ContactForm.tsx` is a convenience the visitor
 * can remove from devtools. This is the check that counts, which is why T-19's
 * verification posts a handcrafted body straight at it and expects a 400 —
 * bypassing the form entirely. Both sides import the same schema from
 * `src/lib/validation/contact.ts`; there is no second copy of the rules here.
 *
 * **This file sits above the `/api/:path*` rewrite.** That rewrite sends
 * everything under `/api` to Payload's REST handler, but it lives in
 * `afterFiles`, which Next runs only when no filesystem route matched — so a
 * real route file wins and Payload never sees `/api/contact`. The same
 * mechanism is what `/api/revalidate` relies on.
 */

/**
 * The response never echoes what was submitted.
 *
 * It returns which field names were rejected and nothing else. Echoing the
 * values back is what turns a contact form into a reflection point, and T-19's
 * step 5 names it: the submitted text would come back inside a JSON response
 * that something downstream may well render. The visitor already has their own
 * input; the browser does not need it returned.
 *
 * The *reasons* are not returned either. The client has the same schema and
 * resolves its own messages through the catalog in its own locale, so prose
 * from here would be prose in the wrong language half the time.
 */
type Rejected = { error: 'invalid'; fields: string[] }

/**
 * One submission per IP per window, which is what "rate-limit lightly" buys at
 * this size.
 *
 * **In-process and therefore per-instance**, and that limit is worth stating
 * rather than discovering: this deploy is serverless, so a burst spread across
 * cold starts gets one allowance each. It stops a stuck submit button and a
 * naive script, not a determined flood — the real control for that is T-22,
 * which owns rate limiting as a subject. The map is bounded by sweeping expired
 * entries on each call, so it cannot grow into a memory leak on a warm
 * instance.
 */
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 3
const seen = new Map<string, number[]>()

const rateLimited = (ip: string): boolean => {
  const now = Date.now()

  for (const [key, times] of seen) {
    const live = times.filter((at) => now - at < WINDOW_MS)

    if (live.length === 0) {
      seen.delete(key)
    } else {
      seen.set(key, live)
    }
  }

  const recent = seen.get(ip) ?? []

  if (recent.length >= MAX_PER_WINDOW) {
    return true
  }

  seen.set(ip, [...recent, now])

  return false
}

/**
 * A body larger than this is refused before it is parsed.
 *
 * The schema caps each field, but that is checked *after* `request.json()` has
 * already materialised whatever was sent. 16 KB is several times the longest
 * legitimate submission the schema permits.
 */
const MAX_BODY_BYTES = 16_384

/**
 * Both shapes a real submission arrives in, because there are two senders.
 *
 * `ContactForm` posts JSON with `fetch`. **A browser with JavaScript disabled
 * posts the same form as `application/x-www-form-urlencoded`**, because the
 * `<form>` carries a real `action` and `method` so that it works at all without
 * the script — and that was the whole point of giving it one. Parsing only JSON
 * meant every such submission failed `request.json()` and came back a 400: the
 * form degraded to a form that is guaranteed not to work, and the lead was lost
 * rather than merely handled awkwardly. Caught by posting form-encoded fields
 * with `curl`, which is what the visitor's browser does.
 *
 * What a no-JS visitor sees on success is this handler's JSON rather than a
 * styled message. That is ugly and it is a captured lead; the alternative is a
 * redirect back to a page that would have to read the outcome from the query
 * string, which would make a statically generated page dynamic (AGENT.md 5.1).
 *
 * Every field arrives as a string either way, so the shared schema validates
 * both without a second set of rules — and a `File` entry, which a
 * `multipart/form-data` post could carry, is dropped rather than stringified
 * into a row.
 */
const readBody = async (request: Request): Promise<unknown> => {
  const type = request.headers.get('content-type') ?? ''

  if (type.includes('json')) {
    return request.json()
  }

  if (type.includes('form-urlencoded') || type.includes('form-data')) {
    const form = await request.formData()

    return Object.fromEntries(
      [...form.entries()].filter(([, value]) => typeof value === 'string'),
    )
  }

  // An unannounced body is still most likely JSON — `fetch` without a
  // `content-type` is common enough that refusing outright would be stricter
  // than the rules this endpoint actually enforces.
  return request.json()
}

export const POST = async (request: Request): Promise<Response> => {
  const log = logger('POST /api/contact').forRequest(request)

  if (rateLimited(sourceIp(request))) {
    // The IP is the point of the line: it is what makes a repeat caller
    // identifiable, and AGENT.md 5.8 requires every rejected request to say so.
    log.error('refused', { reason: 'rate limited' })

    return Response.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  const declared = Number(request.headers.get('content-length') ?? 0)

  if (declared > MAX_BODY_BYTES) {
    log.error('rejected', { bytes: declared, reason: 'body too large' })

    return Response.json({ error: 'Payload Too Large' }, { status: 413 })
  }

  let body: unknown

  try {
    body = await readBody(request)
  } catch {
    log.error('rejected', { reason: 'unparseable body' })

    return Response.json({ error: 'Bad Request' }, { status: 400 })
  }

  const parsed = contactSchema.safeParse(body)

  if (!parsed.success) {
    /**
     * Field names, never values. A rejected submission is still someone's phone
     * number, and AGENT.md 5.8 does not carve out the ones that failed
     * validation — "values are scalars, never an object or a request body".
     */
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? '?')))]

    log.error('rejected', { fields: fields.join(','), reason: 'failed validation' })

    return Response.json({ error: 'invalid', fields } satisfies Rejected, { status: 400 })
  }

  /**
   * The locale is read from the body and defaulted, not required by the schema.
   *
   * It is context for whoever calls back rather than part of the submission, so
   * a handcrafted POST that omits it should still succeed — rejecting it would
   * make the locale a required field of a contact form, which it is not.
   */
  const sentFrom = (body as { locale?: unknown }).locale
  const locale = typeof sentFrom === 'string' && isLocale(sentFrom) ? sentFrom : 'vi'

  try {
    const payload = await getPayload()

    /**
     * Through the Local API, where `overrideAccess` defaults to true — which is
     * what lets this write succeed against a collection whose `create` is
     * denied to everyone. That denial is the point: it closes
     * `/api/contact-submissions`, so this validated path is the only way a row
     * is written.
     */
    await payload.create({
      collection: 'contact-submissions',
      data: { ...parsed.data, locale },
    })
  } catch (error) {
    // The message, never the error object: a Payload error can carry the
    // request, and the request carries the submission (AGENT.md 5.7).
    log.error('not stored', {
      reason: error instanceof Error ? error.message : 'unknown',
    })

    return Response.json({ error: 'Unavailable' }, { status: 503 })
  }

  // No name, no number, no message — only that one arrived, and in which
  // locale. The row is the record; the log line is the heartbeat.
  log.info('stored', { locale })

  return Response.json({ received: true })
}
