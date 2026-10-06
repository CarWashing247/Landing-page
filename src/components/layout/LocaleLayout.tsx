import type { ReactNode } from 'react'

import { t } from '../../i18n/t'
import { inter } from '../../lib/fonts'
import type { Locale } from '../../lib/locales'
import { DraftBanner } from '../DraftBanner'
import { Footer } from './Footer'
import { Header } from './Header'
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

/**
 * **The draft banner lives here, not in each page.** T-12 rendered it inside
 * `ContentPage` and `ServicePage`, which left draft mode invisible and
 * unexitable everywhere else — on `/`, on a service index, on the 404 — while
 * the cookie stayed set for the whole site. Next's own draft-mode guide says to
 * render the indicator from the root layout. Moving it here is follow-up A5, and
 * the per-page copies are removed in the same change or two banners render.
 *
 * It takes no `path`, because the layout does not know the current one and
 * reading `headers()` to find out would turn every route dynamic. The exit route
 * falls back to the locale's home page, which is where an editor leaving a
 * preview wants to be anyway.
 */
export const LocaleLayout = async ({
  children,
  locale,
}: {
  children: ReactNode
  locale: Locale
}) => {
  const copy = t(locale)

  return (
    <html className={inter.variable} lang={locale}>
      <body className="flex min-h-screen flex-col">
        {/*
          The skip link is the first focusable thing on the page and is visible
          only while focused. Without it, reaching the content by keyboard means
          tabbing through the whole navigation on every page.
        */}
        <a
          className="bg-accent text-on-accent sr-only rounded-lg px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
          href="#main"
        >
          {copy.a11y.skipToContent}
        </a>

        <DraftBanner locale={locale} />
        <Header locale={locale} />

        {/*
          The one `<main>` for every page, so a page cannot forget the landmark
          and cannot add a second. `flex-1` is what keeps the footer at the
          bottom on a short page.
        */}
        <main className="flex-1" id="main">
          {children}
        </main>

        <Footer locale={locale} />
      </body>
    </html>
  )
}
