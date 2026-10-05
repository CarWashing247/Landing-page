import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionSlug,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'

import { GLOBALS_TAG, SITEMAP_TAG, pageTag, serviceTag } from './cache-tags'
import { requireEnv } from './env'
import type { Locale } from './locales'
import { LOCALES } from './locales'
import { logger } from './log'
import { getSecret } from './secrets'

/**
 * The write path from Design.md 1.2: publish in `/admin`, and the live page
 * changes in seconds with no build.
 *
 * Every hook here ends in one POST to `/api/revalidate`, which is the only
 * thing that calls `revalidateTag()`. Going over HTTP to our own process looks
 * indirect — Payload is embedded in this Next server, so a hook could call
 * `revalidateTag()` directly — and it is deliberate for two reasons. The
 * endpoint is the contract if the admin ever moves to its own deployment, and
 * more immediately it is the only shape in which the purge can be *tested*:
 * a 401, a 400 and a 200 are observable from `curl`, and a direct function call
 * inside a hook is not.
 *
 * **A failed purge must never fail the editor's save.** Every call is wrapped,
 * and the fallback is T-10's `revalidate: 3600` floor: the worst case is an
 * hour of staleness, not a save that bounces with an error the editor cannot
 * act on. That is also why nothing here is awaited for correctness — the hook
 * returns the document whatever the purge did.
 */

/** The header the endpoint reads. Spelled once, used by both sides. */
export const SECRET_HEADER = 'x-revalidate-secret'

/** The body the endpoint accepts. Nothing else is purgeable. */
export type RevalidatePayload = { tags: string[] }

export const isRevalidatePayload = (value: unknown): value is RevalidatePayload =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as { tags?: unknown }).tags) &&
  (value as { tags: unknown[] }).tags.every((tag) => typeof tag === 'string' && tag.length > 0)

/**
 * POST the tags, and swallow everything.
 *
 * Logs the purge on success as well as failure (AGENT.md 5.8): a webhook that
 * only speaks when it breaks cannot be shown to have ever worked, and "the edit
 * did not appear" is otherwise indistinguishable from "the hook never fired".
 * The tags are logged; the secret never is.
 */
const purge = async (tags: string[], action: string): Promise<void> => {
  const log = logger(action)

  if (tags.length === 0) {
    return
  }

  try {
    const response = await fetch(`${requireEnv('NEXT_PUBLIC_SITE_URL')}/api/revalidate`, {
      body: JSON.stringify({ tags } satisfies RevalidatePayload),
      headers: {
        'content-type': 'application/json',
        [SECRET_HEADER]: await getSecret('REVALIDATE_SECRET'),
      },
      method: 'POST',
    })

    if (!response.ok) {
      log.error('purge refused', { status: response.status, tags: tags.join(',') })

      return
    }

    log.info('purged', { count: tags.length, tags: tags.join(',') })
  } catch (error) {
    /**
     * The message, never the error. A fetch failure carries the request, and
     * this request carries the secret in a header (AGENT.md 5.7).
     */
    log.error('purge failed', {
      reason: error instanceof Error ? error.message : 'unknown',
      tags: tags.join(','),
    })
  }
}

type TagFor = (locale: Locale, slug: string) => string

const tagFor: Record<'pages' | 'services', TagFor> = {
  pages: pageTag,
  services: serviceTag,
}

/**
 * Every locale's slug for one document, with the fallback off.
 *
 * `doc` in an `afterChange` hook is resolved for `req.locale` alone, and
 * Payload's field-level fallback means a locale with no translation hands back
 * the default locale's slug — so purging from `doc.slug` alone would purge the
 * Vietnamese tag twice and the English one never.
 *
 * `locale: 'all'` returns each localized field as a per-locale map, which the
 * generated types do not model (they type `slug` as the resolved string), hence
 * the cast through `unknown`. It is the runtime shape, and it is the reason
 * this read exists. Same technique as `recordSlugsAfterRestore` in
 * `slug-field.ts` and `unfallenBack` in `content.ts`.
 *
 * **No `draft: true` here, and that is the opposite of what T-09 needed.**
 * `content.ts` reads with `draft: true` because it is rendering the document an
 * editor is working on. This read is choosing which *cache entry* to throw
 * away, and the public site only ever cached the published slug — so the
 * published row is the right one to ask. Measured: while a draft rename is in
 * flight this returns the old, still-published slug, and only once the document
 * is published does it return the new one. That is the correct sequence, not a
 * lag: the new URL had nothing cached under it until it went live.
 */
const slugPerLocale = async (
  collection: CollectionSlug,
  id: number | string,
  req: PayloadRequest,
): Promise<Partial<Record<Locale, string>>> => {
  const everyLocale = (await req.payload.findByID({
    collection,
    id,
    depth: 0,
    fallbackLocale: false,
    locale: 'all',
    overrideAccess: true,
    req,
  })) as unknown as { slug?: Partial<Record<Locale, string>> }

  return everyLocale.slug ?? {}
}

