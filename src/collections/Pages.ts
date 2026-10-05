import type { CollectionAfterChangeHook, CollectionConfig, FieldHook, PayloadRequest } from 'payload'
import { APIError } from 'payload'

import { adminMessage } from '../i18n/admin-translations'
import { isAdmin, isAdminOrEditor, publishedOrStaff } from '../lib/access'
import { logger } from '../lib/log'
import { LOCALES } from '../lib/locales'
import { slugify } from '../lib/slugify'

/**
 * Editable pages, as a stack of blocks, with drafts and version history.
 *
 * **The slug lock is the point of this collection.** Changing the slug of a
 * published page breaks every indexed URL and every link anyone has shared, and
 * there is no undo that reaches Google's index or someone's Zalo message. So the
 * CMS makes it impossible rather than merely inadvisable.
 *
 * Version history is what makes that acceptable to an editor (AGENT.md 5.6):
 * they can undo a content mistake, so they never need to undo a URL mistake.
 *
 * `title`, `slug` and `layout` are **localized** (Design.md 2.1). Slugs
 * especially: `bang-gia` and `pricing` are separate documents' worth of keyword
 * value, not a translation of one another. Localization is a schema decision —
 * Payload stores localized values in their own table — which is why T-04A had
 * to land before this task.
 *
 * The SEO tab is deliberately absent. T-08 owns it, and a stubbed `meta` field
 * here would be a migration for T-08 to undo.
 */

/**
 * Restoring a version is the one write that may set a published page's slug.
 *
 * Two reasons, and the first was found the hard way. A denied field is
 * **stripped** from the incoming data, so refusing the slug during a restore
 * left it empty and `required` then failed the whole operation: rolling back a
 * published page answered 400 "Address (slug) is required", naming a field the
 * editor never touched. Version history is also precisely what makes the slug
 * lock acceptable to an editor (AGENT.md 5.6) — taking rollback away to protect
 * the URL removes the safety net that justified the lock.
 *
 * It cannot smuggle in a new URL either: a restore can only write a slug this
 * document already had.
 *
 * The flag is set by Payload immediately before it runs field hooks —
 * `node_modules/payload/dist/collections/operations/restoreVersion.js`,
 * `req.context.isRestoringVersion = true`. Re-check it on a major upgrade.
 */
const isRestoringVersion = (req: PayloadRequest): boolean =>
  req.context?.isRestoringVersion === true

/** A published page's slug is frozen. Drafts, including never-published ones, are not. */
const isPublished = (doc: { _status?: string | null } | undefined): boolean =>
  doc?._status === 'published'

/**
 * Fill the slug from the title on create, per locale.
 *
 * Only when empty: an editor who typed a slug by hand meant it, and silently
 * rewriting it from the title would be the CMS arguing with them.
 */
const generateSlugFromTitle: FieldHook = ({ data, operation, siblingData, value }) => {
  if (typeof value === 'string' && value.length > 0) {
    return slugify(value)
  }

  if (operation !== 'create') {
    return value
  }

  const title = (data?.title ?? (siblingData as { title?: unknown })?.title) as unknown

  return typeof title === 'string' && title.length > 0 ? slugify(title) : value
}

/**
 * Refuse a slug change on a published page.
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
/**
 * The slug stored for one locale, with the locale fallback switched off.
 *
 * This read is unavoidable, and the reason is worth stating once for both
 * callers below. `localization.fallback` is on, so asking for a page in English
 * returns the *Vietnamese* slug wherever English has none. Anything that
 * compares against that value treats a first English slug as an edit to an
 * existing one — and the consequence is not cosmetic: a page published in
 * Vietnamese could never be given its English URL at all, which is precisely
 * the `/bang-gia` + `/en/pricing` split Design.md 1.1a is built on. Found by
 * testing the second locale; testing only the first locale hides it completely.
 *
 * `undefined` means this locale has no slug of its own yet.
 */
