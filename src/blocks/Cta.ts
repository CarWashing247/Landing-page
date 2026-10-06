import type { Block } from 'payload'

/** A closing band: one line, one action. */
export const Cta: Block = {
  slug: 'cta',
  labels: { singular: { en: 'Call to action', vi: 'Khối kêu gọi hành động' }, plural: { en: 'Calls to action', vi: 'Các khối kêu gọi hành động' } },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
      label: { en: 'Heading', vi: 'Tiêu đề' },
      admin: { placeholder: 'Trải nghiệm dịch vụ ngay hôm nay' },
    },
    {
      name: 'body',
      type: 'textarea',
      label: { en: 'Supporting line', vi: 'Dòng mô tả' },
      admin: { placeholder: 'Nhanh chóng, tiện lợi, luôn sẵn sàng phục vụ bạn.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'ctaLabel',
          type: 'text',
          label: { en: 'Button text', vi: 'Chữ trên nút' },
          admin: { width: '50%', placeholder: 'Tìm trạm gần bạn' },
        },
        {
          name: 'ctaHref',
          type: 'text',
          label: { en: 'Button link', vi: 'Đường dẫn của nút' },
          admin: { width: '50%', placeholder: '/lien-he' },
        },
      ],
    },
  ],
}
