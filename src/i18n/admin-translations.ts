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
        'The address of a published page cannot be changed — the old URL is already indexed by Google and links to it would break. Unpublish it first, or create a new page.',
    },
  },
  vi: {
    custom: {
      lastAdminCannotBeDeleted:
        'Không thể xoá quản trị viên cuối cùng. Hãy tạo một quản trị viên khác trước.',
      lastAdminCannotChangeRole:
        'Không thể đổi vai trò của quản trị viên cuối cùng. Hãy tạo một quản trị viên khác trước.',
      publishedSlugCannotChange:
        'Không thể đổi đường dẫn của trang đã xuất bản — Google đã lập chỉ mục đường dẫn cũ và các liên kết tới trang sẽ bị lỗi. Hãy huỷ xuất bản trước, hoặc tạo một trang mới.',
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
