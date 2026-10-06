import type { Page } from '../../payload-types'
import { Action, BlockImage, Eyebrow, Wrap, asMedia } from './shared'

type HeroBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'hero' }>

/**
 * The opening band, and the only block that emits `<h1>`.
 *
 * Two columns at desktop and one on a phone, matching the prototype's `.hero`.
 * The heading is capped at 11ch and set in a fluid clamp so it breaks into the
 * two or three short lines the design shows at every width — a fixed size either
 * overflows on a phone or looks timid on a wide screen, and Vietnamese headings
 * run longer than the English ones the prototype was drawn with.
 *
 * The image sits in a dark rounded panel rather than bleeding onto the page: in
 * the prototype that panel is the only dark surface above the fold and it is
 * what makes the white header read as a header.
 *
 * It is the one image on the site with `priority`. It is the largest thing above
 * the fold and so almost always the LCP element; everything below stays lazy.
 */
export const Hero = ({ block }: { block: HeroBlock }) => {
  const image = asMedia(block.image)

  return (
    <section className="bg-paper">
      <Wrap className="grid items-center gap-6 py-12 md:grid-cols-[1.02fr_0.98fr] md:gap-12 md:py-20">
        <div>
          {block.eyebrow ? <Eyebrow>{block.eyebrow}</Eyebrow> : null}

          <h1 className="mt-4 mb-5 max-w-[11ch] text-[clamp(3rem,5.4vw,5.8rem)] leading-[1.02] text-balance">
            {block.heading}
          </h1>

          {block.subheading ? (
            <p className="text-secondary max-w-[33rem] text-[1.15rem]">{block.subheading}</p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Action
              className="max-md:flex-1 max-md:basis-full"
              href={block.ctaHref}
              label={block.ctaLabel}
            />
            <Action
              className="max-md:flex-1 max-md:basis-full"
              href={block.secondaryCtaHref}
              label={block.secondaryCtaLabel}
              tone="outline"
            />
          </div>

          {/*
            The reassurances a visitor scans before clicking. The dot is drawn
            with a pseudo-element so it is decoration rather than content a
            screen reader has to read out.
          */}
          {block.highlights && block.highlights.length > 0 ? (
            <ul className="text-secondary text-label mt-9 flex flex-wrap gap-x-5 gap-y-2 font-semibold">
              {block.highlights.map((point) => (
                <li
                  className="before:bg-action flex items-center before:mr-2 before:inline-block before:h-[7px] before:w-[7px] before:rounded-full before:content-['']"
                  key={point.id ?? point.text}
                >
                  {point.text}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {image ? (
          <div className="bg-slate shadow-card relative min-h-[330px] overflow-hidden rounded-[28px] md:min-h-[500px]">
            <BlockImage
              className="absolute inset-0 h-full w-full object-cover"
              image={image}
              priority
            />
          </div>
        ) : null}
      </Wrap>
    </section>
  )
}
