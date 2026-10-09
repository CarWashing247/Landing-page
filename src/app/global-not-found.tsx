import { NotFoundPage } from '../components/NotFoundPage'
import { LocaleLayout } from '../components/layout/LocaleLayout'
import { notFoundMetadata } from '../components/seo/metadata'
import { DEFAULT_LOCALE } from '../lib/locales'

/**
 * 404 for URLs that match no route at all.
 *
 * landing-page and crm each own a root layout, so there is no single layout to
 * render an unmatched URL inside, and Next's default 404 ships `<html>` with no
 * `lang`. This file must return a full document. Enabled by
 * `experimental.globalNotFound` in next.config.mjs.
 *
 * `LocaleLayout` is that document — the same `<html lang>`, fonts, stylesheet,
 * header and footer as every public page — so the two ways of reaching a 404
 * look identical. Unlike a page's `notFound()`, this one is fully server-rendered.
 */

/**
 * Assembled by `notFoundMetadata()` rather than written here, so the rule that
 * no `Metadata` object is built outside `src/components/seo/metadata.ts` holds
 * with no exception (AGENT.md 5.2). The brand is a literal: the header below
 * reads `SiteSettings` through the cached query layer, but a 404's `<title>` is
 * not worth turning this export into a `generateMetadata` round trip.
 */
export const metadata = notFoundMetadata('AutoWash247')

/**
 * The default locale, because there is nothing else to go on.
 *
 * This page renders for URLs that matched no route at all, so there is no locale
 * segment to read and no `params` to resolve — an unknown URL is as likely to be
 * a typo of a Vietnamese path as an English one. `lang` has to agree with the
 * strings actually rendered, so both come from the same constant rather than
 * `lang` being hardcoded next to copy that could change independently.
 */
const GlobalNotFound = () => (
  <LocaleLayout locale={DEFAULT_LOCALE}>
    <NotFoundPage locale={DEFAULT_LOCALE} />
  </LocaleLayout>
)

export default GlobalNotFound
