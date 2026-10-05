import type { Metadata } from 'next'

import type { Media, SiteSetting } from '../../payload-types'
import { requireEnv } from '../../lib/env'
import type { Locale } from '../../lib/locales'
import { LOCALES, OG_LOCALE, X_DEFAULT_LOCALE, pathForOpenGraphImage } from '../../lib/locales'

/**
 * The only place in this repo a `Metadata` object is assembled (AGENT.md 5.2).
 *
 * Every content route exports `generateMetadata()` and every one of them
 * delegates here. The reason that rule is absolute rather than a preference:
 * the fallback chain is the whole value of the SEO tab. An editor adds a page,
 * writes the words and never opens the SEO tab — which is the common case, not
 * the careless one — and the page still has to ship a title, a description, a
 * canonical and a share image. A per-route tweak written inline "just this
 * once" is a page whose tags silently diverge from every other page's, and
 * nothing in the build says so.
 *
 * The fallback chain is Design.md 2.3:
 *
 * | Blank field | Becomes |
 * | --- | --- |
 * | `meta.title` | `${doc.title}${titleSuffix}` |
 * | `meta.description` | `SiteSettings.defaultDescription` |
 * | `meta.image` | `SiteSettings.ogFallback`, then the generated `opengraph-image` |
 * | `meta.canonical` | the route's own path, resolved against `metadataBase` |
 *
 * Everything here is pure: `SiteSettings` and the document arrive as
 * arguments, fetched once per request by the caller. That keeps the chain unit
 * testable without a database, which matters because the chain is exactly the
 * part no amount of manual clicking in `/admin` covers — you cannot see a
 * fallback by looking at a page that has its own values.
 *
 * It therefore logs nothing, per AGENT.md 5.8: a pure function has no outside
 * to reach and no request to attribute, and a page cannot read `headers()`
 * without turning itself dynamic.
 */

/** The SEO group from T-08, as both collections carry it. */
export type SeoMeta = {
  title?: string | null
  description?: string | null
  image?: (number | null) | Media
  canonical?: string | null
  noindex?: boolean | null
  keywordFocus?: string | null
}

/** What any document needs to look like to be given metadata. */
export type MetadataDoc = {
  /** `title` on a `Page`, `name` on a `Service` — the caller maps it. */
  title: string
  meta?: SeoMeta | null
}

export type BuildMetadataInput = {
  /** The rendered locale. Decides `og:locale` and which path is canonical. */
  locale: Locale
  /**
   * This page's path in each locale it exists in, including the rendered one.
   *
   * One map rather than a `route` string plus a separate alternates argument,
   * because the canonical and the `hreflang` set have to agree and two
   * arguments can disagree. A locale absent from the map gets no `hreflang`:
   * AGENT.md 5.2 forbids advertising an alternate that 404s, and a document
   * whose other locale was never saved has no URL there to advertise.
   */
  paths: Partial<Record<Locale, string>>
  /** Null when the page is not CMS-backed, or when the global is unset. */
  settings: SiteSetting | null
  /** Absent for a route with no document behind it, such as the home page today. */
  doc?: MetadataDoc | null
  /** `og:type`. `website` for everything this site has; `article` is for a blog. */
  type?: 'website' | 'article'
}

const blank = (value: string | null | undefined): boolean =>
  value === null || value === undefined || value.trim() === ''

/**
 * The share image, preferring the 1200x630 version the upload generated.
 *
 * Returns the URL as Payload stored it — relative on local disk, absolute on
 * R2 — and lets `metadataBase` resolve the relative case. Doing that resolution
 * by hand here would be a second implementation of something Next already does
 * correctly, and the acceptance criterion is only that the *emitted* URL is
 * absolute.
 *
 * The dimensions come back with it rather than being assumed. Facebook renders
 * a large card instead of a thumbnail only when it is told the size up front,
 * and the `og` size is 1200x630 by construction (`fit: 'cover'`,
 * `withoutEnlargement: false` in `Media.ts`) — but the original is whatever was
 * uploaded, so stating 1200x630 for it would be a confident lie.
 */
type ShareImage = { alt?: string; height?: number; url: string; width?: number }

const OG_SIZE = { height: 630, width: 1200 }

const shareImage = (image: SeoMeta['image']): ShareImage | undefined => {
  // A number is an unpopulated relationship: the caller fetched at `depth: 0`.
  // Nothing useful can be said about it, and guessing a URL would be worse.
  if (image === null || image === undefined || typeof image === 'number') {
    return undefined
  }

  /**
   * `Media.alt` is required and localized (Design.md 2.1), so it is always
   * present and always in the language of the page being shared.
   */
  const alt = image.alt

  if (image.sizes?.og?.url) {
    return { alt, ...OG_SIZE, url: image.sizes.og.url }
  }

  if (!image.url) {
    return undefined
  }

  return {
    alt,
    height: image.height ?? undefined,
    url: image.url,
    width: image.width ?? undefined,
  }
}

