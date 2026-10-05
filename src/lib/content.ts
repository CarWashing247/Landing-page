import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import type { Page, Service, SiteSetting } from '../payload-types'
import { GLOBALS_TAG, REVALIDATE_SECONDS, pageTag, serviceTag } from './cache-tags'
import { logger } from './log'
import type { Locale } from './locales'
import { pathForPage, pathForService } from './locales'
import { getPayload } from './payload'

/**
 * The one query layer the public pages read through.
 *
 * Three reasons it is a module rather than inline `getPayload()` calls in the
 * route files:
 *
 *  1. **Two locale folders per route.** `landing-page/[slug]` and
 *     `landing-page-en/[slug]` render the same document through the same
 *     query; written twice, they drift.
 *  2. **`generateMetadata()` and the page body need the same document.** React's
 *     `cache()` makes the second call free within a render, which is the
 *     pattern the Next 16 metadata guide prescribes
 *     (`01-getting-started/14-metadata-and-og-images.md`). Without it every
 *     page queries Postgres twice for the same row.
 *  3. **The cache tags live here and nowhere else.** Every content read is
 *     wrapped once, at the one call site, so AGENT.md 5.3's "never inline a tag
 *     literal" holds by construction rather than by review.
 *
 * **Two layers of caching, and they do different jobs.** React's `cache()` is
 * per render: it is what stops `generateMetadata()` and the page body querying
 * Postgres twice for the same row. `unstable_cache` is across requests and
 * deployments: it is what holds the tag that T-11's `revalidateTag` purges, and
 * the `revalidate` floor under it. Neither substitutes for the other, so the
 * outer wrapper is `cache()` and the inner one is `unstable_cache`.
 *
 * **On `unstable_cache` being the superseded API.** Next 16 replaces it with
 * the `use cache` directive, which needs the `cacheComponents` flag. That flag
 * is repo-wide: it makes data fetching dynamic by default, turns on Partial
 * Prerendering, and replaces the route segment configs — a staged migration
 * that Next's own guide drives with a dedicated skill and per-route validation,
 * and one that would have to account for Payload's admin routes under `/crm`.
 * That is its own task, not a step inside this one. The same guide states that
 * `unstable_cache` "keeps working as a separate layer", and every use of it in
 * this repo is in this file, so the migration stays cheap.
 *
 * `overrideAccess: false` with no `user` is what keeps drafts off the public
 * site. It is not belt-and-braces: Payload's Local API defaults to
 * `overrideAccess: true`, so a query written the obvious way serves unpublished
 * content to visitors and to crawlers. Running the real access control instead
 * reuses `publishedOrStaff` from T-06 rather than restating the filter here,
 * where a second copy could disagree.
 *
 * Only `debug` lines are written here. AGENT.md 5.8 forbids logging from a page
 * or a layout, because reading the source IP needs `headers()` and that turns
 * the route `ƒ`; these run during render, so they log at the level that is
 * silent unless someone is debugging, and never touch the request.
 */

/** The locale-independent shape every content route hands to `buildMetadata()`. */
export type Localized<T> = {
  doc: T
  /** The document's public path in each locale it has a slug for. */
  paths: Partial<Record<Locale, string>>
}

/**
 * `SiteSettings`, fetched once per render.
 *
 * Returns `null` rather than throwing when the global has never been saved: a
 * fresh install has no `SiteSettings` row, and a page that 500s is worse than a
 * page whose title is its own heading. Every consumer treats the fields as
 * optional for the same reason.
 */
const siteSettings = unstable_cache(
  async (locale: Locale): Promise<SiteSetting | null> => {
    const log = logger('content:site-settings')
    const payload = await getPayload()

    try {
      return await payload.findGlobal({ slug: 'site-settings', depth: 1, locale })
    } catch (error) {
      // The message, never the error object: AGENT.md 5.7. A Payload error can
      // carry the request, and the request can carry a session cookie.
      log.error('site settings unavailable', {
        locale,
        reason: error instanceof Error ? error.message : 'unknown',
      })

      return null
    }
  },
  // The locale is an argument, and `unstable_cache` folds the arguments into
  // the key, so the two locales do not share an entry.
  ['content', 'site-settings'],
  { revalidate: REVALIDATE_SECONDS, tags: [GLOBALS_TAG] },
)

