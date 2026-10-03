import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import type { Locale } from '../../lib/locales'
import '../../app/globals.css'

/**
 * The one root layout, parameterised by locale.
 *
 * Each locale's folder renders this with its own literal, so `lang` is fixed
 * at build time and the route stays statically prerenderable. T-09 adds
 * `metadataBase` and the `hreflang` alternates here.
 */
export const metadata: Metadata = {
  title: 'AutoWash247',
}

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
