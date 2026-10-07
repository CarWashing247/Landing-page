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
  admin: { images: { thumbnail: { url: '/block-previews/steps.svg', alt: '' } } },
  labels: { singular: { en: 'Steps', vi: 'Khối các bước' }, plural: { en: 'Step blocks', vi: 'Các khối các bước' } },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: { en: 'Small label above the heading', vi: 'Nhãn nhỏ phía trên tiêu đề' },
      admin: {
        placeholder: 'Dịch vụ',
        description: {
          en: 'Two or three words in small capitals above the heading. Leave empty to show none.',
          vi: 'Hai đến ba chữ in hoa nhỏ phía trên tiêu đề. Bỏ trống nếu không cần.',
        },
      },
    },
    {
      name: 'note',
      type: 'textarea',
      label: { en: 'Note beside the heading', vi: 'Ghi chú bên cạnh tiêu đề' },
      admin: {
        description: {
          en: 'A short paragraph shown to the right of the heading on wide screens, and under it on a phone.',
          vi: 'Đoạn ngắn hiển thị bên phải tiêu đề trên màn hình rộng, và bên dưới trên điện thoại.',
        },
      },
    },
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
