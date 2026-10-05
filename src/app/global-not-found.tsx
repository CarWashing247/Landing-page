import { notFoundMetadata } from '../components/seo/metadata'
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

const GlobalNotFound = () => (
  <html lang="vi">
    <body>
      <main>
        <h1>404</h1>
        <p>TODO(copy): page not found message.</p>
        <a href="/">TODO(copy): link back to the home page</a>
      </main>
    </body>
  </html>
)

export default GlobalNotFound
