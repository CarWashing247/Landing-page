import type { ReactNode } from 'react'

import type { Locale } from '../../lib/locales'
import '../../app/globals.css'

/**
 * The one root layout, parameterised by locale.
 *
 * Each locale's folder renders this with its own literal, so `lang` is fixed
 * at build time and the route stays statically prerenderable.
 *
 * **No `metadata` export here.** Next reads that export only from a route
 * module — an `app/**` `layout.tsx` or `page.tsx` — so the one this file used to
 * carry emitted nothing at all. `metadataBase` therefore lives in each locale's
 * own `layout.tsx`, which is a route module, and both get it from
 * `rootMetadata()` so they cannot disagree.
 */

export const LocaleLayout = ({
  children,
  locale,
}: {
  children: ReactNode
  locale: Locale
}) => (
  <html lang={locale}>
    <body>{children}</body>
  </html>
)
