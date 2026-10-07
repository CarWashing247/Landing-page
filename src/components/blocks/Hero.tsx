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

          {/*
            `clamp(3.1rem, 5.4vw, 5.8rem)` and the h1's own 1.12 leading, both
            straight from the prototype — the floor was 3rem and the leading was
            overridden to 1.02, which set the phone heading a step small and the
            wide one tighter than anything else on the page.
          */}
          <h1 className="mt-4 mb-5 max-w-[11ch] text-[clamp(3.1rem,5.4vw,5.8rem)] text-balance">
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
        ) : (
          <HeroVisual />
        )}
      </Wrap>
    </section>
  )
}

/**
 * The prototype's abstract wash panel, drawn when the editor has not set an
 * image yet.
 *
 * Without it a hero with no image leaves the right half of the desktop grid
 * empty, and the page loses the one dark surface above the fold that the
 * design leans on. It is pure decoration — CSS and an inline SVG, no request,
 * no text — so it is `aria-hidden`, says nothing a screen reader should read
 * out, and cannot become the LCP element. An uploaded image replaces it.
 *
 * Every colour is a token: the prototype's hex values map onto `ink`, `slate`,
 * `secondary`, `mist`, `border` and `action`.
 */
const HeroVisual = () => (
  <div
    aria-hidden="true"
    className="shadow-card relative min-h-[330px] overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_75%_20%,var(--color-secondary)_0,var(--color-slate)_42%,var(--color-ink)_88%)] md:min-h-[500px]"
  >
    {/* Two rings, the prototype's ::before and ::after. */}
    <span className="border-on-slate/15 absolute top-[-37%] left-[46%] h-[650px] w-[650px] rounded-full border" />
    <span className="border-on-slate/15 absolute top-[-16%] left-[60%] h-[460px] w-[460px] rounded-full border" />

    {/* The wash-bay floor: faint lanes receding in perspective. */}
    <span className="absolute inset-x-0 bottom-0 h-2/5 origin-bottom [transform:perspective(240px)_rotateX(25deg)] bg-[repeating-linear-gradient(90deg,transparent_0_70px,color-mix(in_srgb,var(--color-on-slate)_6%,transparent)_71px_72px)]" />

    <svg
      className="absolute top-[37%] left-[9%] w-[82%] drop-shadow-[0_18px_25px_rgb(0_0_0/38%)]"
      fill="none"
      viewBox="0 0 540 240"
    >
      <path
        className="fill-mist"
        d="M69 142h38l42-66c9-15 25-25 43-25h139c19 0 37 9 48 25l45 66h39c22 0 39 17 39 39v16H37v-16c0-22 14-39 32-39Z"
      />
      <path className="fill-secondary" d="m160 133 39-60h127c18 0 25 3 35 18l29 42H160Z" />
      <path className="stroke-border" d="M54 183h432" strokeWidth="5" />
      <circle className="fill-ink" cx="145" cy="190" r="31" />
      <circle className="fill-border" cx="145" cy="190" r="14" />
      <circle className="fill-ink" cx="399" cy="190" r="31" />
      <circle className="fill-border" cx="399" cy="190" r="14" />
      <path className="stroke-action" d="M51 155h53m350 0h32" strokeLinecap="round" strokeWidth="9" />
    </svg>
  </div>
)
