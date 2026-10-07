import type {
  CollectionAfterChangeHook,
  CollectionSlug,
  Field,
  FieldHook,
  PayloadRequest,
} from 'payload'
import { APIError } from 'payload'

import type { AdminMessageKey } from '../i18n/admin-translations'
import { adminMessage, adminTranslations } from '../i18n/admin-translations'
import { logger } from './log'
import { LOCALES } from './locales'
import { slugify } from './slugify'

/**
 * The published-slug lock, as one field definition two collections share.
 *
 * `Pages` (T-06) and `Services` (T-07) have the same requirement and the same
 * three traps, and the traps are the argument for sharing rather than copying:
 * each was found by testing, none is visible from reading the field config, and
 * a second copy would be a second chance to get one of them wrong. T-07's task
 * says it outright — reuse the T-06 helper and hook, do not reimplement.
 *
 * **Why the slug locks at all.** Changing the slug of a published document
 * breaks every indexed URL and every link anyone has shared, and no undo reaches
 * Google's index or someone's Zalo message. Version history is what makes the
 * lock acceptable to an editor (AGENT.md 5.6): they can undo a content mistake,
 * so they never need to undo a URL mistake.
 */

/**
 * Restoring a version is the one write allowed to set a published slug.
 *
 * A denied field is **stripped** from the incoming data, so refusing the slug
 * during a restore left it empty and `required` then failed the whole operation:
 * rolling back a published document answered 400 "Address (slug) is required",
 * naming a field the editor never touched. And rollback is the safety net that
 * justified the lock in the first place, so taking it away to protect the URL
 * removes the reason the lock was acceptable.
 *
 * A restore cannot smuggle in a new URL: it only writes a slug the document
 * already had.
 *
 * The flag is set by Payload immediately before it runs field hooks —
 * `node_modules/payload/dist/collections/operations/restoreVersion.js`,
 * `req.context.isRestoringVersion = true`. Re-check it on a major upgrade.
 */
const isRestoringVersion = (req: PayloadRequest): boolean =>
  req.context?.isRestoringVersion === true

/** A published document's slug is frozen. Drafts, never-published ones included, are not. */
const isPublished = (doc: { _status?: string | null } | undefined): boolean =>
  doc?._status === 'published'

/**
 * The slug stored for one locale, with the locale fallback switched off.
 *
 * `localization.fallback` is on, so asking for a document in English returns the
 * *Vietnamese* slug wherever English has none. Anything comparing against that
 * value treats a first English slug as an edit to an existing one — and the
 * consequence is not cosmetic: a document published in Vietnamese could never be
 * given its English URL at all, which is precisely the `/bang-gia` +
 * `/en/pricing` split Design.md 1.1a is built on. Found by testing the second
 * locale; testing only the default locale hides it completely.
 *
 * `undefined` means this locale has no slug of its own yet.
 */
const storedSlugForLocale = async (
  collection: CollectionSlug,
  req: PayloadRequest,
  id: number | string | undefined,
): Promise<string | undefined> => {
  const { locale } = req

  // `all` returns every locale at once, so there is no single value to compare.
  if (id === undefined || !locale || locale === 'all') {
    return undefined
  }

  const doc = await req.payload.findByID({
    collection,
    id,
    depth: 0,
    fallbackLocale: false,
    locale,
    overrideAccess: true,
    // Joins the surrounding transaction rather than opening its own.
    req,
  })

  const slug = (doc as { slug?: unknown } | undefined)?.slug

  return typeof slug === 'string' && slug.length > 0 ? slug : undefined
}

/**
 * Fill the slug from its source field on create, per locale.
 *
 * Only when empty: an editor who typed a slug by hand meant it, and silently
 * rewriting it from the title would be the CMS arguing with them.
 */
const generateSlug =
  (from: string): FieldHook =>
  ({ data, operation, siblingData, value }) => {
    if (typeof value === 'string' && value.length > 0) {
      return slugify(value)
    }

    if (operation !== 'create') {
      return value
    }

    const source = (data?.[from] ?? (siblingData as Record<string, unknown>)?.[from]) as unknown

    return typeof source === 'string' && source.length > 0 ? slugify(source) : value
  }

/**
 * Refuse a slug change on a published document.
 *
 * This exists alongside the field-level `access.update` below, and neither is
 * redundant. Field access makes the admin render the input read-only and stops
 * the write, but a denied field is dropped rather than reported — the API would
 * answer 200 having quietly ignored the change, and the caller would believe it
 * worked. This hook is what turns that into a 4xx with a reason an editor can
 * read.
 *
 * `APIError(..., 400, null, true)` rather than a bare `throw`: a bare Error
 * surfaces as a 500 "Something went wrong." and the reason never reaches the
 * editor (AGENT.md 5.6).
 */
const refuseChangeWhenPublished =
  (collection: CollectionSlug): FieldHook =>
  async ({ operation, originalDoc, req, value }) => {
    if (operation !== 'update' || !isPublished(originalDoc)) {
      return value
    }

    // A restore is allowed through; `recordSlugsAfterRestore` is what keeps it
    // from being silent. It cannot be logged from here: during a restore Payload
    // runs field hooks for the default locale only, so this hook never sees a
    // second locale's slug being cleared.
    if (isRestoringVersion(req)) {
      return value
    }

    const previous = await storedSlugForLocale(
      collection,
      req,
      originalDoc?.id as number | string | undefined,
    )

    if (previous === undefined || value === previous) {
      return value
    }

    throw new APIError(adminMessage(req, 'publishedSlugCannotChange'), 400, null, true)
  }

