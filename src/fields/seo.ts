import type { CollectionBeforeChangeHook, Field, PayloadRequest } from 'payload'

import type { AdminMessageKey } from '../i18n/admin-translations'
import { adminMessage } from '../i18n/admin-translations'
import { DEFAULT_LOCALE } from '../lib/locales'

/**
 * The SEO field group, defined once and shared by `Pages` and `Services`.
 *
 * This is the task that delivers project goal 2 — editing SEO without a
 * developer and without a deploy — so the wording is the deliverable, not
 * decoration. The six Vietnamese labels are verbatim from Design.md 2.3.
 *
 * `@payloadcms/plugin-seo` supplies the live Google-style preview, the
 * character counters and the title/description/image fields; this file renames
 * them into Vietnamese, sets the length bands, and adds the three fields the
 * plugin does not ship: `canonical`, `noindex` and `keywordFocus`.
 *
 * **No fallback logic lives here.** A blank `meta.title` stays blank so
 * `buildMetadata()` (T-09) can decide what it becomes; putting the fallback in
 * the CMS would mean the stored value and the rendered value disagree, and an
 * editor clearing a field would never get the default back.
 */

/**
 * Warn at 60, block at 70 — two different numbers, from one field.
 *
 * The plugin's counter takes its green band straight from the field's own
 * `minLength`/`maxLength` (`dist/fields/MetaTitle/MetaTitleComponent.js` reads
 * `field.maxLength`), and Payload enforces that same `maxLength` as a hard
 * limit. T-08 asks for a warning past 60 while still allowing up to 70, so the
 * two numbers have to be separated.
 *
 * So `maxLength` here drives the **counter only**, and the real limit is
 * enforced by `validate` — deliberately relying on the fact that a supplied
 * `validate` replaces Payload's default field validation rather than adding to
 * it. That is the same mechanism that silently removed `required` in T-07, used
 * on purpose this time.
 *
 * The consequence to know: **`maxLength` on these two fields does not block.**
 * Delete the `validate` and the limit tightens to the counter's number rather
 * than disappearing, which is the safe direction for a mistake to fall.
 */
const lengthLimit =
  (hardLimit: number, messageKey: AdminMessageKey) =>
  (value: string | null | undefined, options: { req: PayloadRequest }): string | true =>
    typeof value === 'string' && value.length > hardLimit
      ? adminMessage(options.req, messageKey)
      : true

/**
 * The three fields the plugin does not ship.
 *
 * `canonical` and `keywordFocus` are localized for the same reason the slug is:
 * each locale is its own page with its own URL and its own keyword. `noindex` is
 * localized because hiding the English translation while the Vietnamese page
 * ranks is exactly the case the guardrail below exists for.
 */
const customFields: Field[] = [
  {
    name: 'canonical',
    type: 'text',
    localized: true,
    label: {
      vi: 'Để trống nếu không biết — hệ thống tự điền',
      en: 'Canonical URL — leave blank unless you know otherwise',
    },
    admin: {
      description: {
        vi:
          'Bình thường hãy để trống. Hệ thống tự điền đúng đường dẫn của trang ' +
          'này. Chỉ điền khi nội dung này đã tồn tại ở một địa chỉ khác và bạn ' +
          'muốn Google tính điểm cho địa chỉ đó.',
        en:
          'Normally leave this blank — the system fills in this page’s own ' +
          'address. Only set it when the same content already lives at another ' +
          'URL and you want Google to credit that one instead.',
      },
    },
  },
  {
    name: 'noindex',
    type: 'checkbox',
    localized: true,
    label: { vi: 'Ẩn trang này khỏi Google', en: 'Hide this page from Google' },
    admin: {
      description: {
        vi:
          'Trang vẫn hoạt động bình thường, chỉ không xuất hiện trong kết quả ' +
          'tìm kiếm. Hệ thống tự bật mục này cho bản dịch chưa có tiêu đề và mô ' +
          'tả SEO riêng.',
        en:
          'The page still works normally, it just will not appear in search ' +
          'results. The system turns this on by itself for a translation that ' +
          'has no SEO title or description of its own yet.',
      },
    },
  },
  {
    name: 'keywordFocus',
    type: 'text',
    localized: true,
    label: {
      vi: 'Từ khoá chính — chỉ để ghi nhớ, không ảnh hưởng thứ hạng',
      en: 'Focus keyword — a note to yourselves, it does not affect ranking',
    },
    admin: {
      description: {
        vi:
          'Không được gửi cho Google và không ảnh hưởng thứ hạng. Mục đích duy ' +
          'nhất là để hai người viết không nhắm cùng một từ khoá cho hai trang ' +
          'khác nhau.',
        en:
          'Never sent to Google and has no effect on ranking. Its only job is to ' +
          'stop two editors writing two different pages against the same term.',
      },
    },
  },
]

