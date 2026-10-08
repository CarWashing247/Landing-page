import type { Page } from '../../payload-types'
import { SiteIcon, type SiteIconName } from '../brand/SiteIcon'
import { Band, SectionHeading } from './shared'

type StepsBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'steps' }>

/** Icons follow the action named by the editor, even when steps are reordered. */
const iconForStep = (title: string): SiteIconName | null => {
  const action = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  if (/\b(qr|scan|quet)\b/.test(action)) return 'qr-scan'
  if (/\b(chon|choose|select|package|goi)\b/.test(action)) return 'package'
  if (/\b(rua|wash)\b/.test(action)) return 'wash-arch'

  return null
}

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
      {(block.steps ?? []).map((step, index) => {
        const icon = iconForStep(step.title)

        return (
          <li
            className="border-border rounded-card bg-surface flex min-h-60 flex-col border p-7"
            key={step.id ?? step.title}
          >
            <div className="flex items-start justify-between gap-3">
              <span aria-hidden="true" className="font-display text-action text-[2rem] leading-none font-extrabold">
                {String(index + 1).padStart(2, '0')}
              </span>
              {icon ? <SiteIcon name={icon} /> : null}
            </div>
            <h3 className="mt-7">{step.title}</h3>
            {step.body ? <p className="text-secondary mt-2">{step.body}</p> : null}
          </li>
        )
      })}
    </ol>
  </Band>
)
