import type { Metadata } from 'next'

import './globals.css'

/**
 * 404 for URLs that match no route at all.
 *
 * landing-page and crm each own a root layout, so there is no single layout to
 * render an unmatched URL inside, and Next's default 404 ships `<html>` with no
 * `lang`. This file must return a full document. Enabled by
 * `experimental.globalNotFound` in next.config.mjs.
 */
export const metadata: Metadata = {
  title: 'AutoWash247',
  robots: { index: false, follow: false },
}

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
