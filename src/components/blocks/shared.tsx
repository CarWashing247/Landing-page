import NextImage from 'next/image'

import type { Media } from '../../payload-types'

/**
 * The pieces every block shares: the section wrapper, the action button, and
 * the one place `next/image` is called.
 *
 * Keeping these here rather than repeating them per block is what makes "every
 * image goes through `next/image`" and "no raw hex in a component" true by
 * construction instead of by review.
 */

/**
 * A block's outer band.
 *
 * Every block is a `<section>`, so the page is a sequence of landmarks rather
 * than a soup of divs, and the container width lives in exactly one place —
 * which matters because the designs ask for a max-width container with even
 * gutters and T-15 deliberately did not invent one.
 */
export const Band = ({
  children,
  tone = 'paper',
}: {
  children: React.ReactNode
  /**
   * `paper` and `surface` alternate down the page so adjacent sections separate
   * without a rule between them; `ink` is the dark closing band.
   */
  tone?: 'ink' | 'paper' | 'surface'
}) => (
  <section
    className={
      tone === 'ink'
        ? 'bg-ink text-on-ink'
        : tone === 'surface'
          ? 'bg-surface text-ink'
          : 'bg-paper text-ink'
    }
  >
    {/*
      1120px of content with 20px gutters that open to 32px from tablet width,
      as the interface direction specifies. One place, so no section invents its
      own width.
    */}
    <div className="mx-auto max-w-(--container-content) px-5 py-16 md:px-8 md:py-24">
      {children}
    </div>
  </section>
)

/**
 * A relationship field is `number | Media` depending on `depth`. The pages read
 * at `depth: 1`, so it is the object — but the type cannot know that, and a
 * block whose image failed to populate should render nothing rather than crash
 * the page it sits on.
 */
export const asMedia = (value: Media | null | number | undefined): Media | undefined =>
  typeof value === 'object' && value !== null ? value : undefined

/**
 * The only `next/image` call in the blocks.
 *
 * `priority` is passed in rather than decided here: exactly one image on a page
 * should have it — the hero's — and everything else must stay lazy, which is a
 * T-20 criterion. Width and height come from the stored dimensions so the
 * browser reserves the right box and the image contributes no layout shift.
 */
export const BlockImage = ({
  image,
  priority = false,
  sizes = '(min-width: 768px) 50vw, 100vw',
}: {
  image: Media
  priority?: boolean
  sizes?: string
}) =>
  image.url ? (
    <NextImage
      alt={image.alt ?? ''}
      className="rounded-card h-auto w-full"
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
 * Half-filled is the common editor state — a label typed and the link
 * forgotten — and a button that goes nowhere is worse than no button.
 */
export const Action = ({
  href,
  label,
  tone = 'action',
}: {
  href?: null | string
  label?: null | string
  tone?: 'action' | 'outline'
}) =>
  label && href ? (
    <a
      className={
        tone === 'action'
          ? 'bg-action hover:bg-action-hover text-on-action text-label rounded-control inline-flex min-h-12 items-center px-5 font-bold no-underline transition-colors'
          : 'bg-surface border-border text-ink hover:border-slate text-label rounded-control inline-flex min-h-12 items-center border px-5 font-bold no-underline transition-colors'
      }
      href={href}
    >
      {label}
    </a>
  ) : null
