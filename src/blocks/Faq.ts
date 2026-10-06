import type { Block } from 'payload'

/**
 * Questions and answers, which are also structured data.
 *
 * **The field names are fixed by T-14 and must not be renamed.**
 * `src/lib/schema/faq.ts` reads `blockType: 'faq'` and `items[]` of `question`
 * and `answer`; `src/lib/schema/faq.test.ts` pins them. A rename does not break
 * the page — it silently stops `FAQPage` being emitted, and a page with no FAQ
 * rich result looks exactly like one that has it. The tests are what fail
 * instead, which is the point of their existing before this block did.
 *
 * **`answer` is a `textarea`, deliberately, not rich text.** Google's
 * `Answer.text` takes plain text or simple HTML; a Lexical value is neither, and
 * serialising one reaches Google as `[object Object]`. Rich answers would mean
 * owning a Lexical-to-HTML conversion and deciding which nodes survive it. Until
 * someone wants that, plain text keeps the schema honest.
 */
export const Faq: Block = {
  slug: 'faq',
  labels: {
    singular: { en: 'FAQ', vi: 'Khối câu hỏi thường gặp' },
    plural: { en: 'FAQ blocks', vi: 'Các khối câu hỏi thường gặp' },
  },
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
      admin: {
        placeholder: 'Câu hỏi thường gặp',
        description: {
          en: 'Shown above the questions. It is page copy — Google’s FAQ data has no place for it.',
          vi: 'Hiển thị phía trên các câu hỏi. Đây chỉ là nội dung trang — dữ liệu FAQ của Google không có mục này.',
        },
      },
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      label: { en: 'Questions', vi: 'Các câu hỏi' },
      labels: { singular: { en: 'Question', vi: 'Câu hỏi' }, plural: { en: 'Questions', vi: 'Các câu hỏi' } },
      admin: {
        description: {
          en: 'These are sent to Google as structured data, so write a real question and a real answer. A row with either half empty is skipped.',
          vi: 'Những mục này được gửi tới Google dưới dạng dữ liệu có cấu trúc, nên hãy viết câu hỏi và câu trả lời thật. Dòng thiếu một trong hai phần sẽ bị bỏ qua.',
        },
      },
      fields: [
        {
          name: 'question',
          type: 'text',
          required: true,
          label: { en: 'Question', vi: 'Câu hỏi' },
          admin: { placeholder: 'Rửa xe tự động có làm xước sơn không?' },
        },
        {
          name: 'answer',
          type: 'textarea',
          required: true,
          label: { en: 'Answer', vi: 'Câu trả lời' },
          admin: {
            description: {
              en: 'Plain text. Formatting is deliberately not available here, because Google reads this answer as text.',
              vi: 'Chỉ văn bản thuần. Ở đây không có định dạng, vì Google đọc câu trả lời này dưới dạng văn bản.',
            },
          },
        },
      ],
    },
  ],
}
