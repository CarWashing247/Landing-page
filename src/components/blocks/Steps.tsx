import type { Page } from '../../payload-types'
import { Band } from './shared'

type StepsBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'steps' }>

/**
 * The numbered sequence.
 *
 * An `<ol>`, because the order is the meaning — a screen reader should say "list
 * of 3 items" and the steps should stay in order with styles off. The visible
 * `01`, `02`, `03` come from the index rather than from a field, so reordering
 * in the admin can never leave the numbers wrong.
 *
 * `aria-hidden` on the number: it is a visual restatement of the list position,
 * which assistive technology already announces.
 */
export const Steps = ({ block }: { block: StepsBlock }) => (
  <Band>
    {block.heading ? <h2 className="text-h2">{block.heading}</h2> : null}
    <ol className="mt-10 grid gap-6 md:grid-cols-3">
      {(block.steps ?? []).map((step, index) => (
        <li className="border-border rounded-card bg-surface border p-6" key={step.id ?? step.title}>
          <p aria-hidden="true" className="text-h2 text-action">
            {String(index + 1).padStart(2, '0')}
          </p>
          <h3 className="text-h3 mt-2">{step.title}</h3>
          {step.body ? <p className="text-body mt-2">{step.body}</p> : null}
        </li>
      ))}
    </ol>
  </Band>
)
