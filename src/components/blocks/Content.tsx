import { RichText } from '@payloadcms/richtext-lexical/react'

import type { Page } from '../../payload-types'
import { Band } from './shared'

type ContentBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'content' }>

/**
 * The rich-text block T-06 added, rendered with Payload's own converter.
 *
 * Writing a Lexical-to-JSX walker by hand is the obvious trap here: it starts as
 * twenty lines for paragraphs and headings and grows every time an editor uses a
 * feature nobody implemented. `RichText` ships with the editor and tracks it.
 *
 * Headings an editor types land on the T-15 base element styles, which is what
 * those styles exist for — there is no opportunity to put a class on a heading
 * that came out of a database.
 */
export const Content = ({ block }: { block: ContentBlock }) => (
  <Band>
    <div className="max-w-3xl">
      <RichText data={block.richText} />
    </div>
  </Band>
)
