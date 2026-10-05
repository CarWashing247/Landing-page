import { createHash, timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'

import { logger } from '../../../lib/log'
import { SECRET_HEADER, isRevalidatePayload } from '../../../lib/revalidate'
import { getSecret } from '../../../lib/secrets'

/**
 * The purge endpoint. The only place `revalidateTag()` is called.
 *
 * It takes tags and purges them. It does not accept paths, globs or commands,
 * and it never will: a general-purpose cache endpoint behind a shared secret is
 * a general-purpose way to make the site re-render on demand, and the secret is
 * held by a CMS hook rather than by a person.
 *
 * **This file sits above the `/api/:path*` rewrite.** That rewrite sends
 * everything under `/api` to Payload's REST handler, but it lives in
 * `afterFiles`, which Next runs only when no filesystem route matched. A real
 * route file therefore wins, and Payload never sees `/api/revalidate`.
 */

/**
 * Compare in constant time, over digests rather than the raw strings.
 *
 * `timingSafeEqual` throws on a length mismatch, so comparing the secrets
 * directly would leak their length through the exception — the one thing a
 * timing-safe compare exists to avoid. Hashing first makes both sides 32 bytes
 * whatever was sent.
 */
const matches = (provided: string, expected: string): boolean =>
  timingSafeEqual(createHash('sha256').update(provided).digest(), createHash('sha256').update(expected).digest())

/**
 * Purge now, rather than serving stale while it revalidates.
 *
 * Next 16 made the second argument required, and the recommended `'max'`
 * profile serves stale content for up to a year while a revalidation runs in
 * the background. That is the wrong trade for this endpoint, and not by a
 * little: after a slug rename the old URL would keep serving the moved content
 * to the next visitor, which is the exact thing one of this task's acceptance
 * criteria forbids. An editor who publishes and reloads would also still see
 * the old page, and conclude the purge had not worked.
 *
 * `{ expire: 0 }` makes the next request a blocking revalidate. The cost is one
 * slow request per purged tag; the thing bought is that "published" means
 * published.
 */
const EXPIRE_NOW = { expire: 0 }

/**
 * Next silently ignores a tag over 256 characters — it is never assigned to
 * cached data, so revalidating it does nothing and says nothing. Rejecting is
 * better than a purge that reports success and did not happen.
 */
const MAX_TAG_LENGTH = 256

export const POST = async (request: Request): Promise<Response> => {
  const log = logger('POST /api/revalidate').forRequest(request)

  /**
   * Order is load-bearing: authenticate, then read the body. Parsing first
   * would let an unauthenticated caller spend this process's memory and time on
   * a body that was never going to be acted on.
   */
  const provided = request.headers.get(SECRET_HEADER)

  if (!provided) {
    log.error('refused', { reason: 'no secret' })

    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let expected: string

  try {
    expected = await getSecret('REVALIDATE_SECRET')
  } catch (error) {
    // Vault is unreachable or the key is missing. Refusing is right: the
    // alternative is a purge endpoint that stops checking when its own
    // dependency breaks.
    log.error('cannot verify', {
      reason: error instanceof Error ? error.message : 'unknown',
    })

    return Response.json({ error: 'Unavailable' }, { status: 503 })
  }

  if (!matches(provided, expected)) {
    // The IP, never what they sent. A wrong secret is still a secret to
    // somebody, and AGENT.md 5.7 does not carve out the ones that failed.
    log.error('refused', { reason: 'bad secret' })

    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    log.error('rejected', { reason: 'unparseable body' })

    return Response.json({ error: 'Bad Request' }, { status: 400 })
  }

  if (!isRevalidatePayload(body)) {
    // Nothing is purged on a malformed body. A partial purge from a half-valid
    // payload is harder to notice than none at all.
    log.error('rejected', { reason: 'expected { tags: string[] }' })

    return Response.json({ error: 'Bad Request' }, { status: 400 })
  }

  const tooLong = body.tags.find((tag) => tag.length > MAX_TAG_LENGTH)

  if (tooLong) {
    log.error('rejected', { length: tooLong.length, reason: 'tag too long' })

    return Response.json({ error: 'Bad Request' }, { status: 400 })
  }

  for (const tag of body.tags) {
    revalidateTag(tag, EXPIRE_NOW)
  }

  log.info('purged', { count: body.tags.length, tags: body.tags.join(',') })

  return Response.json({ purged: body.tags.length, revalidated: true })
}
