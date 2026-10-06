import type { Block } from 'payload'

/**
 * The numbered sequence — scan the QR code, choose a wash, pay, drive in.
 *
 * **The numbers are not a field.** The designs show 01, 02, 03 on the home page
 * and a four-step version on the pricing page; both are the same block with a
 * different number of rows. Numbering from the array index means an editor
 * reordering the steps cannot leave "03" above "02", which is exactly the kind
 * of error nobody notices in a CMS preview.
 */
export const Steps: Block = {
  slug: 'steps',
  labels: { singular: { en: 'Steps', vi: 'Khối các bước' }, plural: { en: 'Step blocks', vi: 'Các khối các bước' } },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: { en: 'Heading', vi: 'Tiêu đề' },
      admin: { placeholder: '3 bước rửa xe chỉ trong 1 phút' },
    },
    {
      name: 'steps',
      type: 'array',
      minRows: 2,
      label: { en: 'Steps', vi: 'Các bước' },
      labels: { singular: { en: 'Step', vi: 'Bước' }, plural: { en: 'Steps', vi: 'Các bước' } },
      admin: {
        description: {
          en: 'Shown in this order and numbered automatically. Drag to reorder.',
          vi: 'Hiển thị theo thứ tự này và tự động đánh số. Kéo để sắp xếp lại.',
        },
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: { en: 'Title', vi: 'Tên bước' },
          admin: { placeholder: 'Quét QR' },
        },
        {
          name: 'body',
          type: 'textarea',
          label: { en: 'Description', vi: 'Mô tả' },
          admin: { placeholder: 'Quét mã tại trạm để bắt đầu' },
        },
      ],
    },
  ],
}
