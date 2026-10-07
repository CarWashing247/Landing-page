import type { Page } from '../../payload-types'
import { Action, Eyebrow, Wrap } from './shared'

type CtaBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'cta' }>

/**
 * The closing panel.
 *
 * A rounded slate card **inside** the content column, not a full-bleed band —
 * that is what `design/phase3/landing.html` draws, and the difference matters:
 * the panel's rounded corners read as a deliberate object at the end of the
 * page, where edge-to-edge colour reads as another section.
 *
 * `<h2>`, never `<h1>` — only `Hero` owns that. The eyebrow takes the soft tint
 * because the action red is unreadable on slate.
 */
export const Cta = ({ block }: { block: CtaBlock }) => (
  <section className="bg-paper py-15 md:py-22">
    <Wrap>
      <div className="bg-slate text-on-slate rounded-[24px] p-8 md:flex md:items-center md:justify-between md:gap-8 md:p-12">
        <div>
          {block.eyebrow ? <Eyebrow tone="soft">{block.eyebrow}</Eyebrow> : null}
          <h2 className="text-panel mt-2 max-w-[18ch] text-balance">{block.heading}</h2>
          {block.body ? <p className="mt-3 opacity-80">{block.body}</p> : null}
        </div>
        <Action className="mt-6 w-full md:mt-0 md:w-auto" href={block.ctaHref} label={block.ctaLabel} />
      </div>
    </Wrap>
  </section>
)
