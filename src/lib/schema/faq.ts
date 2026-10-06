import type { Locale } from '../locales'
import { SCHEMA_CONTEXT, absoluteUrl, inLanguage, nodeId, prune, publishable } from './shared'

/**
 * `FAQPage`, when a page's `layout` contains an FAQ block.
 *
 * **The block does not exist yet, and that is why this file is structural.**
 * T-17 builds the `Faq` block component; today `Pages.layout` accepts one block
 * type (`content`), so `payload-types.ts` has no `faq` member to narrow against
 * and a `blockType === 'faq'` comparison against the generated union would not
 * even compile. T-14's scope anticipates this — it says this task consumes the
 * block's data shape and that T-17 must not rename the fields underneath it — so
 * the shape is **defined here** and T-17 is expected to match it.
 *
 * **The field names come from T-17's own table**, which already specifies the
 * block as `heading` + `items[]` (`question`, `answer`) — so this reads that
 * contract rather than inventing one for T-17 to match:
 *
 * ```
 * blockType: 'faq'
 * items: { question: string; answer: string }[]
 * ```
 *
 * `heading` is not part of `FAQPage`; schema.org has no such property on it, and
 * the heading is page copy that T-17's component renders.
 *
 * **`answer` must be plain text, not rich text.** Google's `Answer.text` accepts
 * plain text or simple HTML, and a Lexical rich-text value is neither — turning
 * one into HTML needs the Lexical HTML converter and a decision about which
 * nodes survive. If T-17 wants rich answers it has to supply that conversion;
 * until then a `textarea` keeps the schema honest, because the alternative is
 * `[object Object]` reaching Google.
 *
 * Nothing emits `FAQPage` today, by construction — no page can carry the block.
 * The builder and its tests exist so that T-17 adding the block is the only step
 * left, and so the question of what the schema should look like is settled while
 * the SEO task is the one being thought about.
 */

/** One question and its answer, as the block stores them. */
export type FaqEntry = { answer: string; question: string }

/** The block as `Pages.layout` will hold it once T-17 adds it. */
export type FaqBlock = { blockType: 'faq'; items?: FaqEntry[] | null }

/**
 * Structural, not a type-system narrowing, for the reason in the header: there
 * is no generated `faq` member to narrow to. It checks only the block's
 * discriminator, so it keeps working unchanged when T-17 adds the block and the
 * generated union grows.
 */
export const isFaqBlock = (value: unknown): value is FaqBlock =>
  typeof value === 'object' &&
  value !== null &&
  (value as { blockType?: unknown }).blockType === 'faq'

/**
 * Every question/answer pair in a page's layout, in order, from any number of
 * FAQ blocks.
 *
 * A pair with either half missing is dropped rather than emitted half-empty: a
 * `Question` with no `acceptedAnswer` is an error in the Rich Results Test, and
 * one blank row in the admin should not invalidate the whole page's schema.
 */
export const faqEntries = (layout: unknown): FaqEntry[] =>
  (Array.isArray(layout) ? layout : [])
    .filter(isFaqBlock)
    .flatMap((block) => block.items ?? [])
    .flatMap((entry) => {
      const question = publishable(entry?.question)
      const answer = publishable(entry?.answer)

      return question && answer ? [{ answer, question }] : []
    })

/**
 * The `FAQPage` node, or `null` when the page has no usable FAQ.
 *
 * `null` rather than an empty `mainEntity`, because an `FAQPage` claiming no
 * questions is a validation error, and because the acceptance criterion is that
 * a page without an FAQ block emits nothing at all.
 */
export const faqSchema = ({
  layout,
  locale,
  path,
}: {
  layout: unknown
  locale: Locale
  path: string
}): Record<string, unknown> | null => {
  const entries = faqEntries(layout)

  if (entries.length === 0) {
    return null
  }

  return prune({
    '@context': SCHEMA_CONTEXT,
    '@id': nodeId(path, 'faq'),
    '@type': 'FAQPage',
    inLanguage: inLanguage(locale),
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
      name: entry.question,
    })),
    url: absoluteUrl(path),
  })
}
