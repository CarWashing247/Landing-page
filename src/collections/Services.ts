import type { CollectionConfig, PayloadRequest } from 'payload'

import type { AdminMessageKey } from '../i18n/admin-translations'
import { adminMessage } from '../i18n/admin-translations'
import { isAdmin, isAdminOrEditor, publishedOrStaff } from '../lib/access'
import { forceNoindexWhenUntranslated } from '../fields/seo'
import { recordSlugsAfterRestore, slugField } from '../lib/slug-field'

/**
 * A whole number, at or above `minimum`, and present when the field says so.
 *
 * All three checks are here because **a user-supplied `validate` replaces
 * Payload's default field validation rather than adding to it** — it is
 * installed only when `field.validate === undefined`
 * (`node_modules/payload/dist/fields/config/sanitize.js`), and
 * `validations.number` is the only place `min` and `required` are enforced.
 *
 * That trap bit twice, both times found by testing rather than reading:
 *
 *  1. with only an integer check here, `min` stopped applying and the API took
 *     `durationMinutes: 0`, `-5` and `price: -1` with a 201;
 *  2. `required` stopped applying too, so a service could be created and
 *     published with `price: null` while `payload-types.ts` promises a
 *     `number` — T-14's JSON-LD `Offer` and T-18's page would both read null.
 *
 * `required` is read from the options rather than hard-coded, because Payload
 * spreads the field config into them. Drafts stay saveable while incomplete:
 * Payload skips the whole `validate` call for a draft
 * (`skipValidation: isSavingDraft`), so this only ever runs on publish.
 *
 * Integers, because Payload maps a `number` field to Postgres `numeric`, so
 * `150000.5` stores and round-trips happily and then reaches Google as a price
 * it reads literally. Dong has no subunit in practice and a wash is not timed to
 * the half minute, so a fractional value here is always a typo.
 */
const wholeNumberAtLeast =
  (minimum: number, messageKey: AdminMessageKey) =>
  (
    value: number | null | undefined,
    options: { req: PayloadRequest; required?: boolean },
  ): string | true => {
    if (value === null || value === undefined) {
      // Payload's own string, so it matches every other required field's
      // wording in whichever language the panel is set to.
      return options.required ? options.req.t('validation:required') : true
    }

    return Number.isInteger(value) && value >= minimum
      ? true
      : adminMessage(options.req, messageKey)
  }