/**
 * Rename the plugin's own fields into Vietnamese and set the length bands.
 *
 * The plugin's defaults are 50–60 for the title and 100–150 for the
 * description; Design.md 2.3 wants 140–160 for the description, so the band is
 * reset rather than inherited.
 */
const overrides: Record<string, Partial<Field>> = {
  title: {
    label: {
      vi: 'Tiêu đề trên Google — 50 đến 60 ký tự',
      en: 'Title on Google — 50 to 60 characters',
    },
    minLength: 50,
    // Drives the counter. The hard limit of 70 is in `validate` — see above.
    maxLength: 60,
    validate: lengthLimit(70, 'metaTitleTooLong'),
  } as Partial<Field>,
  description: {
    label: {
      vi: 'Mô tả dưới tiêu đề — 140 đến 160 ký tự',
      en: 'Description under the title — 140 to 160 characters',
    },
    minLength: 140,
    maxLength: 160,
    validate: lengthLimit(180, 'metaDescriptionTooLong'),
  } as Partial<Field>,
  image: {
    label: {
      vi: 'Ảnh khi chia sẻ lên Facebook/Zalo — 1200×630',
      en: 'Image for Facebook/Zalo shares — 1200×630',
    },
    admin: {
      description: {
        vi:
          'Ảnh hiển thị khi ai đó chia sẻ trang. Để trống thì dùng ảnh mặc định ' +
          'trong Cài đặt trang web. Bản 1200×630 được tạo tự động khi tải lên.',
        en:
          'The image shown when someone shares this page. Left blank, the default ' +
          'from Site settings is used. The 1200×630 version is generated on upload.',
      },
    },
  } as Partial<Field>,
}

/**
 * Passed to the plugin as its `fields` override: renames what it ships and
 * appends what it does not.
 */
export const seoFields = ({ defaultFields }: { defaultFields: Field[] }): Field[] => [
  ...defaultFields.map((field) => {
    const name = 'name' in field ? field.name : undefined
    const override = name ? overrides[name] : undefined

    // The Overview and Preview fields are unnamed UI fields; they pass through.
    return override ? ({ ...field, ...override } as Field) : field
  }),
  ...customFields,
]

/**
 * Force `noindex` on a translation that has no SEO text of its own.
 *
 * Design.md 2.3 asks for this, and the reason is specific: Payload's field-level
 * fallback means an English page with an empty SEO tab renders *Vietnamese* text
 * under an `/en/` URL. That is thin duplicate content competing with the page it
 * was copied from, which is worse than not existing. T-13 drops `noindex` routes
 * from the sitemap, so one checkbox is the whole mechanism — no new concept in
 * the handover.
 *
 * **Scoped to non-default locales, which Design.md 2.3 does not say.** Read
 * literally — "a locale whose `meta.title` and `meta.description` are both
 * empty" — it would also fire on every Vietnamese page, because an empty SEO tab
 * is the normal and expected state there: Design.md 2.3 itself says a page must
 * ship fine with the editor never opening it, and `buildMetadata()` fills the
 * gap. Applying it to `vi` would quietly de-index the entire site, one page at a
 * time. So the default locale is exempt, and the flag is explained in the task
 * file rather than left as a surprise.
 *
 * Only ever turns the flag **on**. An editor who ticked it by hand keeps it
 * ticked after translating, because un-ticking someone's deliberate choice is
 * not this hook's business.
 */
export const forceNoindexWhenUntranslated =
  (collection: 'pages' | 'services'): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, req }) => {
    const { locale } = req

    if (!locale || locale === 'all' || locale === DEFAULT_LOCALE) {
      return data
    }

    const incoming = (data as { meta?: { description?: unknown; title?: unknown } }).meta

    /**
     * A partial update may not carry `meta` at all, and `originalDoc` is
     * fallback-resolved — it would show the Vietnamese title under `en` and make
     * an untranslated page look translated. So the stored values are read for
     * this locale with the fallback off, the same way the slug lock does it.
     */
    let title = incoming?.title
    let description = incoming?.description

    if (incoming === undefined && originalDoc?.id !== undefined) {
      const stored = await req.payload.findByID({
        collection,
        id: originalDoc.id as number | string,
        depth: 0,
        fallbackLocale: false,
        locale,
        overrideAccess: true,
        req,
      })

      const storedMeta = (stored as { meta?: { description?: unknown; title?: unknown } } | undefined)
        ?.meta

      title = storedMeta?.title
      description = storedMeta?.description
    }

    const isEmpty = (value: unknown): boolean =>
      value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

    if (isEmpty(title) && isEmpty(description)) {
      return {
        ...data,
        meta: { ...(incoming ?? {}), noindex: true },
      }
    }

    return data
  }
