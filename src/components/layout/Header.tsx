import { t } from '../../i18n/t'
import { loadBusinessInfo, loadSiteSettings } from '../../lib/content'
import type { Locale } from '../../lib/locales'
import { otherLocales, pathForHome } from '../../lib/locales'
import { NAV, callHref } from '../../lib/routes'
import { publishable } from '../../lib/schema/shared'
import { Mark } from '../brand/Mark'
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
 * business has a usable phone number. `callHref` itself lives in
 * `src/lib/routes.ts`, shared with the footer and the service page.
 */

export const Header = async ({ locale }: { locale: Locale }) => {
  const [settings, business] = await Promise.all([loadSiteSettings(locale), loadBusinessInfo()])
  const copy = t(locale)
  const phone = publishable(business?.phone)

  const links = NAV.map((item) => (
    <li key={item.key}>
      <a
        className="text-ink hover:text-action block py-2 no-underline md:py-0"
        href={item.href(locale)}
      >
        {copy.nav[item.key]}
      </a>
    </li>
  ))

  return (
    <header className="bg-surface border-border border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        {/*
          The logo is the mark plus the brand name as live text, not a single
          baked asset — the name belongs to `SiteSettings` (AGENT.md), so
          renaming the business stays a CMS edit rather than a redraw.
        */}
        <a
          className="text-ink font-display flex items-center gap-2 text-h3 no-underline"
          href={pathForHome(locale)}
        >
          <Mark className="h-7 w-7 shrink-0" />
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
              className="bg-action hover:bg-action-hover text-on-action text-label rounded-control inline-flex min-h-11 items-center px-5 font-bold no-underline transition-colors"
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
          <span
            aria-current="true"
            /*
             * Marked by weight and an underline, not by colour. The accent is
             * orange and the header is green: measured at 1.06:1 against each
             * other, which is invisible. Two greens or a green and an orange
             * cannot carry this distinction, so it is carried by something that
             * is not hue — which is the right answer anyway, because colour
             * alone never conveys state.
             */
            className="text-ink px-1 font-semibold underline underline-offset-4"
          >
            {candidate.toUpperCase()}
          </span>
        ) : (
          <a
            className="text-secondary px-1 no-underline"
            href={pathForHome(candidate)}
          >
            {candidate.toUpperCase()}
          </a>
        )}
      </li>
    ))}
  </ul>
)
