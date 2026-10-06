import type { Page } from '../../payload-types'
import { Band, SectionHeading } from './shared'

type StepsBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'steps' }>

/**
 * The numbered sequence, as the prototype's `.steps` grid of bordered cards.
 *
 * An `<ol>`, because the order is the meaning — a screen reader should say "list
 * of 3 items" and the steps should stay in order with styles off. The visible
 * `01`, `02`, `03` come from the index rather than a field, so reordering in the
 * admin can never leave the numbers wrong, and they are `aria-hidden` because
 * they restate the list position assistive technology already announces.
 */
export const Steps = ({ block }: { block: StepsBlock }) => (
  <Band id="process" tone="white">
    <SectionHeading eyebrow={block.eyebrow} heading={block.heading} note={block.note} />
    <ol className="grid gap-4 md:grid-cols-3">
      {(block.steps ?? []).map((step, index) => (
        <li
          className="border-border rounded-card bg-surface flex min-h-60 flex-col border p-7"
          key={step.id ?? step.title}
        >
          <span aria-hidden="true" className="font-display text-action text-[2rem] leading-none font-extrabold">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="mt-7">{step.title}</h3>
          {step.body ? <p className="text-secondary mt-2">{step.body}</p> : null}
        </li>
      ))}
    </ol>
  </Band>
)
