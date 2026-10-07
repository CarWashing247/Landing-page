import type { PayloadRequest } from 'payload'

import type { Locale } from '../lib/locales'
import { DEFAULT_LOCALE, isLocale } from '../lib/locales'

/**
 * This project's own admin-panel messages, in both languages.
 *
 * Payload ships translations for its own UI; these are the strings we add.
 * Hook messages resolve through `req.t` so an editor sees them in whichever
 * language they have the panel set to (AGENT.md 5.6), rather than whichever
 * language the developer happened to type.
 *
 * Keys live under `custom:` to stay clear of Payload's own namespaces.
 *
 * They are registered in `payload.config.ts` so Payload has them, but our own
 * code reads them through `adminMessage()` below rather than `req.t`.
 * `req.t` is typed against Payload's own key union, which is derived from a
 * const rather than an augmentable interface, so a custom key there needs a
 * cast — and AGENT.md section 6 would rather have the types than the idiom.
 */
export const adminTranslations = {
  en: {
    custom: {
      lastAdminCannotBeDeleted:
        'The last administrator cannot be deleted. Create another administrator first.',
      lastAdminCannotChangeRole:
        'The last administrator’s role cannot be changed. Create another administrator first.',
      publishedSlugCannotChange:
        'The address cannot be changed after publishing — the old URL is already indexed by Google and links to it would break. Unpublish it first, or create a new entry.',
      priceMustBeWholeNumber:
        'The price must be a whole number of dong, zero or more — for example 150000. No dots, spaces or ₫.',
      durationMustBeWholeMinutes:
        'The duration must be a whole number of minutes, at least 1.',
      metaTitleTooLong:
        'The Google title cannot be longer than 70 characters. Aim for 50 to 60 — Google cuts it off around there.',
      metaDescriptionTooLong:
        'The description cannot be longer than 180 characters. Aim for 140 to 160 — Google cuts it off around there.',
      onlyOneHero:
        'A page can have only one Hero block, because it is the page’s main heading. Remove the extra one, or change it to another block.',
      /**
       * The home-page hint on the `Pages` slug field (T-17A, A14). The slug is
       * generated from the title, so without this a page titled "Trang chủ"
       * becomes `/trang-chu` and the editor never learns why `/` did not change.
       */
      homeSlugHint:
        'To make this the home page, set the address to "home" in each language. It is then shown at the site root, not at /home.',
      /** The admin dashboard (T-19C). Panel titles mirror the widget labels. */
      dashboardEyebrow: 'Content workspace',
      dashboardTitle: 'Manage your site.',
      dashboardLead: 'Publish pages, maintain services, and review the content visitors see.',
      dashboardCreatePage: 'Create page',
      dashboardPagesBody: 'Build and update landing content with reusable blocks.',
      dashboardServicesBody: 'Keep packages, prices, durations, and included items accurate.',
      dashboardMediaBody: 'Manage images and localized alternative text.',
      /** `{collection}` is the collection's own plural label, lower-cased. */
      dashboardOpenCollection: 'Open {collection} →',
      dashboardRecentTitle: 'Recent content',
      dashboardViewAll: 'View all',
      dashboardRecentEmptyTitle: 'Content appears here when available.',
      dashboardRecentEmptyDetail:
        'Nothing has been created yet. This panel lists real documents only — it does not invent pages, dates, or publication states.',
      dashboardChecklistTitle: 'Editorial checklist',
      dashboardStepLocales: 'Add content in both locales',
      dashboardStepSeo: 'Review SEO fields and social image',
      dashboardStepPreview: 'Check the live preview',
      dashboardStepPublish: 'Publish when ready',
    },
  },
  vi: {
    custom: {
      lastAdminCannotBeDeleted:
        'Không thể xoá quản trị viên cuối cùng. Hãy tạo một quản trị viên khác trước.',
      lastAdminCannotChangeRole:
        'Không thể đổi vai trò của quản trị viên cuối cùng. Hãy tạo một quản trị viên khác trước.',
      publishedSlugCannotChange:
        'Không thể đổi đường dẫn sau khi đã xuất bản — Google đã lập chỉ mục đường dẫn cũ và các liên kết sẽ bị lỗi. Hãy huỷ xuất bản trước, hoặc tạo mục mới.',
      priceMustBeWholeNumber:
        'Giá phải là số nguyên tiền đồng, từ 0 trở lên — ví dụ 150000. Không dùng dấu chấm, dấu cách hay ₫.',
      durationMustBeWholeMinutes:
        'Thời lượng phải là số nguyên phút, ít nhất 1.',
      metaTitleTooLong:
        'Tiêu đề trên Google không được dài hơn 70 ký tự. Nên viết 50 đến 60 ký tự — Google cắt bớt quanh mức đó.',
      metaDescriptionTooLong:
        'Mô tả không được dài hơn 180 ký tự. Nên viết 140 đến 160 ký tự — Google cắt bớt quanh mức đó.',
      onlyOneHero:
        'Mỗi trang chỉ được có một khối mở đầu, vì đó là tiêu đề chính của trang. Hãy xoá bớt một khối hoặc đổi sang loại khác.',
      homeSlugHint: 'TODO(copy): set the address to "home" in each language to make this the home page',
      dashboardEyebrow: 'TODO(copy): content workspace',
      dashboardTitle: 'TODO(copy): manage your site',
      dashboardLead: 'TODO(copy): publish pages, maintain services, review what visitors see',
      dashboardCreatePage: 'TODO(copy): create page',
      dashboardPagesBody: 'TODO(copy): build and update landing content with reusable blocks',
      dashboardServicesBody: 'TODO(copy): keep packages, prices, durations and included items accurate',
      dashboardMediaBody: 'TODO(copy): manage images and localized alternative text',
      dashboardOpenCollection: 'TODO(copy): open {collection} →',
      // Already approved; `payload.config.ts` reads the widget label from here.
      dashboardRecentTitle: 'Nội dung gần đây',
      dashboardViewAll: 'TODO(copy): view all',
      dashboardRecentEmptyTitle: 'TODO(copy): content appears here when available',
      dashboardRecentEmptyDetail:
        'TODO(copy): nothing created yet; this panel lists real documents only and invents nothing',
      // Already approved; `payload.config.ts` reads the widget label from here.
      dashboardChecklistTitle: 'Danh sách kiểm tra',
      dashboardStepLocales: 'TODO(copy): add content in both locales',
      dashboardStepSeo: 'TODO(copy): review SEO fields and social image',
      dashboardStepPreview: 'TODO(copy): check the live preview',
      dashboardStepPublish: 'TODO(copy): publish when ready',
    },
  },
} as const