export const buildMetadata = ({
  doc,
  locale,
  paths,
  settings,
  type = 'website',
}: BuildMetadataInput): Metadata => {
  const meta = doc?.meta ?? {}
  const brandName = settings?.brandName
  const suffix = settings?.titleSuffix

  /**
   * `meta.title`, then the document's own heading plus the suffix, then the
   * brand alone.
   *
   * The suffix carries its own separator (`| AutoWash247`) because an editor
   * can see the whole result in one field and does not have to picture where a
   * hardcoded `|` would land. When it is unset, the separator is supplied here
   * rather than omitted — `Bảng giáAutoWash247` is worse than a guess.
   *
   * Brand alone is the no-document case: appending a suffix that already names
   * the brand to the brand gives `AutoWash247 | AutoWash247`.
   */
  const title = !blank(meta.title)
    ? meta.title!
    : doc
      ? `${doc.title}${blank(suffix) ? (brandName ? ` | ${brandName}` : '') : suffix}`
      : (brandName ?? undefined)

  const description = !blank(meta.description)
    ? meta.description!
    : !blank(settings?.defaultDescription)
      ? settings!.defaultDescription!
      : undefined

  /**
   * The page's own image, then the site fallback, then the generated one — and
   * that last resort is named explicitly rather than left to Next's
   * `opengraph-image.tsx` file convention.
   *
   * **That convention does not cascade to nested route segments.** Measured on
   * a running server: `/` and `/en` carried an `og:image` from the file in
   * their own segment, while `/bang-gia` and `/en/pricing` carried none at all —
   * so every CMS page would have shipped with no share image until someone
   * uploaded an `ogFallback`, which is exactly the gap that file exists to
   * close. Naming the generated route by URL makes the fallback reach every
   * page, and makes it the public URL rather than the internal folder Next
   * would otherwise put in the tag.
   */
  const image: ShareImage = shareImage(meta.image) ??
    shareImage(settings?.ogFallback) ?? {
      alt: brandName ?? undefined,
      ...OG_SIZE,
      url: pathForOpenGraphImage(locale),
    }

  const route = paths[locale]

  /**
   * The editor's canonical wins outright, which is the point of the field: it
   * exists for the case where this content also lives somewhere else and that
   * other URL is the one that should earn the ranking.
   */
  const canonical = !blank(meta.canonical) ? meta.canonical! : route

  /**
   * `hreflang` for every locale this page exists in, plus `x-default`.
   *
   * `x-default` is what a searcher in neither language group should land on,
   * and for a Hanoi business that is Vietnamese (`X_DEFAULT_LOCALE`). It is
   * omitted rather than pointed somewhere else when that locale's URL is
   * unknown.
   */
  const languages: Record<string, string> = {}

  for (const candidate of LOCALES) {
    const path = paths[candidate]

    if (path) {
      languages[candidate] = path
    }
  }

  const xDefault = paths[X_DEFAULT_LOCALE]

  if (xDefault) {
    languages['x-default'] = xDefault
  }

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    /**
     * `noindex` is the only robots directive this site sets. `nofollow` rides
     * with it deliberately: a page being kept out of the index is either
     * untranslated or deliberately hidden, and in both cases its outgoing
     * links should not be spending crawl budget. Everything else is left to
     * the default, because `index, follow` emitted explicitly is noise that
     * invites someone to edit it.
     */
    ...(meta.noindex === true ? { robots: { follow: false, index: false } } : {}),
    openGraph: {
      description,
      locale: OG_LOCALE[locale],
      siteName: brandName ?? undefined,
      title,
      type,
      ...(route ? { url: route } : {}),
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      description,
      title,
      images: [image],
    },
    /**
     * No `keywords`. Search engines have ignored it for over a decade and it
     * only advertises the keyword map to competitors (AGENT.md section 9).
     * `meta.keywordFocus` is an editorial note and is never rendered.
     */
  }
}

/**
 * `metadataBase`, declared once and used by the root layout of each locale.
 *
 * This is the single most common cause of a share link with no image: without
 * it every `og:image` is a relative path, and Facebook and Zalo neither
 * resolve it nor report that they could not. `requireEnv` throws at module
 * load when `NEXT_PUBLIC_SITE_URL` is unset, which fails the build — the right
 * outcome, because the alternative is a green build whose share cards are all
 * silently broken.
 *
 * It lives here rather than inline in the two layouts so that the two cannot
 * drift, and so that AGENT.md 5.2's "never assemble a Metadata object in a
 * page file" holds with no exception carved out for layouts.
 */
export const rootMetadata = (): Metadata => ({
  metadataBase: new URL(requireEnv('NEXT_PUBLIC_SITE_URL')),
})

/**
 * The global 404's metadata.
 *
 * It does not go through `buildMetadata()`, and the difference is the point: a
 * 404 has no document, no canonical and no locale pair, so handing it a `paths`
 * map would mean inventing a URL for a page that has none and emitting
 * `hreflang` links from an error page. What it does need is to stay out of the
 * index, which Next's default 404 does not guarantee once the page returns a
 * full document of its own.
 *
 * It lives here anyway so that "no `Metadata` object is assembled outside
 * `metadata.ts`" stays literally true and therefore checkable with `grep`. A
 * rule with one documented exception is a rule with as many exceptions as
 * people who read it quickly.
 */
export const notFoundMetadata = (brandName: string): Metadata => ({
  robots: { follow: false, index: false },
  title: brandName,
})