export const loadSiteSettings = cache(
  async (locale: Locale): Promise<SiteSetting | null> => siteSettings(locale),
)

/**
 * The two localized values that must NOT be read through Payload's fallback.
 *
 * A normal read is fallback-resolved (`localization.fallback: true`), which is
 * what Design.md 2.3 relies on for prose — an untranslated English page shows
 * Vietnamese text and the `noindex` guardrail keeps it out of the index. For
 * these two fields the same fallback is a bug, and a silent one:
 *
 *  - **`slug`** — an untranslated `en` row returns the *Vietnamese* slug, so the
 *    page would advertise an `hreflang` to a URL that 404s. AGENT.md 5.2
 *    forbids exactly that.
 *  - **`canonical`** — an English page that leaves the field blank, which its
 *    own help text tells the editor to do, inherits the Vietnamese page's
 *    canonical and tells Google the two are one page. Google then drops the
 *    English URL. Verified against a running server before this read existed:
 *    `/en/contact` emitted `<link rel="canonical">` pointing at the Vietnamese
 *    URL, with `noindex` already released, so nothing anywhere said so.
 *
 * One extra read with `locale: 'all'`, `select`ed down to two columns, answers
 * both. `locale: 'all'` returns each localized field as a per-locale map
 * instead of a resolved value, which is the only way to tell "this locale has
 * no value" from "this locale's value happens to equal the default's".
 */
type PerLocale = {
  meta?: { canonical?: Partial<Record<Locale, string | null>> }
  slug?: Partial<Record<Locale, string>>
}

const unfallenBack = async (
  collection: 'pages' | 'services',
  id: number | string,
  draft = false,
): Promise<PerLocale> =>
  (await (
    await getPayload()
  ).findByID({
    collection,
    id,
    depth: 0,
    draft,
    locale: 'all',
    overrideAccess: draft,
    select: { meta: { canonical: true }, slug: true },
  })) as unknown as PerLocale

const loadBySlug = async <T extends { id: number }>(
  collection: 'pages' | 'services',
  slug: string,
  locale: Locale,
  draft = false,
): Promise<Localized<T> | null> => {
  const log = logger(`content:${collection}`)
  const payload = await getPayload()

  const { docs } = await payload.find({
    collection,
    depth: 1,
    draft,
    limit: 1,
    locale,
    /**
     * Drafts and unpublished documents are not public. See the note above on
     * why this cannot be left to the default.
     *
     * **`draft` flips it**, and that is the whole authorisation model for
     * preview. `publishedOrStaff` filters by `_status` for anyone who is not a
     * logged-in editor, and a draft-cookie holder is not a Payload user — so
     * access control alone would hide the very content preview exists to show.
     * What stands in for it is the cookie itself: `/api/draft` sets it only
     * after checking `PREVIEW_SECRET`, and Next signs it. The check moved
     * earlier rather than disappearing.
     */
    overrideAccess: draft,
    where: { slug: { equals: slug } },
  })

  const doc = docs[0] as T | undefined

  if (!doc) {
    log.debug('no document', { draft, locale, slug })

    return null
  }

  const perLocale = await unfallenBack(collection, doc.id, draft)

  return {
    /**
     * This locale's own canonical, or none — never the default locale's. Written
     * back onto the document rather than threaded through `buildMetadata()` as a
     * separate argument, so the builder keeps one source for each field and
     * cannot be handed two canonicals that disagree.
     */
    doc: {
      ...doc,
      meta: { ...(doc as { meta?: object }).meta, canonical: perLocale.meta?.canonical?.[locale] },
    } as T,
    paths: perLocale.slug ?? {},
  }
}

/**
 * Both document reads, under one tag.
 *
 * The tag depends on the slug, so the wrapper is built per call rather than
 * once at module scope — the pattern Next's own `unstable_cache` reference
 * uses for a per-id key. `loadBySlug` performs *two* Postgres reads (the
 * rendered locale, and the `locale: 'all'` read for the slug and canonical that
 * must not be fallback-resolved); both sit inside this one wrapper, so one
 * purge covers both and they can never be cached out of step with each other.
 *
 * The key repeats what the tag says. They are not the same thing: the key
 * decides which entry is read, the tag decides which entries a purge throws
 * away, and `unstable_cache` explicitly does not use tags to identify an entry.
 */
