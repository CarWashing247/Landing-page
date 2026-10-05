import type { MetadataRoute } from 'next'

import { loadSitemap } from '../../lib/content'
import { requireEnv } from '../../lib/env'
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
 * `lastModified` is the document's real `updatedAt`, never `new Date()`: a
 * sitemap that claims every page changed on every rebuild teaches Google to
 * ignore the field.
 */

/** Absolute URLs, because a sitemap entry cannot be relative. */
const origin = (): string => requireEnv('NEXT_PUBLIC_SITE_URL').replace(/\/$/, '')

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const base = origin()
  const { pages, services } = await loadSitemap()

  /**
   * The home pages are not CMS documents today — see the T-09 flag about `/`
   * not being CMS-backed — so they are listed here rather than coming out of
   * the query. Their `lastModified` is deliberately absent rather than
   * invented: `new Date()` would be a fresh timestamp on every request.
   */
  const home: MetadataRoute.Sitemap = LOCALES.map((locale) => ({
    alternates: {
      languages: Object.fromEntries([
        ...LOCALES.map((other) => [other, `${base}${pathForHome(other)}`]),
        ['x-default', `${base}${pathForHome(X_DEFAULT_LOCALE)}`],
      ]),
    },
    url: `${base}${pathForHome(locale)}`,
  }))

  return [
    ...home,
    ...sitemapEntries(pages, pathForPage, base),
    ...sitemapEntries(services, pathForService, base),
  ]
}

export default sitemap
