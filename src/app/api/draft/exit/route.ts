import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

import { logger } from '../../../../lib/log'
import { DEFAULT_LOCALE, isLocale, urlFor } from '../../../../lib/locales'
import { safeLocalPath } from '../../../../lib/preview'

/**
 * Leave draft preview.
 *
 * `POST`, because this one can be: the banner submits a plain HTML form, which
 * needs no JavaScript and keeps the banner a Server Component. A `GET` here
 * would also mean any image or link prefetch pointing at this URL could end an
 * editor's preview session.
 *
 * No secret. Disabling draft mode removes access rather than granting it, and
 * the worst a stranger can do by POSTing here is end their own preview — they
 * do not hold anyone else's cookie.
 */
export const POST = async (request: Request): Promise<Response> => {
  const log = logger('POST /api/draft/exit').forRequest(request)
  const draft = await draftMode()

  draft.disable()

  log.info('draft disabled')

  /**
   * Back to where they were, but only if it is a path on this site — see
   * `safeLocalPath`, which is where the open-redirect guard lives and is
   * tested.
   */
  const params = new URL(request.url).searchParams
  const safe = safeLocalPath(params.get('to'))
  const locale = params.get('locale')

  redirect(safe ?? urlFor('/', locale && isLocale(locale) ? locale : DEFAULT_LOCALE))
}
