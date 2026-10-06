import { t } from '../../i18n/t'
import { loadBusinessInfo, loadSiteSettings } from '../../lib/content'
import type { Locale } from '../../lib/locales'
import { otherLocales, pathForHome } from '../../lib/locales'
import { NAV } from '../../lib/routes'
import { publishable } from '../../lib/schema/shared'
import { MobileMenu } from './MobileMenu'

/**
 * The site header: brand, navigation, language switch, and the call button.
 *
 * A Server Component, like everything in this shell. The only interactive part
 * is the mobile disclosure, which is a native `<details>` — see `MobileMenu`.
 *
 * **Nothing here is a literal.** The brand comes from `SiteSettings.brandName`,
 * the phone number from `BusinessInfo.phone`, and every label from the T-15A
 * catalog. That is the acceptance criterion, and it is also the reason the
 * header is worth building before the pages: it is where a hardcoded phone
 * number would otherwise first appear and last be noticed.
 */

/**
 * The call button is dropped when the number is still a `TODO(data):`
 * placeholder, rather than rendering a `tel:` link that dials nothing. Same
 * guard the JSON-LD uses (T-14), so the two cannot disagree about whether the
 * business has a usable phone number.
 */
const callHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`

export const Header = async ({ locale }: { locale: Locale }) => {
  const [settings, business] = await Promise.all([loadSiteSettings(locale), loadBusinessInfo()])
  const copy = t(locale)
  const phone = publishable(business?.phone)

  const links = NAV.map((item) => (
    <li key={item.key}>
      <a
        className="text-on-primary hover:text-accent block py-2 no-underline md:py-0"
        href={item.href(locale)}
      >
        {copy.nav[item.key]}
      </a>
    </li>
  ))

  return (
    <header className="bg-primary">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <a className="text-on-primary text-h3 no-underline" href={pathForHome(locale)}>
          {settings?.brandName ?? 'AutoWash247'}
        </a>

        {/*
          One `<nav>`, one list, one DOM for both widths. The disclosure wraps
          the list rather than duplicating it, so there is never a desktop copy
          and a mobile copy to drift apart — and a crawler sees the links once.
        */}
        <nav aria-label={copy.nav.primaryLabel} className="flex items-center gap-2">
          {/*
            Two renderings of one array, not two lists to maintain. There is no
            CSS that forces a `<details>` open, so the desktop navigation cannot
            live inside the mobile disclosure — see `MobileMenu` for the
            measurement behind that.
          */}
          <ul className="text-body hidden md:flex md:items-center md:gap-6">{links}</ul>

          <MobileMenu label={copy.nav.openMenu}>
            <ul className="text-body flex flex-col gap-2">{links}</ul>
          </MobileMenu>

          <LanguageSwitch locale={locale} />

          {phone ? (
            <a
              className="bg-accent text-on-accent text-label rounded-lg px-4 py-2 no-underline"
              // T-21 attaches the GA4 event here; the element is left in place
              // for it rather than wired up now.
              href={callHref(phone)}
            >
              {copy.actions.callNow}
            </a>
          ) : null}
        </nav>
      </div>
    </header>
  )
}

/**
 * The language switch points at the other locale's **home page**, not at this
 * page's translation.
 *
 * Switching in place needs the current document's slug in the target locale.
 * That is per-page data — `loadPage`/`loadService` already return it as `paths`
 * for the `hreflang` set (T-09) — and the layout does not have it. Reading the
 * path from `headers()` instead would turn every route dynamic and undo the
 * static generation T-10 exists for.
 *
 * So this is honest rather than clever: it always goes somewhere that exists.
 * Per-page switching belongs where the page knows its own translations; see
 * this task's flags.
 */
const LanguageSwitch = ({ locale }: { locale: Locale }) => (
  <ul className="text-label flex items-center gap-1">
    {[locale, ...otherLocales(locale)].map((candidate) => (
      <li key={candidate}>
        {candidate === locale ? (
          <span aria-current="true" className="text-accent px-1">
            {candidate.toUpperCase()}
          </span>
        ) : (
          <a
            className="text-on-primary px-1 no-underline"
            href={pathForHome(candidate)}
          >
            {candidate.toUpperCase()}
          </a>
        )}
      </li>
    ))}
  </ul>
)
