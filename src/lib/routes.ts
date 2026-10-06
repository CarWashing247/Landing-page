import type { Locale } from './locales'
import { SERVICE_SEGMENT, pathForHome, pathForPage, urlFor } from './locales'

/**
 * The site's primary navigation, as one table.
 *
 * **Taken from Design.md section 3, not from the navigation in the Canva
 * designs, and the difference is deliberate.** The designs show six items —
 * Trang chủ, Dịch vụ, Bảng giá, Về chúng tôi, Tin tức, Liên hệ. Two of those,
 * "Về chúng tôi" and "Tin tức", correspond to no route, no keyword cluster and
 * no task anywhere in the plan, so linking them would ship a header whose items
 * 404. The designs also omit `/huong-dan`, which Design.md section 3 lists as a
 * keyword-cluster page in both locales. Shipping links that lead nowhere, and
 * dropping a page the SEO plan is built around, are both worse than a header
 * with five items. See this task's flags — it is a decision, not a typo.
 *
 * **Slugs appear in code here, which is safe only because of the published-slug
 * lock.** Normally a slug is CMS data and hardcoding it would mean the header
 * breaks the first time an editor renames a page. T-06 makes a published slug
 * `readOnly`, so these paths cannot move once they exist. A page that has not
 * been created yet still links correctly, because the slug is fixed in advance
 * by the keyword map — T-23 creates the documents at exactly these slugs.
 *
 * The English slugs are **not translations**: Design.md section 3 researches
 * each locale's clusters separately, so `how-it-works` sits opposite
 * `huong-dan` because that is what the English audience searches for, not
 * because it is what `huong-dan` means.
 */

/**
 * `tel:` from a stored phone number.
 *
 * Three places need it — the header's call button, the footer's hotline and the
 * service page's closing call to action (T-18) — so it is one function rather
 * than three copies of the same character class. Digits and a leading `+`
 * survive: `024 1234 5678` dials as `tel:02412345678`, and a number stored in
 * international form keeps its `+`.
 *
 * Whether to render a link at all is not decided here. That is `publishable()`'s
 * job (`src/lib/schema/shared.ts`), so a `TODO(data):` placeholder never becomes
 * a button that dials nothing.
 */
export const callHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`

/** A navigation item: which catalog key names it, and where it points. */
export type NavItem = {
  /** The key under `nav` in the message catalog. */
  readonly key: 'contact' | 'guide' | 'home' | 'pricing' | 'services'
  readonly href: (locale: Locale) => string
}

/**
 * The per-locale slug of each CMS page in the navigation, from Design.md
 * section 3's two tables.
 */
const PAGE_SLUG = {
  contact: { en: 'contact', vi: 'lien-he' },
  guide: { en: 'how-it-works', vi: 'huong-dan' },
  pricing: { en: 'pricing', vi: 'bang-gia' },
} as const satisfies Record<string, Record<Locale, string>>

export const NAV: readonly NavItem[] = [
  { href: pathForHome, key: 'home' },
  /**
   * The services index is the segment itself — `/dich-vu` against
   * `/en/services` — which is a `Pages` document at that slug rather than a
   * route of its own. `/dich-vu/<slug>` is a different, deeper route and does
   * not collide with it.
   */
  { href: (locale) => urlFor(`/${SERVICE_SEGMENT[locale]}`, locale), key: 'services' },
  { href: (locale) => pathForPage(PAGE_SLUG.pricing[locale], locale), key: 'pricing' },
  { href: (locale) => pathForPage(PAGE_SLUG.guide[locale], locale), key: 'guide' },
  { href: (locale) => pathForPage(PAGE_SLUG.contact[locale], locale), key: 'contact' },
] as const
