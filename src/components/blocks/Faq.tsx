import type { Page } from '../../payload-types'
import { SiteIcon } from '../brand/SiteIcon'
import { Band, Eyebrow } from './shared'

type FaqBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'faq' }>

/**
 * The questions, as native disclosures in the prototype's two-column layout:
 * the heading holds the narrow column, the questions the wide one.
 *
 * `<details>`/`<summary>` rather than a React accordion: it expands with no
 * JavaScript, the answers are in the HTML for a crawler whether or not anything
 * hydrates, and the browser owns the expanded state so there is no
 * `aria-expanded` to keep in sync.
 *
 * The answers are also the input to T-14's `FAQPage` schema, which reads the
 * stored block rather than this markup — the two cannot disagree because neither
 * derives from the other.
 */
export const Faq = ({ block }: { block: FaqBlock }) => (
  <Band id="faq" tone="white">
    <div className="grid gap-8 md:grid-cols-[0.75fr_1.25fr] md:gap-12">
      <div>
        <SiteIcon className="mb-4" name="help" />
        {block.eyebrow ? <Eyebrow>{block.eyebrow}</Eyebrow> : null}
        {block.heading ? <h2 className="text-section mt-2">{block.heading}</h2> : null}
        {block.note ? <p className="text-secondary mt-4">{block.note}</p> : null}
      </div>

      <div>
        {(block.items ?? []).map((item) => (
          <details className="border-border border-b" key={item.id ?? item.question}>
            <summary className="hover:text-action cursor-pointer py-5 pr-8 font-bold">{item.question}</summary>
            <p className="text-secondary max-w-[60ch] pb-5">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  </Band>
)