const storedSlugForLocale = async (
  req: PayloadRequest,
  id: number | string | undefined,
): Promise<string | undefined> => {
  const { locale } = req

  // `all` returns every locale at once, so there is no single value to compare.
  if (id === undefined || !locale || locale === 'all') {
    return undefined
  }

  const doc = await req.payload.findByID({
    collection: 'pages',
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
 * Whether the slug may still be written: yes while the page is a draft, and yes
 * for a locale that has no slug of its own yet, because that is a translation
 * being written for the first time rather than a URL being changed.
 */
const slugIsStillWritable = async (
  doc: { _status?: string | null; id?: number | string } | undefined,
  req: PayloadRequest,
): Promise<boolean> => {
  if (isRestoringVersion(req) || !isPublished(doc)) {
    return true
  }

  return (await storedSlugForLocale(req, doc?.id)) === undefined
}

/**
 * Refuse a slug change on a published page.
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
const refuseSlugChangeWhenPublished: FieldHook = async ({
  operation,
  originalDoc,
  req,
  value,
}) => {
  if (operation !== 'update' || !isPublished(originalDoc)) {
    return value
  }

  // A restore is allowed through; `recordSlugsAfterRestore` below is what keeps
  // it from being silent. It cannot be logged from here: during a restore
  // Payload runs field hooks for the default locale only, so this hook never
  // sees a second locale's slug being cleared.
  if (isRestoringVersion(req)) {
    return value
  }

  const previous = await storedSlugForLocale(req, originalDoc?.id as number | string | undefined)

  if (previous === undefined || value === previous) {
    return value
  }

  throw new APIError(adminMessage(req, 'publishedSlugCannotChange'), 400, null, true)
}

/**
 * Record what a version restore did to this page's URLs.
 *
 * Restoring a version from before a locale was translated **clears that
 * locale's slug**, because the version genuinely holds no value for it. So an
 * editor rolling back a Vietnamese typo can retire a live, indexed
 * `/en/pricing` — the one outcome the lock exists to prevent, reached through
 * the one door the lock has to leave open.
 *
 * Refusing the restore is the wrong trade: version history is what makes the
 * lock acceptable in the first place (AGENT.md 5.6), and removing rollback to
 * protect a URL takes away the safety net that justified the lock. So it is
 * recorded instead — per locale, after the fact — because a URL that quietly
 * stopped resolving is otherwise diagnosed from the outside, weeks later, by
 * someone looking at Search Console. **T-11 and T-13 must treat a slug that
 * disappeared as a URL that changed.**
 *
 * Read with `locale: 'all'`, which is the only way to see every locale at once:
 * the hook's own `doc` is hoisted to a single locale, which is exactly how this
 * stayed invisible in the first place.
 */
const recordSlugsAfterRestore: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (!isRestoringVersion(req)) {
    return doc
  }

  const everyLocale = await req.payload.findByID({
    collection: 'pages',
    id: doc.id as number | string,
    depth: 0,
    fallbackLocale: false,
    locale: 'all',
    overrideAccess: true,
    req,
  })

  /**
   * With `locale: 'all'` a localized field comes back as an object keyed by
   * locale. The generated `Page` type does not model that — it types `slug` as
   * the single resolved string — so the cast goes through `unknown`. It is the
   * shape at runtime, not a guess: it is why this read exists.
   */
  const slugs =
    (everyLocale as unknown as { slug?: Record<string, string | null> } | undefined)?.slug ?? {}

  logger('pages:restore')
    .forRequest(req.headers)
    .info('restored a version; addresses are now', {
      page: doc.id as number | string,
      status: doc._status as string | undefined,
      ...Object.fromEntries(LOCALES.map((code) => [code, slugs[code] ?? '(none)'])),
    })

  return doc
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: { en: 'Page', vi: 'Trang' },
    plural: { en: 'Pages', vi: 'Các trang' },
  },
  admin: {
    useAsTitle: 'title',
    // What an editor needs to identify a row: what it is, where it lives,
    // whether it is live, and whether someone changed it recently.
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    description: {
      en:
        'Pages are built from blocks. Save as draft while you work — nothing is ' +
        'public until you press Publish. The address cannot be changed once a ' +
        'page is published.',
      vi:
        'Trang được tạo từ các khối nội dung. Hãy lưu bản nháp trong khi làm — ' +
        'chưa có gì công khai cho đến khi bấm Xuất bản. Không thể đổi đường dẫn ' +
        'sau khi trang đã xuất bản.',
    },
  },
  access: {
    // Published only for the public; drafts would otherwise be served to
    // visitors and crawlers by a plain `anyone`.
    read: publishedOrStaff,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    // Deleting a published page is a dead URL. Editors unpublish instead.
    delete: isAdmin,
  },
  hooks: {
    afterChange: [recordSlugsAfterRestore],
  },
  versions: {
    drafts: true,
    // Enough history to undo a bad afternoon without keeping every keystroke
    // of a page's life in Postgres forever.
    maxPerDoc: 50,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      label: { en: 'Title', vi: 'Tiêu đề' },
      admin: {
        description: {
          en: 'Shown as the page heading, and used to suggest the address below.',
          vi: 'Hiển thị làm tiêu đề trang, và dùng để gợi ý đường dẫn bên dưới.',
        },
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      localized: true,
      unique: true,
      index: true,
      label: { en: 'Address (slug)', vi: 'Đường dẫn (slug)' },
      access: {
        /**
         * Makes the admin render the input read-only and stops the write. `doc`
         * is the document before the update and is undefined on create, so a new
         * page is always editable. A published page is not — except in a locale
         * that has no slug yet, or the admin panel would offer no way to give a
         * published page its English URL.
         */
        update: ({ doc, req }) => slugIsStillWritable(doc, req),
      },
      hooks: {
        // Generate first, then police the result: a hand-typed slug is
        // normalised before the lock compares it, so `Bang Gia` and `bang-gia`
        // are not treated as a change.
        beforeValidate: [generateSlugFromTitle, refuseSlugChangeWhenPublished],
      },
      admin: {
        position: 'sidebar',
        description: {
          en:
            'The part of the URL after the domain, for example "bang-gia". Left ' +
            'blank, it is generated from the title. Each language has its own ' +
            'address. Once the page is published this cannot be changed, because ' +
            'the old URL is already indexed.',
          vi:
            'Phần URL sau tên miền, ví dụ "bang-gia". Để trống thì hệ thống tự ' +
            'tạo từ tiêu đề. Mỗi ngôn ngữ có đường dẫn riêng. Sau khi xuất bản ' +
            'thì không đổi được, vì đường dẫn cũ đã được lập chỉ mục.',
        },
      },
    },
    {
      name: 'layout',
      type: 'blocks',
      localized: true,
      label: { en: 'Content', vi: 'Nội dung' },
      labels: {
        singular: { en: 'Block', vi: 'Khối' },
        plural: { en: 'Blocks', vi: 'Các khối' },
      },
      admin: {
        description: {
          en: 'Add and reorder blocks to build the page.',
          vi: 'Thêm và sắp xếp các khối để tạo nên trang.',
        },
      },
      /**
       * One block, deliberately.
       *
       * T-17 owns the real set (Hero, Pricing, Steps, Faq, Cta). An empty
       * `blocks: []` would type-check and then hand an editor a content field
       * with nothing to put in it, so the layout could not be exercised at all
       * before T-17 lands — including by T-23's seed data. Rich text is the one
       * block that survives whatever T-17 decides, so it is not throwaway.
       */
      blocks: [
        {
          slug: 'content',
          labels: {
            singular: { en: 'Text', vi: 'Văn bản' },
            plural: { en: 'Text blocks', vi: 'Các khối văn bản' },
          },
          fields: [
            {
              name: 'richText',
              type: 'richText',
              required: true,
              label: { en: 'Text', vi: 'Văn bản' },
            },
          ],
        },
      ],
    },
  ],
}
