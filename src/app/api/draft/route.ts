import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

import { logger } from '../../../lib/log'
import { isLocale } from '../../../lib/locales'
import { PARAM, isPreviewable, pathForPreview } from '../../../lib/preview'
import { getPayload } from '../../../lib/payload'
import { secretMatches } from '../../../lib/secrets'

/**
 * Turn on draft preview for the caller, and send them to the page.
 *
 * `GET` rather than `POST`, against the usual rule that a state-changing
 * request should not be a `GET`: the caller is a browser following the admin's
 * Preview button in a new tab, and that is a `GET`. Next's own draft-mode guide
 * makes the same trade for the same reason, and closes it with a shared secret
 * so only the CMS can produce the link. The *exit* route is a `POST`, where
 * there is no such constraint.
 *
 * **Enabling draft mode is granting access to unpublished content**, so the
 * secret is checked before anything else happens, and the slug is checked
 * before the cookie is set — an editor sent to a page that does not exist
 * should get a 404 with no draft cookie, not a draft session attached to
 * nothing.
 */
export const GET = async (request: Request): Promise<Response> => {
  const log = logger('GET /api/draft').forRequest(request)
  const params = new URL(request.url).searchParams

  if (!(await secretMatches('PREVIEW_SECRET', params.get(PARAM.secret)))) {
    // The IP and the reason, never what they sent.
    log.error('refused', { reason: 'bad secret' })

    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const collection = params.get(PARAM.collection)
  const locale = params.get(PARAM.locale)
  const slug = params.get(PARAM.slug)

  if (!isPreviewable(collection) || !locale || !isLocale(locale) || !slug) {
    log.error('rejected', { reason: 'missing or unknown collection, locale or slug' })

    return Response.json({ error: 'Bad Request' }, { status: 400 })
  }

  /**
   * The slug has to resolve to a real document in this locale, and the lookup
   * is deliberately unfiltered by status — a draft is the whole point.
   * `overrideAccess: true` is safe here precisely because the secret has
   * already been checked: this request has proven it came from the CMS.
   *
   * Without this check the route would hand out a draft cookie for any string,
   * which is a cookie that bypasses every cache layer on every subsequent
   * request. That is worth one query.
   */
  const payload = await getPayload()

  const { docs } = await payload.find({
    collection,
    depth: 0,
    draft: true,
    limit: 1,
    locale,
    overrideAccess: true,
    select: { slug: true },
    where: { slug: { equals: slug } },
  })

  if (docs.length === 0) {
    log.error('rejected', { collection, locale, reason: 'no such document', slug })

    return Response.json({ error: 'Not Found' }, { status: 404 })
  }

  const draft = await draftMode()

  draft.enable()

  log.info('draft enabled', { collection, locale, slug })

  /**
   * `redirect()` throws, so nothing after it runs. It is called outside the
   * `try` of any caller for that reason — a `catch` around it would swallow the
   * redirect and serve a blank 200.
   */
  redirect(pathForPreview(collection, slug, locale))
}
