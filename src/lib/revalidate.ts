import { after } from 'next/server'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeDeleteHook,
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
 * act on.
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
 * A self-request can hang, and without this one it would hang the save.
 *
 * Matches the Vault client's ceiling in `secrets.ts` for the same reason: a
 * request with no timeout can be held open indefinitely by whatever is on the
 * other end, and here the other end is this same process.
 */
const REQUEST_TIMEOUT_MS = 10_000

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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

/**
 * Purge **after the response, and therefore after the transaction commits.**
 *
 * Payload runs `afterChange` inside the write transaction and commits
 * afterwards. Purging from inside it is a race that the endpoint's
 * `{ expire: 0 }` makes worse rather than better: that setting makes the next
 * request a *blocking* re-render, so a visitor arriving between the purge and
 * the COMMIT re-reads the pre-publish rows, caches them, and nothing purges
 * again. The page is then stale until the one-hour floor — the exact failure
 * `{ expire: 0 }` was chosen to avoid.
 *
 * `after()` runs its callback once the response is finished, which is strictly
 * later than the commit. It also takes the purge off the save path entirely, so
 * a slow webhook can no longer hold a write transaction open.
 *
 * Outside a request — a seed script, a test using the Local API — there is no
 * context for `after()` to attach to and it throws. The purge then runs inline,
 * which is correct enough there: a script is not racing a visitor.
 */
const purgeAfterCommit = (tags: string[], action: string): void => {
  try {
    after(() => purge(tags, action))
  } catch {
    void purge(tags, action)
  }
}

type TagFor = (locale: Locale, slug: string) => string

const tagFor: Record<'pages' | 'services', TagFor> = {
  pages: pageTag,
  services: serviceTag,
}

/**
 * A slug, or nothing.
 *
 * A write made with `locale=all` hands back a per-locale **object** where a
 * single-locale write hands back a string. Without this guard that object is
 * template-stringified into a `page:vi:[object Object]` tag — one that matches
 * nothing, purges nothing, and reports success.
 */
const asSlug = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

/**
 * Every locale's slug for one document, with the fallback off.
 *
 * `doc` in a hook is resolved for one locale, and Payload's field-level
 * fallback means a locale with no translation hands back the default locale's
 * slug — so purging from `doc.slug` alone would purge the Vietnamese tag twice
 * and the English one never.
 *
 * **`req` is copied, not passed.** `createLocalReq` assigns `req.locale` onto
 * the object it is given (`createLocalReq.js:71`), so handing it the live
 * request leaves `req.locale === 'all'` for everything that runs afterwards.
 * That is not hypothetical: it is where this file's earlier claim to have
 * "measured `req.locale === 'all'`" came from — the probe ran after this call
 * and was reading its own side effect. The real damage is on a bulk write,
 * where every document after the first would then run T-06's
 * `storedSlugForLocale` with `locale === 'all'`, which returns `undefined` and
 * makes the published-slug lock stop refusing renames. The copy keeps
 * `transactionID`, so the read still joins the surrounding transaction.
 *
 * `locale: 'all'` returns each localized field as a per-locale map, which the
 * generated types do not model (they type `slug` as the resolved string), hence
 * the cast through `unknown`. Same technique as `recordSlugsAfterRestore` in
 * `slug-field.ts` and `unfallenBack` in `content.ts`.
 *
 * **No `draft: true`, which is the opposite of what `content.ts` needs.** That
 * read renders the document an editor is working on; this one chooses which
 * *cache entry* to discard, and only the published slug was ever cached. During
 * a draft rename it therefore returns the old, still-published slug, and
 * returns the new one once the document is published — the correct sequence,
 * because nothing was cached under the new URL until it went live.
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
    req: { ...req } as PayloadRequest,
  })) as unknown as { slug?: Partial<Record<Locale, unknown>> }

  const slugs: Partial<Record<Locale, string>> = {}

  for (const locale of LOCALES) {
    const slug = asSlug(everyLocale.slug?.[locale])

    if (slug) {
      slugs[locale] = slug
    }
  }

  return slugs
}

/** The tags covering a document, by its slug in each locale. */
const tagsForSlugs = (
  collection: 'pages' | 'services',
  slugs: Partial<Record<Locale, string>>,
): string[] => {
  const build = tagFor[collection]
  const tags = new Set<string>([SITEMAP_TAG])

  for (const locale of LOCALES) {
    const slug = slugs[locale]

    if (slug) {
      tags.add(build(locale, slug))
    }
  }

  return [...tags]
}

/**
 * Purge a document's tags after it changes.
 *
 * **Every locale, not only the one that changed**, and that is the one place
 * locale-scoped tags would otherwise under-purge. The tag is per locale so that
 * editing the English copy does not throw away the cached Vietnamese page —
 * correct, and the reason the locale is in the tag at all. But a *slug rename*
 * reaches further than the locale it happened in: the Vietnamese page's cached
 * render contains the English `hreflang` URL, so renaming the English slug
 * leaves the Vietnamese page advertising a URL that now 404s.
 *
 * Returns `doc` untouched and never throws: an `afterChange` hook that throws
 * fails the editor's save, and a cache purge is not worth losing an edit over.
 */
