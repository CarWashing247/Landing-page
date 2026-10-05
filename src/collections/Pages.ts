import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor, publishedOrStaff } from '../lib/access'
import { forceNoindexWhenUntranslated } from '../fields/seo'
import { recordSlugsAfterRestore, slugField } from '../lib/slug-field'

const textField = (name: string, label: { en: string; vi: string }, required = true) => ({
  name,
  type: 'text' as const,
  required,
  localized: true,
  label,
})

const blocks = [
  {
    slug: 'hero',
    labels: { singular: { en: 'Hero', vi: 'Hero' }, plural: { en: 'Hero', vi: 'Hero' } },
    fields: [
      textField('eyebrow', { en: 'Eyebrow', vi: 'Nhãn' }, false),
      textField('heading', { en: 'Heading', vi: 'Tiêu đề' }),
      { name: 'description', type: 'textarea' as const, localized: true, label: { en: 'Description', vi: 'Mô tả' } },
      textField('primaryLabel', { en: 'Primary CTA label', vi: 'Nhãn CTA chính' }, false),
      textField('primaryHref', { en: 'Primary CTA URL', vi: 'URL CTA chính' }, false),
      textField('secondaryLabel', { en: 'Secondary CTA label', vi: 'Nhãn CTA phụ' }, false),
      textField('secondaryHref', { en: 'Secondary CTA URL', vi: 'URL CTA phụ' }, false),
    ],
  },
  {
    slug: 'benefits',
    labels: { singular: { en: 'Benefits', vi: 'Lợi ích' }, plural: { en: 'Benefits', vi: 'Lợi ích' } },
    fields: [{
      name: 'items',
      type: 'array' as const,
      localized: true,
      fields: [textField('value', { en: 'Value', vi: 'Giá trị' }), textField('title', { en: 'Title', vi: 'Tiêu đề' }), textField('description', { en: 'Description', vi: 'Mô tả' })],
    }],
  },
  {
    slug: 'steps',
    labels: { singular: { en: 'Steps', vi: 'Các bước' }, plural: { en: 'Steps', vi: 'Các bước' } },
    fields: [{
      name: 'items',
      type: 'array' as const,
      localized: true,
      fields: [textField('number', { en: 'Number', vi: 'Số thứ tự' }), textField('title', { en: 'Title', vi: 'Tiêu đề' }), textField('description', { en: 'Description', vi: 'Mô tả' })],
    }],
  },
  {
    slug: 'pricing',
    labels: { singular: { en: 'Pricing', vi: 'Bảng giá' }, plural: { en: 'Pricing', vi: 'Bảng giá' } },
    fields: [{ name: 'heading', type: 'text' as const, localized: true, required: false, label: { en: 'Heading', vi: 'Tiêu đề' } }],
  },
  {
    slug: 'technology',
    labels: { singular: { en: 'Technology', vi: 'Công nghệ' }, plural: { en: 'Technology', vi: 'Công nghệ' } },
    fields: [textField('heading', { en: 'Heading', vi: 'Tiêu đề' }), { name: 'description', type: 'textarea' as const, localized: true, label: { en: 'Description', vi: 'Mô tả' } }],
  },
  {
    slug: 'faq',
    labels: { singular: { en: 'FAQ', vi: 'FAQ' }, plural: { en: 'FAQ', vi: 'FAQ' } },
    fields: [{
      name: 'items',
      type: 'array' as const,
      localized: true,
      fields: [textField('question', { en: 'Question', vi: 'Câu hỏi' }), { name: 'answer', type: 'textarea' as const, localized: true, required: true, label: { en: 'Answer', vi: 'Trả lời' } }],
    }],
  },
  {
    slug: 'cta',
    labels: { singular: { en: 'CTA', vi: 'CTA' }, plural: { en: 'CTA', vi: 'CTA' } },
    fields: [textField('heading', { en: 'Heading', vi: 'Tiêu đề' }), { name: 'description', type: 'textarea' as const, localized: true, label: { en: 'Description', vi: 'Mô tả' } }, textField('label', { en: 'Button label', vi: 'Nhãn nút' }), textField('href', { en: 'Button URL', vi: 'URL nút' })],
  },
  {
    slug: 'content',
    labels: { singular: { en: 'Text', vi: 'Văn bản' }, plural: { en: 'Text blocks', vi: 'Các khối văn bản' } },
    fields: [{ name: 'richText', type: 'richText' as const, required: true, label: { en: 'Text', vi: 'Văn bản' } }],
  },
]

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: { en: 'Page', vi: 'Trang' }, plural: { en: 'Pages', vi: 'Các trang' } },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
  },
  access: {
    read: publishedOrStaff,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [forceNoindexWhenUntranslated('pages')],
    afterChange: [recordSlugsAfterRestore('pages')],
  },
  versions: { drafts: true, maxPerDoc: 50 },
  fields: [
    {
      type: 'tabs',
      tabs: [{
        label: { en: 'Content', vi: 'Nội dung' },
        fields: [
          { name: 'title', type: 'text', required: true, localized: true, label: { en: 'Title', vi: 'Tiêu đề' } },
          {
            name: 'layout',
            type: 'blocks',
            localized: true,
            label: { en: 'Content', vi: 'Nội dung' },
            labels: { singular: { en: 'Block', vi: 'Khối' }, plural: { en: 'Blocks', vi: 'Các khối' } },
            blocks,
          },
        ],
      }],
    },
    slugField({ collection: 'pages', example: 'bang-gia', from: 'title' }),
  ],
}
