import type { MetadataRoute } from 'next'

import type { SitemapDocument } from './content'
import type { Locale } from './locales'
import { LOCALES, X_DEFAULT_LOCALE } from './locales'

/**
 * Which URLs belong in the sitemap, and what each one declares as its
 * translations.
 *
 * Pure, and separate from `sitemap.ts` for one reason: the rules are three
 * independent exclusions plus a consistency property between them, every one of
 * which is silently wrong rather than loudly broken when it regresses. A
 * sitemap listing a `noindex` page does not fail a build or a request — it
 * costs crawl budget and credibility, and you find out from Search Console
 * weeks later.
 */

/**
 * The locales a document is indexable in.
 *
 * Two conditions, both per locale and both easy to half-implement:
 *
 *  - **A slug of its own.** Payload resolves a missing localized value through
 *    the fallback, so a document with no English translation still answers an
 *    English query — carrying the Vietnamese slug. Listed, that is `/en/bang-gia`,
 *    a URL that 404s.
 *  - **Not `noindex`.** Including the flag T-08's guardrail sets by itself on an
 *    untranslated locale, which is the mechanism Design.md 2.3 relies on: an
 *    English page with an empty SEO tab stays out of the index until someone
 *    translates it, and this is where "stays out" is enforced for the sitemap.
 *
 * Unpublished documents never reach here — the query runs T-06's access control.
 */
export const indexableLocales = (doc: SitemapDocument): Locale[] =>
  LOCALES.filter((locale) => Boolean(doc.slug[locale]) && doc.noindex[locale] !== true)

/**
 * One entry per indexable locale, each declaring the others.
 *
 * **`alternates` only ever names locales that passed the same filter.** A
 * sitemap that excludes a URL and then points at it from a sibling's
 * `hreflang` is worse than one that does neither: Google reads a reciprocal
 * group as a unit, so one bad member devalues the set. This is the property
 * worth protecting, and the reason the filter runs once per document and is
 * then reused rather than re-derived per entry.
 *
 * `x-default` points at Vietnamese, and is omitted entirely when Vietnamese is
 * itself excluded — claiming an English URL is the locale-neutral choice would
 * be a different wrong answer, not a fallback.
 */
export const sitemapEntries = (
  docs: SitemapDocument[],
  path: (slug: string, locale: Locale) => string,
  base: string,
): MetadataRoute.Sitemap =>
  docs.flatMap((doc) => {
    const locales = indexableLocales(doc)

    const languages = Object.fromEntries([
      ...locales.map((other) => [other, `${base}${path(doc.slug[other]!, other)}`]),
      ...(locales.includes(X_DEFAULT_LOCALE)
        ? [['x-default', `${base}${path(doc.slug[X_DEFAULT_LOCALE]!, X_DEFAULT_LOCALE)}`]]
        : []),
    ])

    return locales.map((locale) => ({
      alternates: { languages },
      lastModified: new Date(doc.updatedAt),
      url: `${base}${path(doc.slug[locale]!, locale)}`,
    }))
  })
