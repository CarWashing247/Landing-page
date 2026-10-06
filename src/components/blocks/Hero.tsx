import type { Page } from '../../payload-types'
import { Action, BlockImage, asMedia } from './shared'

type HeroBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'hero' }>

/**
 * The opening band, and the only block that emits `<h1>`.
 *
 * `Pages` refuses a second hero, so this can emit the heading unconditionally.
 * `ContentPage` suppresses its own fallback `<h1>` when a hero is present, which
 * is the other half of "exactly one `<h1>` per page".
 *
 * The image is the only one on the site with `priority`: it is the largest thing
 * above the fold and therefore almost always the LCP element, so it must not
 * wait behind lazy loading. Everything below it stays lazy, which T-20 checks.
 */
export const Hero = ({ block }: { block: HeroBlock }) => {
  const image = asMedia(block.image)

  return (
    <section className="bg-paper text-ink">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2 md:py-20">
        <div>
          <h1 className="text-display">{block.heading}</h1>
          {block.subheading ? <p className="text-body mt-4 opacity-80">{block.subheading}</p> : null}
          <div className="mt-8">
            <Action href={block.ctaHref} label={block.ctaLabel} />
          </div>
        </div>
        {image ? <BlockImage image={image} priority /> : null}
      </div>
    </section>
  )
}
