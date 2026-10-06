import type { CollectionConfig } from 'payload'

import { isAdmin } from '../lib/access'
import { LOCALES } from '../lib/locales'

/**
 * Where the contact form's submissions land.
 *
 * **This was an open flag, and this is the answer it asked for.** T-19's file
 * says the destination is unspecified in Design.md, tells whoever builds it to
 * pick the lowest-risk default — a Payload collection, admin-read-only — and to
 * ask before wiring anything external. That is what this is. An email
 * integration or a third-party endpoint would mean a new credential, a new
 * outbound dependency on the request path, and a visitor's phone number leaving
 * the deploy; none of that should be chosen on a task's own authority.
 *
 * **Nothing here is created through the REST API.** `create` is denied to
 * everyone, including an admin: the only writer is `src/app/api/contact/route.ts`,
 * which validates with the shared Zod schema first and then writes through the
 * Local API, where `overrideAccess` defaults to true. That matters because the
 * `/api/:path*` rewrite puts Payload's REST handler at `/api/contact-submissions`
 * — left open, that would be a second, unvalidated, unrate-limited way to write
 * rows, and the one a scraper finds first.
 *
 * **`read` is `isAdmin`, not `isAdminOrEditor`.** These rows are a visitor's
 * name and phone number, which is personal data under Decree 13/2023; the
 * editor role is scoped to the three content collections (AGENT.md 5.6) and
 * widening it to someone's contact details is not a styling decision. `update`
 * is denied outright — a submission is a record of what someone sent, and a
 * record that can be edited is not one.
 *
 * **Nothing here is localized.** A submission is one person's words, written
 * once, in whichever language they were reading. `locale` records which that
 * was so a callback is made in the right language; it is not a translation
 * axis.
 *
 * **The source IP is deliberately not stored.** The route handler logs it,
 * because AGENT.md 5.8 requires a rejected request to be identifiable, and a
 * log line ages out. A column would keep it next to the name and the phone
 * number indefinitely, which is a retention decision nobody asked for and the
 * harder one to undo.
 */
export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  labels: {
    singular: { en: 'Contact submission', vi: 'Yêu cầu liên hệ' },
    plural: { en: 'Contact submissions', vi: 'Các yêu cầu liên hệ' },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'service', 'locale', 'createdAt'],
    description: {
      en:
        'Messages sent through the contact form, newest first. They are read-only: ' +
        'this is a record of what someone sent, so nothing here can be edited.',
      vi:
        'Các tin nhắn gửi qua biểu mẫu liên hệ, mới nhất trước. Chỉ xem: đây là ' +
        'bản ghi nội dung khách đã gửi, nên không sửa được.',
    },
  },
  access: {
    /** See the note above: the route handler is the only writer. */
    create: () => false,
    read: isAdmin,
    update: () => false,
    delete: isAdmin,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: { en: 'Full name', vi: 'Họ và tên' },
          admin: { width: '50%', readOnly: true },
        },
        {
          name: 'phone',
          type: 'text',
          required: true,
          label: { en: 'Phone number', vi: 'Số điện thoại' },
          admin: {
            width: '50%',
            readOnly: true,
            description: {
              en: 'As the visitor typed it. Call back on this number.',
              vi: 'Đúng như khách đã nhập. Gọi lại theo số này.',
            },
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'email',
          type: 'text',
          label: { en: 'Email', vi: 'Email' },
          admin: { width: '50%', readOnly: true },
        },
        {
          name: 'service',
          type: 'text',
          label: { en: 'Service of interest', vi: 'Dịch vụ quan tâm' },
          admin: {
            width: '50%',
            readOnly: true,
            description: {
              en:
                'What the visitor said they were after, in their own words — not a ' +
                'link to a service, so it still makes sense after a package is renamed.',
              vi:
                'Nhu cầu khách tự ghi, theo đúng lời của khách — không liên kết tới ' +
                'dịch vụ nào, nên vẫn hiểu được sau khi gói dịch vụ được đổi tên.',
            },
          },
        },
      ],
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
      label: { en: 'Message', vi: 'Nội dung' },
      admin: { readOnly: true },
    },
    {
      name: 'locale',
      type: 'select',
      required: true,
      options: LOCALES.map((code) => ({
        value: code,
        label: code === 'vi' ? { en: 'Vietnamese', vi: 'Tiếng Việt' } : { en: 'English', vi: 'Tiếng Anh' },
      })),
      label: { en: 'Language of the page', vi: 'Ngôn ngữ của trang' },
      admin: {
        readOnly: true,
        description: {
          en: 'Which version of the site this was sent from. Reply in that language.',
          vi: 'Khách gửi từ bản tiếng nào của trang web. Hãy trả lời bằng ngôn ngữ đó.',
        },
      },
    },
  ],
  timestamps: true,
}
