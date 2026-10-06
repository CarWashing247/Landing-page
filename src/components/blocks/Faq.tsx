import type { Page } from '../../payload-types'
import { Band } from './shared'

type FaqBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'faq' }>

/**
 * The questions, as native disclosures.
 *
 * `<details>`/`<summary>` rather than a React accordion: it expands with no
 * JavaScript, the answers are in the HTML for a crawler whether or not anything
 * hydrates, and it needs no `aria-expanded` bookkeeping because the browser owns
 * the state. The same reasoning as the header's mobile menu in T-16 — and there,
 * it was measured working with JavaScript disabled.
 *
 * The answers are also the input to T-14's `FAQPage` schema, which reads the
 * stored block rather than this markup. The two never disagree because neither
 * derives from the other.
 */
export const Faq = ({ block }: { block: FaqBlock }) => (
  <Band>
    {block.heading ? <h2 className="text-h2">{block.heading}</h2> : null}
    <div className="border-border mt-10 border-t">
      {(block.items ?? []).map((item) => (
        <details className="border-border border-b py-4" key={item.id ?? item.question}>
          <summary className="text-h3 cursor-pointer py-1">{item.question}</summary>
          <p className="text-body text-secondary mt-3">{item.answer}</p>
        </details>
      ))}
    </div>
  </Band>
)
