import type { Block } from 'payload'

/**
 * The page's opening band: one heading, one supporting line, one image, one
 * action.
 *
 * **This is the only block that emits `<h1>`**, which is why a page may hold at
 * most one of it — enforced in `Pages.ts` rather than explained in a handover
 * note. Two `<h1>`s on a page is the kind of thing that passes review and fails
 * an audit months later.
 *
 * The fields are not localized individually: `Pages.layout` is itself
 * `localized`, so the whole block array is per locale already. Marking a field
 * inside it localized as well would be a second, nested dimension that Payload
 * does not store and the editor cannot see.
 */
export const Hero: Block = {
  slug: 'hero',
  labels: { singular: { en: 'Hero', vi: 'Khối mở đầu' }, plural: { en: 'Heroes', vi: 'Các khối mở đầu' } },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
      label: { en: 'Heading', vi: 'Tiêu đề chính' },
      admin: {
        placeholder: 'Rửa xe tự động nhanh chóng và an toàn',
        description: {
          en: 'The page’s main heading. It becomes the only <h1> on the page, so make it the one thing the page is about.',
          vi: 'Tiêu đề chính của trang. Đây là thẻ <h1> duy nhất của trang, nên hãy viết đúng nội dung chính.',
        },
      },
    },
    {
      name: 'subheading',
      type: 'textarea',
      label: { en: 'Supporting line', vi: 'Dòng mô tả' },
      admin: {
        placeholder: 'Trải nghiệm công nghệ hiện đại cho chiếc xe của bạn luôn như mới.',
        description: {
          en: 'One or two sentences under the heading.',
          vi: 'Một đến hai câu ngay dưới tiêu đề.',
        },
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: { en: 'Image', vi: 'Hình ảnh' },
      admin: {
        description: {
          en: 'Shown beside the heading. This is the largest image on the page, so it is loaded first — pick a sharp one.',
          vi: 'Hiển thị cạnh tiêu đề. Đây là ảnh lớn nhất của trang và được tải trước, nên hãy chọn ảnh rõ nét.',
        },
      },
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
          admin: {
            width: '50%',
            placeholder: '/lien-he',
            description: {
              en: 'A path on this site, starting with /. Leave both boxes empty for no button.',
              vi: 'Đường dẫn trên trang này, bắt đầu bằng /. Bỏ trống cả hai ô nếu không cần nút.',
            },
          },
        },
      ],
    },
  ],
}
