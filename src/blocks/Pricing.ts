import type { Block } from 'payload'

/**
 * The price table, built from the `Services` collection rather than from typed
 * numbers.
 *
 * **A relationship, not `rows[]`.** T-17's scope allows either; a relationship
 * is the one that makes a price change in one place update the pricing table,
 * the service page and the `Offer` JSON-LD together. Typed rows would be a
 * second copy of every price, and the failure mode is silent: the table says
 * 150.000₫, the service page says 180.000₫, and whichever a customer saw first
 * is the one they expect to pay.
 *
 * Only published services can be selected — `filterOptions` applies the same
 * rule the public pages do, so an editor cannot link the price table to a draft
 * and publish a table with a hole in it.
 */
export const Pricing: Block = {
  slug: 'pricing',
  labels: {
    singular: { en: 'Pricing', vi: 'Khối bảng giá' },
    plural: { en: 'Pricing blocks', vi: 'Các khối bảng giá' },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: { en: 'Heading', vi: 'Tiêu đề' },
      admin: { placeholder: 'Gói dịch vụ nổi bật' },
    },
    {
      name: 'services',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
      required: true,
      minRows: 1,
      label: { en: 'Services', vi: 'Các gói dịch vụ' },
      filterOptions: () => ({ _status: { equals: 'published' } }),
      admin: {
        description: {
          en: 'Pick the packages to show, in the order you want them. Prices and durations come from the service itself, so they are never out of date here. Only published services can be chosen.',
          vi: 'Chọn các gói muốn hiển thị, theo thứ tự mong muốn. Giá và thời lượng lấy trực tiếp từ dịch vụ nên không bao giờ bị lệch. Chỉ chọn được dịch vụ đã xuất bản.',
        },
      },
    },
  ],
}
