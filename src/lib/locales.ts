/**
 * The locale list, the default, and how a locale maps onto a URL.
 *
 * Defined once and imported everywhere. The locale is part of the cache key,
 * the sitemap and the metadata contract, so a second place that parses a URL
 * prefix is a second place that can disagree with the first.
 *
 * See Design.md section 1.1a.
 */

export const LOCALES = ['vi', 'en'] as const

export type Locale = (typeof LOCALES)[number]

/**
 * Vietnamese is the primary market, so it is served unprefixed and keeps the
 * shortest URLs. English lives under `/en`.
 */
export const DEFAULT_LOCALE: Locale = 'vi'

/** `hreflang` codes, and the `og:locale` values, per locale. */
export const HREFLANG: Record<Locale, string> = {
  vi: 'vi',
  en: 'en',
}

export const OG_LOCALE: Record<Locale, string> = {
  vi: 'vi_VN',
  en: 'en_US',
}

/**
 * `x-default` points at Vietnamese: it is what a searcher outside both
 * language groups should land on, and this is a Hanoi business.
 */
export const X_DEFAULT_LOCALE: Locale = DEFAULT_LOCALE

export const isLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value)

/** The URL prefix for a locale. Empty for the default. */
export const prefixFor = (locale: Locale): string => (locale === DEFAULT_LOCALE ? '' : `/${locale}`)

type Resolved = {
  locale: Locale
  /**
   * The path with the locale prefix removed, always starting with `/`.
   * `/en/pricing` -> `/pricing`, `/en` -> `/`, `/bang-gia` -> `/bang-gia`.
   */
  path: string
}

/**
 * Turn a request pathname into a locale and the path beneath it.
 *
 * The only place a locale prefix is parsed. Note the exact-segment check: a
 * path that merely starts with the letters of a locale (`/english-lessons`)
 * is **not** that locale.
 */
export const localeFromPath = (pathname: string): Resolved => {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  const [, first = '', ...rest] = withLeadingSlash.split('/')

  if (isLocale(first) && first !== DEFAULT_LOCALE) {
    return { locale: first, path: `/${rest.join('/')}`.replace(/\/$/, '') || '/' }
  }

  return { locale: DEFAULT_LOCALE, path: withLeadingSlash.replace(/(.)\/$/, '$1') }
}

/** The public URL for a path in a locale. `('/pricing', 'en')` -> `/en/pricing`. */
export const urlFor = (path: string, locale: Locale): string => {
  const normalised = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`

  return `${prefixFor(locale)}${normalised}` || '/'
}

/** The other locales, for building `hreflang` alternates. */
export const otherLocales = (locale: Locale): Locale[] =>
  LOCALES.filter((candidate) => candidate !== locale)

/**
 * The plain-word folder under `src/app` that serves a locale.
 *
 * Each locale has its own folder so the locale is a **build-time constant**:
 * its layout hardcodes `lang` and its pages pass the locale down literally.
 * Resolving the locale at request time instead — from a header or from
 * `searchParams` — forces every page to render per request, which breaks
 * AGENT.md 5.1. Measured: the home page went from `○` to `ƒ` the moment the
 * layout called `headers()`.
 *
 * The cost is one thin folder per locale per route, re-exporting the shared
 * implementation. That is the price of plain-word folders, static rendering
 * and two locales at once.
 */
export const FOLDER_FOR: Record<Locale, string> = {
  vi: 'landing-page',
  en: 'landing-page-en',
}

/**
 * The path segment that carries a service page, per locale.
 *
 * Localized for the same reason the slug is: `/dich-vu/...` and
 * `/en/services/...` are what each audience searches for, and Design.md 1.1a
 * and section 3 both spell the two shapes out. A single segment shared by both
 * locales would put a Vietnamese word in the middle of an English URL.
 *
 * Note that AGENT.md section 4's layout sketch shows `dich-vu/[slug]` under
 * both locale folders. Design.md is explicit twice that English is
 * `/en/services/<slug>`, so the sketch is the loose one; it has been corrected
 * rather than followed.
 */
export const SERVICE_SEGMENT: Record<Locale, string> = {
  vi: 'dich-vu',
  en: 'services',
}

/** The public path of a CMS page in a locale. `('bang-gia', 'vi')` -> `/bang-gia`. */
export const pathForPage = (slug: string, locale: Locale): string => urlFor(`/${slug}`, locale)

/** The public path of a service in a locale. `('quick-wash', 'en')` -> `/en/services/quick-wash`. */
export const pathForService = (slug: string, locale: Locale): string =>
  urlFor(`/${SERVICE_SEGMENT[locale]}/${slug}`, locale)

/** The public path of the home page in a locale. `'en'` -> `/en`. */
export const pathForHome = (locale: Locale): string => urlFor('/', locale)

/**
 * The public URL of the generated last-resort share image for a locale.
 *
 * `/opengraph-image` and `/en/opengraph-image`, which the rewrites map onto
 * each locale folder's `opengraph-image.tsx`. The public spelling is used
 * rather than the internal one Next would generate, so the tag does not name a
 * folder that is an implementation detail.
 */
export const pathForOpenGraphImage = (locale: Locale): string =>
  urlFor('/opengraph-image', locale)
