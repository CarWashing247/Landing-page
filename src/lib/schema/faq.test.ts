import { beforeAll, describe, expect, it } from 'vitest'

import { faqEntries, faqSchema, isFaqBlock } from './faq'

const ORIGIN = 'https://autowash247.vn'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGIN
})

/**
 * The block shape as T-17's task file already specifies it: `items[]` of
 * `question` and `answer`. Written out here rather than imported from
 * `payload-types.ts` because the block does not exist yet — see the header of
 * `faq.ts`. If T-17 ships different field names, these tests are what fails.
 */
const faqBlock = (items: Array<{ answer?: string; question?: string }>) => ({
  blockType: 'faq',
  items,
})

const contentBlock = { blockType: 'content', richText: {} }

describe('isFaqBlock', () => {
  it('recognises the block by its discriminator', () => {
    expect(isFaqBlock(faqBlock([]))).toBe(true)
  })

  it('rejects other blocks and non-objects', () => {
    expect(isFaqBlock(contentBlock)).toBe(false)
    expect(isFaqBlock(null)).toBe(false)
    expect(isFaqBlock('faq')).toBe(false)
  })
})

describe('faqEntries', () => {
  it('collects pairs in order, across more than one block', () => {
    const layout = [
      faqBlock([{ answer: 'A1', question: 'Q1' }]),
      contentBlock,
      faqBlock([{ answer: 'A2', question: 'Q2' }]),
    ]

    expect(faqEntries(layout)).toEqual([
      { answer: 'A1', question: 'Q1' },
      { answer: 'A2', question: 'Q2' },
    ])
  })

  it('drops a half-filled row rather than emitting an unanswered Question', () => {
    // A Question with no acceptedAnswer is an error in the Rich Results Test, and
    // one blank row in the admin should not invalidate the whole page.
    const layout = [faqBlock([{ question: 'Q1' }, { answer: 'A2' }, { answer: 'A3', question: 'Q3' }])]

    expect(faqEntries(layout)).toEqual([{ answer: 'A3', question: 'Q3' }])
  })

  it('returns nothing for a layout with no FAQ block, or no layout at all', () => {
    expect(faqEntries([contentBlock])).toEqual([])
    expect(faqEntries(null)).toEqual([])
    expect(faqEntries(undefined)).toEqual([])
  })
})

describe('faqSchema', () => {
  it('emits FAQPage with one Question per pair', () => {
    const schema = faqSchema({
      layout: [faqBlock([{ answer: 'Khoảng 10 phút.', question: 'Rửa xe mất bao lâu?' }])],
      locale: 'vi',
      path: '/huong-dan',
    })

    expect(schema).toEqual({
      '@context': 'https://schema.org',
      '@id': `${ORIGIN}/huong-dan#faq`,
      '@type': 'FAQPage',
      inLanguage: 'vi',
      mainEntity: [
        {
          '@type': 'Question',
          acceptedAnswer: { '@type': 'Answer', text: 'Khoảng 10 phút.' },
          name: 'Rửa xe mất bao lâu?',
        },
      ],
      url: `${ORIGIN}/huong-dan`,
    })
  })

  it('does carry inLanguage, because FAQPage is a CreativeWork', () => {
    // The one of the three types where AGENT.md 5.4's rule is valid per
    // schema.org: FAQPage < WebPage < CreativeWork, which is in inLanguage's domain.
    const schema = faqSchema({
      layout: [faqBlock([{ answer: 'A', question: 'Q' }])],
      locale: 'en',
      path: '/guide',
    })

    expect(schema).toMatchObject({ inLanguage: 'en' })
  })

  it('returns null for a page without an FAQ block', () => {
    // The acceptance criterion: a page without the block emits nothing at all,
    // rather than an FAQPage with an empty mainEntity, which is invalid.
    expect(faqSchema({ layout: [contentBlock], locale: 'vi', path: '/bang-gia' })).toBeNull()
  })

  it('returns null when every row is half-filled', () => {
    expect(
      faqSchema({ layout: [faqBlock([{ question: 'Q1' }])], locale: 'vi', path: '/bang-gia' }),
    ).toBeNull()
  })
})