const tagged = <T>(
  tag: string,
  key: readonly string[],
  read: () => Promise<T>,
): Promise<T> =>
  unstable_cache(read, ['content', ...key], {
    revalidate: REVALIDATE_SECONDS,
    tags: [tag],
  })()

/**
 * A draft read goes straight to Postgres, with no tag and no cache entry.
 *
 * Next already bypasses `unstable_cache` for a draft-mode request, in both
 * directions — it neither reads an entry nor writes one. Skipping the wrapper
 * entirely rather than relying on that is belt and braces for the one mistake
 * that would be worst here: a draft response captured under a public tag, and
 * then served to everyone until the next purge.
 */
const read = <T>(
  draft: boolean,
  tag: string,
  key: readonly string[],
  load: () => Promise<T>,
): Promise<T> => (draft ? load() : tagged(tag, key, load))

/** A CMS page by its slug in the rendered locale, or `null` if there is none. */
export const loadPage = cache(
  async (slug: string, locale: Locale, draft = false): Promise<Localized<Page> | null> => {
    const found = await read(draft, pageTag(locale, slug), ['pages', locale, slug], () =>
      loadBySlug<Page>('pages', slug, locale, draft),
    )

    return found && { ...found, paths: pathsFrom(found.paths, pathForPage) }
  },
)

/** A service by its slug in the rendered locale, or `null` if there is none. */
export const loadService = cache(
  async (slug: string, locale: Locale, draft = false): Promise<Localized<Service> | null> => {
    const found = await read(draft, serviceTag(locale, slug), ['services', locale, slug], () =>
      loadBySlug<Service>('services', slug, locale, draft),
    )

    return found && { ...found, paths: pathsFrom(found.paths, pathForService) }
  },
)

/**
 * Every published slug in one locale, for `generateStaticParams()`.
 *
 * Deliberately uncached: it runs at build and when a route revalidates, never
 * per request, so a cache entry would only add a way for the prerendered set to
 * go stale. `overrideAccess: false` with no user is what keeps drafts out —
 * the acceptance criterion is explicit that a draft must not be prerendered,
 * and the filter is `publishedOrStaff` from T-06 rather than a second copy of
 * `_status: 'published'` written here.
 *
 * `limit: 0` means no limit in Payload, which is what we want: every published
 * document, not the first ten.
 */
export const publishedSlugs = async (
  collection: 'pages' | 'services',
  locale: Locale,
): Promise<string[]> => {
  const log = logger(`content:${collection}`)
  const payload = await getPayload()

  const { docs } = await payload.find({
    collection,
    depth: 0,
    limit: 0,
    locale,
    overrideAccess: false,
    pagination: false,
    select: { slug: true },
  })

  /**
   * A locale with no translation still returns rows, because `slug` is
   * fallback-resolved on a normal read — so the Vietnamese slug would be
   * prerendered under `/en/` as well. Reading per locale with the fallback off
   * is what `unfallenBack` exists for, but `find` has no such switch, so the
   * guard is on the way out: a document is prerendered in a locale only if that
   * locale has a slug of its own.
   */
  const slugs = (
    await Promise.all(
      docs.map(async (doc) => {
        const perLocale = await unfallenBack(collection, doc.id as number)

        return perLocale.slug?.[locale]
      }),
    )
  ).filter((slug): slug is string => Boolean(slug))

  log.debug('prerendering', { collection, count: slugs.length, locale })

  return slugs
}

/**
 * Turn a slug-per-locale map into a path-per-locale map.
 *
 * Shared so that the only difference between a page and a service is which
 * path builder is passed — the service segment is itself localized
 * (`/dich-vu/` against `/en/services/`), and that belongs in `locales.ts`.
 */
const pathsFrom = (
  slugs: Partial<Record<Locale, string>>,
  build: (slug: string, locale: Locale) => string,
): Partial<Record<Locale, string>> => {
  const paths: Partial<Record<Locale, string>> = {}

  for (const [locale, slug] of Object.entries(slugs) as [Locale, string | undefined][]) {
    if (slug) {
      paths[locale] = build(slug, locale)
    }
  }

  return paths
}
