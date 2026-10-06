import type { Page } from '../../payload-types'
import { Action, Band } from './shared'

type CtaBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'cta' }>

/** The closing band. `<h2>`, never `<h1>` — only `Hero` owns that. */
export const Cta = ({ block }: { block: CtaBlock }) => (
  <Band tone="primary">
    <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-h2">{block.heading}</h2>
        {block.body ? <p className="text-body mt-2 opacity-80">{block.body}</p> : null}
      </div>
      <Action href={block.ctaHref} label={block.ctaLabel} />
    </div>
  </Band>
)
