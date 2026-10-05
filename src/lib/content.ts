import { cache } from 'react'

import type { Page, Service, SiteSetting } from '../payload-types'
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
 *  3. **T-10 adds cache tags here and nowhere else.** Its own task file asks for
 *     "a thin query layer so each content fetch has one call site that already
 *     carries its tags"; this is that call site, so T-10 adds an option rather
 *     than restructuring routes.
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
export const loadSiteSettings = cache(async (locale: Locale): Promise<SiteSetting | null> => {
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
})

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
): Promise<PerLocale> =>
  (await (
    await getPayload()
  ).findByID({
    collection,
    id,
    depth: 0,
    locale: 'all',
    overrideAccess: false,
    select: { meta: { canonical: true }, slug: true },
  })) as unknown as PerLocale

const loadBySlug = async <T extends { id: number }>(
  collection: 'pages' | 'services',
  slug: string,
  locale: Locale,
): Promise<Localized<T> | null> => {
  const log = logger(`content:${collection}`)
  const payload = await getPayload()

  const { docs } = await payload.find({
    collection,
    depth: 1,
    limit: 1,
    locale,
    // Drafts and unpublished documents are not public. See the note above on
    // why this cannot be left to the default.
    overrideAccess: false,
    where: { slug: { equals: slug } },
  })

  const doc = docs[0] as T | undefined

  if (!doc) {
    log.debug('no published document', { locale, slug })

    return null
  }

  const perLocale = await unfallenBack(collection, doc.id)

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

/** A CMS page by its slug in the rendered locale, or `null` if none is published. */
export const loadPage = cache(
  async (slug: string, locale: Locale): Promise<Localized<Page> | null> => {
    const found = await loadBySlug<Page>('pages', slug, locale)

    return found && { ...found, paths: pathsFrom(found.paths, pathForPage) }
  },
)

/** A service by its slug in the rendered locale, or `null` if none is published. */
export const loadService = cache(
  async (slug: string, locale: Locale): Promise<Localized<Service> | null> => {
    const found = await loadBySlug<Service>('services', slug, locale)

    return found && { ...found, paths: pathsFrom(found.paths, pathForService) }
  },
)

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