/**
 * The tags one document's change invalidates.
 *
 * **Every locale, not only the one that changed**, and that is the one place
 * locale-scoped tags would otherwise under-purge. The tag is per locale so that
 * editing the English copy does not throw away the cached Vietnamese page —
 * correct, and the reason the locale is in the tag at all. But a *slug rename*
 * reaches further than the locale it happened in: the Vietnamese page's cached
 * render contains the English `hreflang` URL, so renaming the English slug
 * leaves the Vietnamese page advertising a URL that now 404s. Purging every
 * locale costs two tags instead of one and removes the whole class of problem.
 *
 * `previousDoc`'s slug is added for the locale that changed, so the old URL
 * stops serving the moved content. Its negative entry is then re-cached as a
 * miss on the next request, which is what makes the old URL 404 rather than
 * keep serving.
 */
const tagsForDocument = async ({
  collection,
  id,
  previousSlug,
  req,
}: {
  collection: 'pages' | 'services'
  id: number | string
  previousSlug?: string | null
  req: PayloadRequest
}): Promise<string[]> => {
  const build = tagFor[collection]
  const slugs = await slugPerLocale(collection, id, req)

  const tags = new Set<string>([SITEMAP_TAG])

  for (const locale of LOCALES) {
    const slug = slugs[locale]

    if (slug) {
      tags.add(build(locale, slug))
    }
  }

  /**
   * The old slug, purged in every locale.
   *
   * In principle it belongs only to the locale that was edited — a rename in
   * `en` does not move the `vi` URL — and the narrow branch below is kept for
   * the case where a single locale is identifiable. **In practice it never is:
   * Payload hands this hook `req.locale === 'all'` even for a request that
   * named one**, which was measured rather than assumed. So the fan-out is what
   * runs, and the cost is one extra tag on a path that T-06 already makes rare:
   * a published slug cannot change at all, so a rename only ever happens to a
   * draft, under a URL the public site has never served.
   */
  if (previousSlug) {
    const edited = req.locale
    const locales =
      edited && edited !== 'all' && (LOCALES as readonly string[]).includes(edited)
        ? [edited as Locale]
        : LOCALES

    for (const locale of locales) {
      tags.add(build(locale, previousSlug))
    }
  }

  return [...tags]
}

/**
 * Purge a document's tags after it changes.
 *
 * Returns `doc` untouched and never throws: an `afterChange` hook that throws
 * fails the editor's save, and a cache purge is not worth losing an edit over.
 */
export const revalidateAfterChange =
  (collection: 'pages' | 'services'): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, req }) => {
    const previousSlug = previousDoc?.slug as string | undefined
    const currentSlug = doc?.slug as string | undefined

    try {
      const tags = await tagsForDocument({
        collection,
        id: doc.id as number | string,
        // Only when it actually moved. Sending it on every save would purge the
        // same tag twice and make the log unreadable.
        previousSlug: previousSlug && previousSlug !== currentSlug ? previousSlug : undefined,
        req,
      })

      await purge(tags, `${collection}:afterChange`)
    } catch (error) {
      logger(`${collection}:afterChange`).error('could not build tags', {
        id: String(doc.id),
        reason: error instanceof Error ? error.message : 'unknown',
      })
    }

    return doc
  }

/**
 * Purge after a delete, so a removed page stops serving.
 *
 * The document is already gone by the time this runs, so the slugs cannot be
 * re-read per locale — `doc` here is the deleted document as it last was,
 * resolved for `req.locale`. Purging that slug in every locale is the
 * conservative choice: at worst it purges a tag that was already empty, which
 * costs one re-render.
 */
export const revalidateAfterDelete =
  (collection: 'pages' | 'services'): CollectionAfterDeleteHook =>
  async ({ doc }) => {
    const build = tagFor[collection]
    const slug = doc?.slug as string | undefined
    const tags = [SITEMAP_TAG, ...(slug ? LOCALES.map((locale) => build(locale, slug)) : [])]

    await purge(tags, `${collection}:afterDelete`)

    return doc
  }

/**
 * Purge the site-wide tag after a global changes.
 *
 * `globals` only, not `sitemap`: neither `BusinessInfo` nor `SiteSettings`
 * contributes a URL or a `lastModified` to the sitemap, so adding it would make
 * every opening-hours edit re-render every route for nothing. A `globals` purge
 * is already site-wide and expensive, which Design.md 1.3 calls correct and
 * rare.
 */
export const revalidateGlobal =
  (name: string): GlobalAfterChangeHook =>
  async ({ doc }) => {
    await purge([GLOBALS_TAG], `${name}:afterChange`)

    return doc
  }
