import type { CollectionConfig, PayloadRequest } from 'payload'

import { Contact } from '../blocks/Contact'
import { Cta } from '../blocks/Cta'
import { Faq } from '../blocks/Faq'
import { Hero } from '../blocks/Hero'
import { Pricing } from '../blocks/Pricing'
import { Steps } from '../blocks/Steps'
import { adminMessage } from '../i18n/admin-translations'
import { isAdmin, isAdminOrEditor, publishedOrStaff } from '../lib/access'
import { previewUrl } from '../lib/preview'
import { getSecret } from '../lib/secrets'
import { localeUpdatedAtField, stampLocaleUpdatedAt } from '../fields/locale-updated-at'
import { forceNoindexWhenUntranslated } from '../fields/seo'
import {
  recordSlugsBeforeDelete,
  revalidateAfterChange,
  revalidateAfterDelete,
} from '../lib/revalidate'
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
    /**
     * Deck page 2 groups the sidebar into Collections, Globals and Users.
     * Payload's default is one flat list, so the group is set per collection
     * and per global; the editor's shorter sidebar needs nothing here, because
     * Payload already hides what `read` denies (T-03).
     *
     * **The Vietnamese value is the English word, because that is what the deck
     * shows.** Page 2's sidebar is otherwise fully Vietnamese — `Các trang`,
     * `Thư viện ảnh`, `Thông tin doanh nghiệp` — yet its three group headings
     * read `Collections`, `Globals` and `Users`. Taking that verbatim is the
     * rule for deck copy; inventing Vietnamese for them would be writing copy
     * rather than taking it, which CLAUDE.md forbids. Recorded as a follow-up
     * so someone who owns the wording can supply it.
     */
    group: { en: 'Collections', vi: 'Collections' },
    /**
     * The Preview button. Returns a relative URL so an editor working against
     * a preview deployment is never sent to production, and `null` when this
     * locale has no slug yet — Payload then hides the button rather than
     * offering one that cannot resolve.
     *
     * The secret is read from Vault at click time and travels in the URL,
     * which is the contract `/api/draft` checks. It is not logged, and the
     * link is only ever rendered inside the authenticated admin.
     */
    preview: async (doc, { locale }) =>
      previewUrl({
        collection: 'pages',
        locale,
        secret: await getSecret('PREVIEW_SECRET'),
        slug: doc?.slug,
      }),
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
    /**
     * Keeps an untranslated locale out of Google's index (Design.md 2.3). Scoped
     * to non-default locales — see src/fields/seo.ts for why that scoping is not
     * what Design.md literally says.
     */
    /**
     * Order matters only in that both are independent: the guardrail decides
     * `meta.noindex`, the stamp records when this locale was last written.
     */
    beforeChange: [forceNoindexWhenUntranslated('pages'), stampLocaleUpdatedAt()],
    afterChange: [recordSlugsAfterRestore('pages'), revalidateAfterChange('pages')],
    /**
     * A deleted document must stop serving. The per-locale slugs are read in
     * `beforeDelete`, while the row still exists — `afterDelete` only sees the
     * slug resolved for one locale, and purging that under every locale's tag
     * would leave the other locale's URL serving a deleted page.
     */
    beforeDelete: [recordSlugsBeforeDelete('pages')],
    afterDelete: [revalidateAfterDelete('pages')],
  },
  versions: {
    drafts: true,
    // Enough history to undo a bad afternoon without keeping every keystroke
    // of a page's life in Postgres forever.
    maxPerDoc: 50,
  },
  /**
   * The content fields live in a tab of their own so the SEO tab is visually
   * separate (AGENT.md 5.6). The plugin appends its SEO tab to this array —
   * it only creates a `Content` tab itself when there is none, and that one
   * would be labelled from `labels.singular` ("Trang") rather than "Nội dung".
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
               * The five blocks from T-17, the contact block T-19 added, and
               * the rich-text block T-06 added.
               *
               * `content` stays: it is the one block that survives any design
               * change, and removing it would be a migration that destroys
               * whatever is already stored in it.
               *
               * **At most one `hero`**, enforced below rather than written in a
               * handover note (AGENT.md 5.6 prefers a guardrail in the config).
               * `Hero` emits the page's `<h1>`, and two of those is the kind of
               * thing that passes review and fails an audit months later.
               * Payload has no per-block `maxRows`, so it is a `validate` on the
               * array.
               */
              validate: (value: unknown, options: { req: PayloadRequest }): string | true => {
                const heroes = Array.isArray(value)
                  ? value.filter(
                      (block) => (block as { blockType?: string })?.blockType === 'hero',
                    ).length
                  : 0

                // Resolved through the registered translations, so the editor
                // reads a sentence in their own language rather than a key
                // (AGENT.md 5.6).
                return heroes > 1 ? adminMessage(options.req, 'onlyOneHero') : true
              },
              blocks: [
                Hero,
                Steps,
                Pricing,
                Faq,
                Cta,
                Contact,
                {
                  slug: 'content',
                  admin: { images: { thumbnail: { url: '/block-previews/content.svg', alt: '' } } },
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
        },
      ],
    },
    slugField({ collection: 'pages', example: 'bang-gia', from: 'title' }),
    localeUpdatedAtField,
  ],
}
