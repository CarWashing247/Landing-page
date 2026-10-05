import type { Locale } from './locales'

/**
 * The cache tag scheme, defined once (Design.md 1.3, AGENT.md 5.3).
 *
 * Dependency-free on purpose: this module is imported by the query layer, by
 * the revalidation webhook (T-11) and by the sitemap (T-13), and a tag string
 * built by hand in any one of them is a purge that silently does nothing. The
 * webhook cannot tell a tag nobody holds from a tag that worked — `revalidateTag`
 * reports neither — so the only defence is that no caller ever spells one.
 *
 * **The locale is part of the page and service tags.** Translations are
 * published independently: fixing a typo in the English copy must not throw
 * away the cached Vietnamese page. Note that the T-10 task file's table writes
 * these as `page:<slug>`, without the locale; Design.md 1.3 and AGENT.md 5.3
 * both write `page:<locale>:<slug>` and they are the binding pair, so the
 * locale is in.
 */

/** One CMS page in one locale. Purged when that page is published. */
export const pageTag = (locale: Locale, slug: string): string => `page:${locale}:${slug}`

/** One service page in one locale. Purged when that service is published. */
export const serviceTag = (locale: Locale, slug: string): string => `service:${locale}:${slug}`

/** `sitemap.xml`, all locales. Purged when any page or service is published. */
export const SITEMAP_TAG = 'sitemap'

/** Header, footer and JSON-LD. Purged when `BusinessInfo` or `SiteSettings` changes. */
export const GLOBALS_TAG = 'globals'

/**
 * The revalidate floor, in seconds, on every cached content query.
 *
 * A safety net for a failed webhook, not the primary mechanism — AGENT.md 5.3
 * says not to remove it. If T-11's purge never arrives (a bad secret, a network
 * blip, a deploy mid-publish), the worst case is an hour of staleness rather
 * than a page frozen until the next build. One hour is chosen to be short
 * enough that nobody is left looking at yesterday's prices, and long enough
 * that it is not doing the webhook's job.
 */
export const REVALIDATE_SECONDS = 3600
