import type { ReactNode } from 'react'

import { inter } from '../../lib/fonts'
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
 *
 * **The font variable goes here, not in each locale's `layout.tsx`.** T-15's
 * task file names `landing-page/layout.tsx`, but that file does not render
 * `<html>` — this one does, and the variable has to be on the element the
 * tokens in `globals.css` resolve against. Putting it here also means the two
 * locale folders cannot drift into loading different fonts.
 */

export const LocaleLayout = ({
  children,
  locale,
}: {
  children: ReactNode
  locale: Locale
}) => (
  <html className={inter.variable} lang={locale}>
    <body>{children}</body>
  </html>
)
