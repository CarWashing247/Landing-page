import type { MetadataRoute } from 'next'

import { loadSiteSettings, loadSitemap } from '../../lib/content'
import { siteOrigin } from '../../lib/env'
import type { Locale } from '../../lib/locales'
import {
  HOME_SLUG,
  LOCALES,
  X_DEFAULT_LOCALE,
  pathForHome,
  pathForPage,
  pathForService,
} from '../../lib/locales'
import { sitemapEntries } from '../../lib/sitemap'

/**
 * `/sitemap.xml`, for both locales, from the CMS.
 *
 * **One sitemap, not one per locale.** Google wants each URL listed once with
 * its translations declared alongside it, and splitting them per locale makes
 * the reciprocal `hreflang` harder to keep honest for no benefit. This file
 * lives under the Vietnamese folder because the rewrite table maps
 * `/sitemap.xml` onto it; it is not a Vietnamese sitemap.
 *
 * Three things keep a URL out, and all three are separate conditions that are
 * individually easy to half-implement:
 *
 *  1. **Unpublished** — handled by `overrideAccess: false` in the query, which
 *     runs T-06's real access control rather than restating `_status`.
 *  2. **No slug in this locale** — a document with no English translation would
 *     otherwise be listed at the Vietnamese slug under `/en/`, because Payload
 *     resolves a missing localized value through the fallback.
 *  3. **`meta.noindex` for this locale** — including the flag T-08's guardrail
 *     sets by itself on an untranslated locale. Listing a `noindex` URL asks
 *     Google to crawl a page in order to be told not to index it.
 *
 * `lastModified` is a real stored timestamp, never `new Date()`: a sitemap that
 * claims every page changed on every rebuild teaches Google to ignore the field.
 * For a document it is that locale's own stamp (`lastModifiedFor`), so an English
 * edit does not move the Vietnamese entry. The home page is a document too
 * (T-17A); only its no-document fallback is listed by hand, below.
 */

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  // Absolute URLs, because a sitemap entry cannot be relative.
  const base = siteOrigin()
  const { pages, services } = await loadSitemap()

  /**
   * **The home page is the `Pages` document with slug `home`** (T-17A), so it
   * comes out of `sitemapEntries` below like any page — `pathForPage` maps the
   * reserved slug to `/` and `/en`, its `lastModified` is that locale's own
   * stamp, and `noindex` excludes it per locale the same way.
   *
   * The hand-written entry survives only for a locale with **no** home document,
   * where `/` still answers with the fallback body rather than 404ing. Its
   * `lastModified` is `SiteSettings.updatedAt`: everything indexable about that
   * fallback — title, description, share image — comes from that one global, so
   * its timestamp bounds when the URL last changed. Omitted on a fresh install,
   * where the global has never been saved and there is no date to report.
   *
   * A locale whose home document exists but is `noindex` gets no entry at all —
   * which is the point of the flag, not a gap to fill.
   */
  const hasHomeDocument = (locale: Locale): boolean =>
    pages.some((doc) => doc.slug[locale] === HOME_SLUG)

  const fallbackLocales = LOCALES.filter((locale) => !hasHomeDocument(locale))
  const settings = fallbackLocales.length > 0 ? await loadSiteSettings(X_DEFAULT_LOCALE) : null
  const homeLastModified = settings?.updatedAt ? new Date(settings.updatedAt) : undefined

  const home: MetadataRoute.Sitemap = fallbackLocales.map((locale) => ({
    alternates: {
      languages: Object.fromEntries([
        ...LOCALES.map((other) => [other, `${base}${pathForHome(other)}`]),
        ['x-default', `${base}${pathForHome(X_DEFAULT_LOCALE)}`],
      ]),
    },
    ...(homeLastModified ? { lastModified: homeLastModified } : {}),
    url: `${base}${pathForHome(locale)}`,
  }))

  return [
    ...home,
    ...sitemapEntries(pages, pathForPage, base),
    ...sitemapEntries(services, pathForService, base),
  ]
}

export default sitemap
