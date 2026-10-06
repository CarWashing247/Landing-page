import type { PayloadRequest } from 'payload'

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
    },
  },
} as const

export type AdminMessageKey = keyof (typeof adminTranslations)['vi']['custom']

/**
 * The message in the language the editor has their panel set to, falling back
 * to Vietnamese for any language we do not carry.
 */
export const adminMessage = (req: PayloadRequest, key: AdminMessageKey): string => {
  const language = req.i18n?.language
  const locale = typeof language === 'string' && isLocale(language) ? language : DEFAULT_LOCALE

  return adminTranslations[locale].custom[key]
}
