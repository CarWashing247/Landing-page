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
/**
 * Apply an override without throwing away what the plugin put there.
 *
 * A plain `{ ...field, ...override }` is shallow, and every one of the plugin's
 * fields keeps its custom React component under `admin.components`. Overriding
 * `admin` to add a description replaced that object wholesale and silently
 * unmounted the component: `MetaImageComponent` disappeared from the generated
 * import map — no thumbnail, no generate button — while the field still looked
 * configured. Caught by reading the import map, not the config.
 */
const applyOverride = (field: Field, override: Partial<Field>): Field => {
  const fieldAdmin = ('admin' in field ? field.admin : undefined) ?? {}
  const overrideAdmin = ('admin' in override ? override.admin : undefined) ?? {}

  return {
    ...field,
    ...override,
    admin: {
      ...fieldAdmin,
      ...overrideAdmin,
      // The plugin's component is the whole point of using the plugin.
      ...('components' in fieldAdmin ? { components: fieldAdmin.components } : {}),
    },
  } as Field
}

export const seoFields = ({ defaultFields }: { defaultFields: Field[] }): Field[] => [
  ...defaultFields.map((field) => {
    // Every field the plugin ships is named, `overview` and `preview` included,
    // so each one reaches this lookup; only the three in `overrides` are touched.
    const name = 'name' in field ? field.name : undefined
    const override = name ? overrides[name] : undefined

    return override ? applyOverride(field, override) : field
  }),
  ...customFields,
]

/**
 * Keep an untranslated translation out of Google, and let it back in the moment
 * it is translated.
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
 * time. So the default locale is exempt.
 *
 * **`data.meta` is the whole group, not the editor's delta.** Payload merges the
 * stored document into it before this hook runs — verified by logging it — so
 * every key is always present and `'noindex' in data.meta` says nothing about
 * what the editor touched. Anything built on key presence silently does the
 * wrong thing: an attempt to "respect an explicit choice" that way treated the
 * stored value as a fresh decision and the auto-flag was never released. What
 * *is* reliable is comparing the incoming group against what this locale already
 * holds, which is what the stored read below is for.
 *
 * So the rule is a transition, not a state:
 *
 *  - **While untranslated, `noindex` is forced on.** Including over an attempt to
 *    clear it, because letting it be cleared is the outcome being prevented.
 *  - **On the single transition from untranslated to translated**, an auto-set
 *    flag is released, which is Design.md's "becomes indexable by itself".
 *  - **Afterwards the hook never touches it again**, so an editor who hides a
 *    translated page by hand keeps it hidden.
 */
export const forceNoindexWhenUntranslated =
  (collection: 'pages' | 'services'): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, req }) => {
    const { locale } = req

    if (!locale || locale === 'all' || locale === DEFAULT_LOCALE) {
      return data
    }

    const incoming = (data as { meta?: Record<string, unknown> }).meta ?? {}

    /**
     * What this locale already holds, read with the fallback off.
     *
     * `originalDoc` cannot answer it: it is fallback-resolved, so it shows the
     * Vietnamese title under `en` and makes an untranslated page look
     * translated. `draft: true` so the draft being edited is read rather than the
     * last published row — otherwise translating a draft looks like no change.
     */
    const stored =
      originalDoc?.id === undefined
        ? undefined
        : ((await req.payload.findByID({
            collection,
            id: originalDoc.id as number | string,
            depth: 0,
            draft: true,
            fallbackLocale: false,
            locale,
            overrideAccess: true,
            req,
          })) as { meta?: Record<string, unknown> } | undefined)

    const storedMeta = stored?.meta ?? {}

    const isEmpty = (value: unknown): boolean =>
      value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

    const hasNoSeoText = (meta: Record<string, unknown>): boolean =>
      isEmpty(meta.title) && isEmpty(meta.description)

    const nowUntranslated = hasNoSeoText(incoming)

    if (nowUntranslated) {
      return storedMeta.noindex === true && incoming.noindex === true
        ? data
        : { ...data, meta: { ...incoming, noindex: true } }
    }

    // The one transition: it had no SEO text, it does now, and the flag on it was
    // this hook's doing.
    if (hasNoSeoText(storedMeta) && storedMeta.noindex === true) {
      return { ...data, meta: { ...incoming, noindex: false } }
    }

    return data
  }