export const Services: CollectionConfig = {
  slug: 'services',
  labels: {
    singular: { en: 'Service', vi: 'Dịch vụ' },
    plural: { en: 'Services', vi: 'Các dịch vụ' },
  },
  admin: {
    useAsTitle: 'name',
    // Price and duration are what an editor compares across rows; they are the
    // reason to open the list at all.
    defaultColumns: ['name', 'price', 'durationMinutes', '_status', 'updatedAt'],
    description: {
      en:
        'One entry per wash package. Each becomes its own page, and its price ' +
        'and duration are also sent to Google as structured data.',
      vi:
        'Mỗi gói rửa xe một mục. Mỗi mục trở thành một trang riêng, và giá cùng ' +
        'thời lượng cũng được gửi cho Google dưới dạng dữ liệu có cấu trúc.',
    },
  },
  access: {
    // Published only for the public; a plain `anyone` on a drafted collection
    // serves unpublished work to visitors and crawlers.
    read: publishedOrStaff,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    // Deleting a published service is a dead URL. Editors unpublish instead.
    delete: isAdmin,
  },
  hooks: {
    /**
     * Keeps an untranslated locale out of Google's index (Design.md 2.3). Scoped
     * to non-default locales — see src/fields/seo.ts for why that scoping is not
     * what Design.md literally says.
     */
    beforeChange: [forceNoindexWhenUntranslated('services')],
    afterChange: [recordSlugsAfterRestore('services')],
  },
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
  /**
   * The content fields live in a tab of their own so the SEO tab is visually
   * separate (AGENT.md 5.6). The plugin appends its SEO tab to this array — it
   * only creates a `Content` tab itself when there is none, and that one would
   * be labelled from `labels.singular` ("Dịch vụ") rather than "Nội dung".
   *
   * `slug` stays outside the tabs, at the top level, so it keeps its sidebar
   * position; the plugin preserves everything after the tabs field.
   */
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: { en: 'Content', vi: 'Nội dung' },
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              localized: true,
              label: { en: 'Package name', vi: 'Tên gói dịch vụ' },
              admin: {
                description: {
                  en: 'What customers call this package. Used as the page heading.',
                  vi: 'Tên gói mà khách hàng gọi. Dùng làm tiêu đề trang.',
                },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'price',
                  type: 'number',
                  required: true,
                  // Dong has no subunit in practice, and a fractional price would reach
                  // the JSON-LD `Offer` as `150000.5`.
                  min: 0,
                  validate: wholeNumberAtLeast(0, 'priceMustBeWholeNumber'),
                  label: { en: 'Price', vi: 'Giá' },
                  admin: {
                    width: '35%',
                    step: 1000,
                    placeholder: '150000',
                    description: {
                      en:
                        'Enter the amount in VND as plain digits, for example 150000. No ' +
                        'dots, spaces or ₫ — the page adds those when it displays it.',
                      vi:
                        'Nhập số tiền bằng VND, ví dụ 150000. Không dùng dấu chấm, dấu ' +
                        'cách hay ₫ — trang sẽ tự thêm khi hiển thị.',
                    },
                  },
                },
                {
                  name: 'currency',
                  type: 'select',
                  required: true,
                  defaultValue: 'VND',
                  options: [{ value: 'VND', label: { en: 'VND (₫)', vi: 'VND (₫)' } }],
                  label: { en: 'Currency', vi: 'Đơn vị tiền tệ' },
                  admin: {
                    width: '20%',
                    /**
                     * Read-only and single-valued on purpose. The field exists so the
                     * unit is explicit to the editor and to the `Offer` schema, not so
                     * it can be changed: a second currency means a decision about
                     * exchange rates, rounding and which price a crawler is shown, and
                     * none of that is in scope. Add options when that decision is made.
                     */
                    readOnly: true,
                    description: {
                      en: 'All prices are in Vietnamese dong.',
                      vi: 'Mọi giá đều tính bằng đồng Việt Nam.',
                    },
                  },
                },
                {
                  name: 'durationMinutes',
                  type: 'number',
                  required: true,
                  // Zero or negative is not a short wash, it is a typo — and it would
                  // reach the page as "0 phút".
                  min: 1,
                  validate: wholeNumberAtLeast(1, 'durationMustBeWholeMinutes'),
                  label: { en: 'Duration (minutes)', vi: 'Thời lượng (phút)' },
                  admin: {
                    width: '45%',
                    step: 5,
                    placeholder: '30',
                    description: {
                      en: 'Roughly how long the wash takes, in minutes. Whole numbers.',
                      vi: 'Thời gian rửa xe khoảng bao lâu, tính bằng phút. Số nguyên.',
                    },
                  },
                },
              ],
            },
            {
              name: 'includes',
              type: 'array',
              localized: true,
              label: { en: 'What the package includes', vi: 'Gói này bao gồm' },
              labels: {
                singular: { en: 'Item', vi: 'Hạng mục' },
                plural: { en: 'Items', vi: 'Các hạng mục' },
              },
              admin: {
                description: {
                  en:
                    'One line per thing the package covers. Drag to reorder — they are ' +
                    'shown in this order.',
                  vi:
                    'Mỗi dòng một hạng mục mà gói bao gồm. Kéo để sắp xếp lại — thứ tự ' +
                    'này là thứ tự hiển thị.',
                },
              },
              /**
               * An array of `{ item }` rather than a single textarea, so an editor can
               * reorder lines by dragging and the template can render them as a list
               * without parsing newlines.
               *
               * Deliberately not part of the `Offer` schema (T-14), which carries price
               * and availability only — a list of inclusions is page copy, not an offer
               * term.
               */
              fields: [
                {
                  name: 'item',
                  type: 'text',
                  required: true,
                  label: { en: 'Item', vi: 'Hạng mục' },
                },
              ],
            },
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              /**
               * Required, which is the decision T-07 asks to be made explicitly.
               *
               * Every service gets its own page (T-18), and a service page with no
               * photograph of the wash is a page nobody shares and Google has no image
               * for. Required at the database level is also what keeps it from being the
               * field an editor in a hurry skips — the same reasoning as `Media.alt`.
               * The cost is that a package cannot be drafted before its photo exists;
               * that is the intended trade.
               */
              required: true,
              label: { en: 'Photo', vi: 'Hình ảnh' },
              admin: {
                description: {
                  en:
                    'A photo of this wash. Used at the top of the service page and as ' +
                    'the share image. Not localized — one photo for both languages.',
                  vi:
                    'Ảnh của gói rửa xe này. Dùng ở đầu trang dịch vụ và làm ảnh chia ' +
                    'sẻ. Không theo ngôn ngữ — một ảnh dùng cho cả hai.',
                },
              },
            },
          ],
        },
      ],
    },
    slugField({ collection: 'services', example: 'rua-xe-nhanh', from: 'name' }),
  ],
}