/**
 * Whether the slug may still be written: yes while the document is a draft, yes
 * during a restore, and yes for a locale with no slug of its own yet, because
 * that is a translation being written for the first time rather than a URL being
 * changed.
 */
const slugIsStillWritable = async (
  collection: CollectionSlug,
  doc: { _status?: string | null; id?: number | string } | undefined,
  req: PayloadRequest,
): Promise<boolean> => {
  if (isRestoringVersion(req) || !isPublished(doc)) {
    return true
  }

  return (await storedSlugForLocale(collection, req, doc?.id)) === undefined
}

/**
 * Record what a version restore did to a document's URLs.
 *
 * Restoring a version from before a locale was translated **clears that
 * locale's slug**, because the version genuinely holds no value for it. So an
 * editor rolling back a Vietnamese typo can retire a live, indexed
 * `/en/pricing` — the one outcome the lock exists to prevent, reached through
 * the one door the lock has to leave open.
 *
 * Refusing the restore is the wrong trade, so it is recorded instead — per
 * locale, after the fact — because a URL that quietly stopped resolving is
 * otherwise diagnosed from the outside, weeks later, by someone reading Search
 * Console. **T-11 and T-13 must treat a slug that disappeared as a URL that
 * changed.**
 *
 * Read with `locale: 'all'`, the only way to see every locale at once: the
 * hook's own `doc` is hoisted to a single locale, which is exactly how this
 * stayed invisible in the first place.
 */
export const recordSlugsAfterRestore =
  (collection: CollectionSlug): CollectionAfterChangeHook =>
  async ({ doc, req }) => {
    if (!isRestoringVersion(req)) {
      return doc
    }

    const everyLocale = await req.payload.findByID({
      collection,
      id: doc.id as number | string,
      depth: 0,
      fallbackLocale: false,
      locale: 'all',
      overrideAccess: true,
      req,
    })

    /**
     * With `locale: 'all'` a localized field comes back as an object keyed by
     * locale. The generated types do not model that — they type `slug` as the
     * single resolved string — so the cast goes through `unknown`. It is the
     * shape at runtime, not a guess: it is why this read exists.
     */
    const slugs =
      (everyLocale as unknown as { slug?: Record<string, string | null> } | undefined)?.slug ?? {}

    logger(`${collection}:restore`)
      .forRequest(req.headers)
      .info('restored a version; addresses are now', {
        document: doc.id as number | string,
        status: doc._status as string | undefined,
        ...Object.fromEntries(LOCALES.map((code) => [code, slugs[code] ?? '(none)'])),
      })

    return doc
  }

/**
 * The localized, unique, published-locked slug field.
 *
 * @param collection the collection it belongs to — needed to read the stored
 *   per-locale value back
 * @param from the field the slug is generated from on create (`title`, `name`)
 * @param example a slug to show the editor, in that collection's shape
 * @param hint an extra sentence for this collection's editors, appended to the
 *   help text in both languages
 */
export const slugField = ({
  collection,
  example,
  from,
  hint,
}: {
  collection: CollectionSlug
  example: string
  from: string
  hint?: AdminMessageKey
}): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  // Separate per locale: `bang-gia` and `pricing` are separate documents' worth
  // of keyword value, not translations of each other (Design.md 1.1a).
  localized: true,
  // Unique per locale — the generated index is on (slug, _locale) — so the same
  // slug may exist once in Vietnamese and once in English, never twice in one.
  unique: true,
  index: true,
  label: { en: 'Address (slug)', vi: 'Đường dẫn (slug)' },
  access: {
    /**
     * Makes the admin render the input read-only and stops the write. `doc` is
     * the document before the update and is undefined on create, so a new
     * document is always editable. A published one is not — except in a locale
     * that has no slug yet, or the admin panel would offer no way to give a
     * published document its English URL.
     */
    update: ({ doc, req }) => slugIsStillWritable(collection, doc, req),
  },
  hooks: {
    // Generate first, then police the result: a hand-typed slug is normalised
    // before the lock compares it, so `Bang Gia` and `bang-gia` are not treated
    // as a change.
    beforeValidate: [generateSlug(from), refuseChangeWhenPublished(collection)],
  },
  admin: {
    position: 'sidebar',
    description: {
      en:
        `The part of the URL after the domain, for example "${example}". Left ` +
        'blank, it is generated automatically. Each language has its own ' +
        'address. Once published this cannot be changed, because the old URL is ' +
        'already indexed.' +
        (hint ? ` ${adminTranslations.en.custom[hint]}` : ''),
      vi:
        `Phần URL sau tên miền, ví dụ "${example}". Để trống thì hệ thống tự ` +
        'tạo. Mỗi ngôn ngữ có đường dẫn riêng. Sau khi xuất bản thì không đổi ' +
        'được, vì đường dẫn cũ đã được lập chỉ mục.' +
        (hint ? ` ${adminTranslations.vi.custom[hint]}` : ''),
    },
  },
})
