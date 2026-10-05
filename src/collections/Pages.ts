import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor, publishedOrStaff } from '../lib/access'
import { recordSlugsAfterRestore, slugField } from '../lib/slug-field'

/**
 * Editable pages, as a stack of blocks, with drafts and version history.
 *
 * **The slug lock is the point of this collection.** Changing the slug of a
 * published page breaks every indexed URL and every link anyone has shared, and
 * there is no undo that reaches Google's index or someone's Zalo message. So the
 * CMS makes it impossible rather than merely inadvisable.
 *
 * Version history is what makes that acceptable to an editor (AGENT.md 5.6):
 * they can undo a content mistake, so they never need to undo a URL mistake.
 *
 * `title`, `slug` and `layout` are **localized** (Design.md 2.1). Slugs
 * especially: `bang-gia` and `pricing` are separate documents' worth of keyword
 * value, not a translation of one another. Localization is a schema decision —
 * Payload stores localized values in their own table — which is why T-04A had
 * to land before this task.
 *
 * The SEO tab is deliberately absent. T-08 owns it, and a stubbed `meta` field
 * here would be a migration for T-08 to undo.
 */

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: { en: 'Page', vi: 'Trang' },
    plural: { en: 'Pages', vi: 'Các trang' },
  },
  admin: {
    useAsTitle: 'title',
    // What an editor needs to identify a row: what it is, where it lives,
    // whether it is live, and whether someone changed it recently.
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    description: {
      en:
        'Pages are built from blocks. Save as draft while you work — nothing is ' +
        'public until you press Publish. The address cannot be changed once a ' +
        'page is published.',
      vi:
        'Trang được tạo từ các khối nội dung. Hãy lưu bản nháp trong khi làm — ' +
        'chưa có gì công khai cho đến khi bấm Xuất bản. Không thể đổi đường dẫn ' +
        'sau khi trang đã xuất bản.',
    },
  },
  access: {
    // Published only for the public; drafts would otherwise be served to
    // visitors and crawlers by a plain `anyone`.
    read: publishedOrStaff,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    // Deleting a published page is a dead URL. Editors unpublish instead.
    delete: isAdmin,
  },
  hooks: {
    afterChange: [recordSlugsAfterRestore('pages')],
  },
  versions: {
    drafts: true,
    // Enough history to undo a bad afternoon without keeping every keystroke
    // of a page's life in Postgres forever.
    maxPerDoc: 50,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      label: { en: 'Title', vi: 'Tiêu đề' },
      admin: {
        description: {
          en: 'Shown as the page heading, and used to suggest the address below.',
          vi: 'Hiển thị làm tiêu đề trang, và dùng để gợi ý đường dẫn bên dưới.',
        },
      },
    },
    slugField({ collection: 'pages', example: 'bang-gia', from: 'title' }),
    {
      name: 'layout',
      type: 'blocks',
      localized: true,
      label: { en: 'Content', vi: 'Nội dung' },
      labels: {
        singular: { en: 'Block', vi: 'Khối' },
        plural: { en: 'Blocks', vi: 'Các khối' },
      },
      admin: {
        description: {
          en: 'Add and reorder blocks to build the page.',
          vi: 'Thêm và sắp xếp các khối để tạo nên trang.',
        },
      },
      /**
       * One block, deliberately.
       *
       * T-17 owns the real set (Hero, Pricing, Steps, Faq, Cta). An empty
       * `blocks: []` would type-check and then hand an editor a content field
       * with nothing to put in it, so the layout could not be exercised at all
       * before T-17 lands — including by T-23's seed data. Rich text is the one
       * block that survives whatever T-17 decides, so it is not throwaway.
       */
      blocks: [
        {
          slug: 'content',
          labels: {
            singular: { en: 'Text', vi: 'Văn bản' },
            plural: { en: 'Text blocks', vi: 'Các khối văn bản' },
          },
          fields: [
            {
              name: 'richText',
              type: 'richText',
              required: true,
              label: { en: 'Text', vi: 'Văn bản' },
            },
          ],
        },
      ],
    },
  ],
}