export type AdminMessageKey = keyof (typeof adminTranslations)['vi']['custom']

/**
 * The message in the language the editor has their panel set to, falling back
 * to Vietnamese for any language we do not carry.
 */
export const adminMessage = (
  req: Pick<PayloadRequest, 'i18n'>,
  key: AdminMessageKey,
  vars: Record<string, string> = {},
): string =>
  Object.entries(vars).reduce(
    (message, [name, value]) => message.replace(`{${name}}`, value),
    adminTranslations[adminLanguage(req)].custom[key] as string,
  )

/** The panel language as one of our locales, Vietnamese for any we do not carry. */
const adminLanguage = (req: Pick<PayloadRequest, 'i18n'>): Locale => {
  const language = req.i18n?.language

  return typeof language === 'string' && isLocale(language) ? language : DEFAULT_LOCALE
}

/**
 * A config label — `{ en, vi }` or a plain string — in the panel language.
 *
 * For reusing wording the config already carries, such as a collection's
 * plural label, rather than copying it into the table above where the two
 * could drift.
 */
export const adminLabel = (
  req: Pick<PayloadRequest, 'i18n'>,
  label: unknown,
  fallback: string,
): string => {
  if (typeof label === 'string') {
    return label
  }

  const value = (label as Partial<Record<Locale, unknown>> | null | undefined)?.[adminLanguage(req)]

  return typeof value === 'string' ? value : fallback
}
