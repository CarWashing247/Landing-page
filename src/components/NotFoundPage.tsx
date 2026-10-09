import { t } from '../i18n/t'
import type { Locale } from '../lib/locales'
import { pathForHome } from '../lib/locales'
import type { NavItem } from '../lib/routes'
import { NAV } from '../lib/routes'
import { Action, Eyebrow, Wrap } from './blocks/shared'
import type { SiteIconName } from './brand/SiteIcon'
import { SiteIcon } from './brand/SiteIcon'

/**
 * The 404 body, matching `design/phase3/not-found.html`.
 *
 * Rendered by each locale's `not-found.tsx` and by `app/global-not-found.tsx`,
 * always inside `LocaleLayout`, so the header, footer and skip link are the
 * real ones. It renders no `<main>`: the layout owns the one landmark.
 *
 * **What a crawler sees differs by route, and that is Next, not this file.** For
 * an unknown CMS slug, `notFound()` is thrown from a page, and Next 16 answers
 * with the 404 status, `noindex` and an empty HTML shell; this body paints after
 * hydration. A URL that matches no route at all renders through
 * `global-not-found.tsx`, which is a full server-rendered document. Measured in
 * T-19J; see follow-up A1.
 */

/**
 * The pages offered instead, each with the pictogram the rest of the site
 * already uses for that subject. Home is left out because the primary action
 * goes there, and Services because its index has no document behind it yet
 * (A10) — a 404 page linking to a 404 is the one thing it must not do.
 */
const SUGGESTIONS: readonly { icon: SiteIconName; key: NavItem['key'] }[] = [
  { icon: 'package', key: 'pricing' },
  { icon: 'qr-scan', key: 'guide' },
  { icon: 'phone', key: 'contact' },
]

export const NotFoundPage = ({ locale }: { locale: Locale }) => {
  const copy = t(locale)
  const suggestions = SUGGESTIONS.flatMap(({ icon, key }) => {
    const item = NAV.find((candidate) => candidate.key === key)

    return item ? [{ href: item.href(locale), icon, key }] : []
  })

  return (
    <section className="bg-paper">
      <Wrap className="flex flex-col gap-6 py-10 md:grid md:grid-cols-[1.02fr_0.98fr] md:items-center md:gap-12 md:py-18">
        <div>
          <Eyebrow>{copy.notFound.title}</Eyebrow>

          <h1 className="mt-4 mb-5 max-w-[13ch] text-[clamp(2.4rem,4.4vw,4.4rem)] text-balance">
            {copy.notFound.message}
          </h1>

          <p className="text-secondary max-w-[33rem] text-[1.15rem]">{copy.notFound.lead}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Action
              className="max-md:flex-1 max-md:basis-full"
              href={pathForHome(locale)}
              label={copy.notFound.backHome}
            />
          </div>

          <nav aria-label={copy.notFound.suggestionsLabel} className="border-border mt-10 border-t pt-6">
            <h2 className="text-secondary text-eyebrow mb-3.5 font-sans tracking-[0.08em] uppercase">
              {copy.notFound.suggestionsHeading}
            </h2>

            <ul className="grid gap-3 md:grid-cols-3">
              {suggestions.map(({ href, icon, key }) => (
                <li key={key}>
                  <a
                    className="bg-surface border-border text-ink hover:border-slate hover:text-action flex min-h-16 items-center gap-3 rounded-[16px] border py-2.5 pr-3.5 pl-2.5 font-bold no-underline"
                    href={href}
                  >
                    <SiteIcon className="h-10 w-10 flex-none" name={icon} size={40} />
                    {copy.nav[key]}
                    <span aria-hidden="true" className="text-secondary ml-auto">
                      →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <EmptyBay code={copy.notFound.title} />
      </Wrap>
    </section>
  )
}

/**
 * The hero's slate panel with the car taken out: an empty wash bay. Decorative,
 * and drawn in CSS and inline SVG so a page nobody meant to visit costs no
 * image request. On a phone it moves above the copy as a short strip.
 */
const EmptyBay = ({ code }: { code: string }) => (
  <div
    aria-hidden="true"
    className="shadow-card relative order-first grid min-h-[210px] place-items-center overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_75%_20%,var(--color-secondary)_0,var(--color-slate)_42%,var(--color-ink)_88%)] md:order-none md:min-h-[460px] md:rounded-[28px]"
  >
    <span className="border-on-slate/15 absolute top-[-37%] left-[46%] h-[650px] w-[650px] rounded-full border" />
    <span className="border-on-slate/15 absolute top-[-16%] left-[60%] h-[460px] w-[460px] rounded-full border" />
    <span className="absolute inset-x-0 bottom-0 h-[38%] origin-bottom [transform:perspective(240px)_rotateX(25deg)] bg-[repeating-linear-gradient(90deg,transparent_0_70px,color-mix(in_srgb,var(--color-on-slate)_6%,transparent)_71px_72px)]" />

    <span className="font-display text-on-slate/90 absolute top-[9%] text-[5rem] leading-none font-extrabold tracking-[-0.06em] md:top-[12%] md:text-[clamp(5.5rem,11vw,9.5rem)]">
      {code}
    </span>

    <svg className="relative mt-[24%] w-[46%] md:mt-[34%] md:w-[58%]" fill="none" viewBox="0 0 48 30">
      <g className="stroke-mist" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6">
        <path d="M5 29V10a8 8 0 0 1 8-8h22a8 8 0 0 1 8 8v19" />
        <path d="M11 29V12a5 5 0 0 1 5-5h16a5 5 0 0 1 5 5v17" />
        <path d="M20 10v3m8-3v3" />
      </g>
      <path className="stroke-action" d="M2 29h44" strokeDasharray="4 3" strokeLinecap="round" strokeWidth="2" />
    </svg>
  </div>
)
