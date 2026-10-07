import NextImage from 'next/image'

import type { Media } from '../../payload-types'

/**
 * The pieces every block shares, matching `design/phase3/landing.html`.
 *
 * Keeping the wrapper, the section heading and the button here is what makes
 * "every section is 1120px wide with the same gutters" and "every button is the
 * same control" true by construction rather than by each block remembering.
 */

/**
 * The content column: `min(1120px, 100% - 40px)`, straight from the prototype's
 * `.wrap`. The gutter is part of the width calculation rather than padding, so
 * a full-bleed background can sit outside it while the text stays aligned with
 * every other section.
 */
export const Wrap = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-auto w-[min(1120px,calc(100%-40px))] ${className}`}>{children}</div>
)

/** The small capitalised label above a heading. */
export const Eyebrow = ({ children, tone = 'action' }: { children: React.ReactNode; tone?: 'action' | 'soft' }) => (
  <span
    className={`text-eyebrow block uppercase ${tone === 'soft' ? 'text-action-soft' : 'text-action'}`}
  >
    {children}
  </span>
)

/**
 * A block's outer band. `white` is the prototype's `.section--white`, which
 * alternates with the paper background so adjacent sections separate without a
 * rule between them.
 */
export const Band = ({
  children,
  id,
  tone = 'paper',
}: {
  children: React.ReactNode
  id?: string
  tone?: 'paper' | 'white'
}) => (
  <section className={tone === 'white' ? 'bg-surface' : 'bg-paper'} id={id}>
    <div className="py-15 md:py-22">
      <Wrap>{children}</Wrap>
    </div>
  </section>
)

/**
 * Heading on the left, an optional note on the right — the prototype's
 * `.section-heading`, which is a flex row aligned to the baseline on wide
 * screens and stacks on a phone.
 *
 * The heading is capped at 15ch so it wraps where the prototype wraps it;
 * without that cap a short Vietnamese heading runs across the full column and
 * the layout stops looking deliberate.
 */
export const SectionHeading = ({
  eyebrow,
  heading,
  note,
}: {
  eyebrow?: null | string
  heading?: null | string
  note?: null | string
}) =>
  heading || eyebrow || note ? (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
      <div>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        {heading ? <h2 className="mt-2 max-w-[15ch] text-balance">{heading}</h2> : null}
      </div>
      {note ? <p className="text-secondary max-w-[27rem] md:mb-1">{note}</p> : null}
    </div>
  ) : null

/**
 * A relationship field is `number | Media` depending on `depth`. The pages read
 * at `depth: 1`, so it is the object — but the type cannot know that, and a
 * block whose image failed to populate should render nothing rather than crash.
 */
export const asMedia = (value: Media | null | number | undefined): Media | undefined =>
  typeof value === 'object' && value !== null ? value : undefined

/**
 * The only `next/image` call in the blocks. `priority` is passed in rather than
 * decided here: exactly one image on a page should have it — the hero's — and
 * everything else stays lazy, which T-20 checks.
 */
export const BlockImage = ({
  className = '',
  image,
  priority = false,
  sizes = '(min-width: 900px) 50vw, 100vw',
}: {
  className?: string
  image: Media
  priority?: boolean
  sizes?: string
}) =>
  image.url ? (
    <NextImage
      alt={image.alt ?? ''}
      className={className}
      height={image.height ?? 630}
      priority={priority}
      sizes={sizes}
      src={image.url}
      width={image.width ?? 1200}
    />
  ) : null

/**
 * A call to action, rendered only when it has both a label and a destination.
 *
 * Half-filled is the common editor state — a label typed and the link forgotten
 * — and a button that goes nowhere is worse than no button. 48px minimum height
 * is the prototype's, and it is also the touch-target floor.
 */
export const Action = ({
  className = '',
  href,
  label,
  tone = 'primary',
}: {
  className?: string
  href?: null | string
  label?: null | string
  tone?: 'outline' | 'primary'
}) =>
  label && href ? (
    <a
      className={`text-label rounded-control inline-flex min-h-12 items-center justify-center px-5 font-bold no-underline ${
        tone === 'primary'
          ? 'bg-action hover:bg-action-hover text-on-action'
          : 'bg-surface border-border text-ink hover:border-slate border'
      } ${className}`}
      href={href}
    >
      {label}
    </a>
  ) : null
