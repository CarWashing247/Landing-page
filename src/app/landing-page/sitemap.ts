import type { MetadataRoute } from 'next'

import { loadSiteSettings, loadSitemap } from '../../lib/content'
import { siteOrigin } from '../../lib/env'
import { LOCALES, X_DEFAULT_LOCALE, pathForHome, pathForPage, pathForService } from '../../lib/locales'
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
 * edit does not move the Vietnamese entry; for the home pages it is
 * `SiteSettings.updatedAt`, bounded as described below.
 */

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  // Absolute URLs, because a sitemap entry cannot be relative.
  const base = siteOrigin()
  const { pages, services } = await loadSitemap()

  /**
   * The home pages are not CMS documents today — see the T-09 flag about `/`
   * not being CMS-backed — so they are listed here rather than coming out of
   * the query.
   *
   * **Their `lastModified` is `SiteSettings.updatedAt`, and the bound that makes
   * that honest is worth stating.** Everything Google indexes about the home page
   * that is not placeholder copy comes from that one global: the `<title>` is
   * `brandName`, the description is `defaultDescription`, the share image is
   * `ogFallback` (see `homeMetadata` in `src/components/HomePage.tsx`). So the
   * global's own timestamp bounds when the indexable part of this URL last
   * changed. The read is `SiteSettings`'s existing `globals`-tagged query, so it
   * adds no query path, and the default locale is passed because `updatedAt` is
   * not localized — a global has one row.
   *
   * What it does *not* cover is the page body, which is hardcoded JSX today and
   * so moves only on a deploy. That makes this understate rather than overstate,
   * which is the safe direction: an understated `lastmod` costs a delayed
   * recrawl, while an overstated one teaches Google to ignore the field for every
   * other URL in the file. `new Date()` would be the overstating version, fresh
   * on every request, and is what this avoids.
   *
   * It is still `undefined` on a fresh install, where the global has never been
   * saved and `loadSiteSettings` returns `null`. Omitting the attribute is
   * correct there: there is no date to report.
   */
  const settings = await loadSiteSettings(X_DEFAULT_LOCALE)
  const homeLastModified = settings?.updatedAt ? new Date(settings.updatedAt) : undefined

  const home: MetadataRoute.Sitemap = LOCALES.map((locale) => ({
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