export const revalidateAfterChange =
  (collection: 'pages' | 'services'): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, req }) => {
    try {
      const slugs = await slugPerLocale(collection, doc.id as number | string, req)
      const tags = new Set(tagsForSlugs(collection, slugs))

      /**
       * The slug it moved away from, purged in every locale.
       *
       * Which locale a rename belongs to is not reliably knowable here, so the
       * old slug is purged in all of them: one extra tag, on a path T-06
       * already makes rare, since a published slug cannot change at all and a
       * rename only ever happens to a draft under a URL the public site has
       * never served.
       */
      const previousSlug = asSlug(previousDoc?.slug)
      const currentSlug = asSlug(doc?.slug)

      if (previousSlug && previousSlug !== currentSlug) {
        for (const locale of LOCALES) {
          tags.add(tagFor[collection](locale, previousSlug))
        }
      }

      purgeAfterCommit([...tags], `${collection}:afterChange`)
    } catch (error) {
      logger(`${collection}:afterChange`).error('could not build tags', {
        id: String(doc.id),
        reason: error instanceof Error ? error.message : 'unknown',
      })
    }

    return doc
  }

/**
 * `req.context` key holding the slugs read before a delete.
 *
 * Keyed by collection *and* id because a bulk delete runs these hooks once per
 * document on one shared request; a single key would have the second document
 * purging the first one's slugs.
 */
const deletedSlugsKey = (collection: string, id: number | string): string =>
  `revalidate:${collection}:${id}`

/**
 * Read every locale's slug **before** the row disappears.
 *
 * `afterDelete` receives the document resolved for one locale, so its `slug` is
 * a single string. Purging that one string under every locale's tag looks
 * thorough and is wrong: a page stored as `vi: bang-gia` / `en: pricing` would
 * purge `page:en:bang-gia`, which nothing holds, and leave `page:en:pricing`
 * cached — so `/en/pricing` would serve a deleted page until the one-hour floor
 * expired.
 */
export const recordSlugsBeforeDelete =
  (collection: 'pages' | 'services'): CollectionBeforeDeleteHook =>
  async ({ id, req }) => {
    try {
      req.context[deletedSlugsKey(collection, id)] = await slugPerLocale(collection, id, req)
    } catch (error) {
      logger(`${collection}:beforeDelete`).error('could not read slugs', {
        id: String(id),
        reason: error instanceof Error ? error.message : 'unknown',
      })
    }
  }

/**
 * Purge after a delete, so a removed page stops serving.
 *
 * Uses the slugs `recordSlugsBeforeDelete` stashed, because by now the row is
 * gone. If that read failed there is still the one resolved slug to go on,
 * which covers the common single-locale document.
 */
export const revalidateAfterDelete =
  (collection: 'pages' | 'services'): CollectionAfterDeleteHook =>
  async ({ doc, id, req }) => {
    const key = deletedSlugsKey(collection, id)
    const recorded = req.context[key] as Partial<Record<Locale, string>> | undefined

    const fallback: Partial<Record<Locale, string>> = {}
    const resolved = asSlug(doc?.slug)

    if (!recorded && resolved) {
      for (const locale of LOCALES) {
        fallback[locale] = resolved
      }
    }

    delete req.context[key]

    purgeAfterCommit(tagsForSlugs(collection, recorded ?? fallback), `${collection}:afterDelete`)

    return doc
  }

/**
 * The globals the sitemap's own output depends on.
 *
 * `SiteSettings` is in because T-13 takes the home entries' `lastModified` from
 * its `updatedAt` — the home pages are not CMS documents, so there is no
 * document timestamp to use, and `new Date()` would be a fresh one on every
 * request. `BusinessInfo` is out: it contributes neither a URL nor a timestamp.
 *
 * Named rather than purged unconditionally because the two are genuinely
 * different, and because the sitemap route would otherwise be re-rendered by
 * every opening-hours edit for nothing. The extra cost when it does apply is one
 * route: a `globals` purge is already site-wide, which Design.md 1.3 calls
 * correct and rare.
 *
 * This is deliberately explicit rather than left to tag propagation. The sitemap
 * route reads `SiteSettings` through the `globals`-tagged query, so a `globals`
 * purge would very likely reach it anyway — but that depends on Next
 * associating an `unstable_cache` tag with the prerendered route that read it,
 * which is not a behaviour this repo should silently rely on for the one route
 * whose staleness nobody would notice.
 */
const SITEMAP_GLOBALS: ReadonlySet<string> = new Set(['site-settings'])

/** Purge the site-wide tag, and the sitemap where that global feeds it, after a global changes. */
export const revalidateGlobal =
  (name: string): GlobalAfterChangeHook =>
  async ({ doc }) => {
    const tags = SITEMAP_GLOBALS.has(name) ? [GLOBALS_TAG, SITEMAP_TAG] : [GLOBALS_TAG]

    purgeAfterCommit(tags, `${name}:afterChange`)

    return doc
  }
