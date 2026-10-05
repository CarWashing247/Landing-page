import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor, publishedOrStaff } from '../lib/access'
import { recordSlugsAfterRestore, slugField } from '../lib/slug-field'

/**
 * A whole number, at or above `minimum`.
 *
 * Both halves are here on purpose, because **a custom `validate` replaces
 * Payload's built-in number validation rather than adding to it.** Found by
 * testing: with only an integer check in `validate`, the `min` on these fields
 * stopped being enforced entirely and the API accepted `durationMinutes: 0`,
 * `-5` and `price: -1` with a 201. `min` is still declared on each field — it
 * drives the admin input's attributes and documents the intent — but it is this
 * function that enforces it.
 *
 * Integers because Payload maps a `number` field to Postgres `numeric`, so
 * `150000.5` stores and round-trips happily, then reaches the page as an odd
 * price and the JSON-LD `Offer` as a price Google reads literally. Dong has no
 * subunit in practice and a wash is not timed to the half minute, so a
 * fractional value here is always a typo.
 */
const wholeNumberAtLeast =
  (minimum: number, message: string) =>
  (value: number | null | undefined): string | true => {
    if (value === null || value === undefined) {
      // Absence is `required`'s business, not this validator's.
      return true
    }

    return Number.isInteger(value) && value >= minimum ? true : message
  }

/**
 * One document per wash package, each becoming `/dich-vu/<slug>`.
 *
 * **Price is the field that needs care.** It is rendered on the page *and*
 * emitted as a JSON-LD `Offer` (T-14) — two consumers that must not disagree
 * about whether `150000` means dong or thousands of dong. So the number is
 * stored as an integer count of dong and the unit is a separate, visible,
 * read-only field rather than a convention in a developer's head. A formatted
 * string would be worse than either: `"150.000₫"` cannot be compared, summed or
 * put in an `Offer` without being parsed back.
 *
 * `name`, `slug` and `includes` are **localized**; `price`, `durationMinutes`
 * and `image` are not (Design.md 2.1) — one price and one photo, whatever
 * language you read them in. That split is a schema decision, so it is settled
 * here rather than revisited later.
 *
 * The slug behaves exactly as on `Pages`, through the same shared field: locked
 * once published, generated from `name`, separate per locale. See
 * `src/lib/slug-field.ts` for the three traps that live behind it.
 *
 * The SEO tab is deliberately absent — T-08 owns it.
 */
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
    afterChange: [recordSlugsAfterRestore('services')],
  },
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
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
    slugField({ collection: 'services', example: 'rua-xe-nhanh', from: 'name' }),
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
          validate: wholeNumberAtLeast(
            0,
            'Giá phải là số nguyên không âm, ví dụ 150000. / The price must be a whole number, zero or more, e.g. 150000.',
          ),
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
          validate: wholeNumberAtLeast(
            1,
            'Thời lượng phải là số nguyên phút, ít nhất 1. / The duration must be a whole number of minutes, at least 1.',
          ),
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
}
