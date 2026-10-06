import { notFoundMetadata } from '../components/seo/metadata'
import { t } from '../i18n/t'
import { DEFAULT_LOCALE } from '../lib/locales'
import './globals.css'

/**
 * 404 for URLs that match no route at all.
 *
 * landing-page and crm each own a root layout, so there is no single layout to
 * render an unmatched URL inside, and Next's default 404 ships `<html>` with no
 * `lang`. This file must return a full document. Enabled by
 * `experimental.globalNotFound` in next.config.mjs.
 */

/**
 * Assembled by `notFoundMetadata()` rather than written here, so the rule that
 * no `Metadata` object is built outside `src/components/seo/metadata.ts` holds
 * with no exception (AGENT.md 5.2). The brand is a literal because this page
 * renders for URLs that match no route, so there is no request context to read
 * `SiteSettings` for and nothing worth a database round trip on a 404.
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
const GlobalNotFound = () => {
  const copy = t(DEFAULT_LOCALE)

  return (
    <html lang={DEFAULT_LOCALE}>
      <body>
        <main>
          <h1>{copy.notFound.title}</h1>
          <p>{copy.notFound.message}</p>
          <a href="/">{copy.notFound.backHome}</a>
        </main>
      </body>
    </html>
  )
}

export default GlobalNotFound
