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
  tone = 'surface',
}: {
  children: React.ReactNode
  tone?: 'primary' | 'surface'
}) => (
  <section className={tone === 'primary' ? 'bg-primary text-on-primary' : 'bg-background text-foreground'}>
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">{children}</div>
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
      className="h-auto w-full rounded-xl"
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
  tone = 'accent',
}: {
  href?: null | string
  label?: null | string
  tone?: 'accent' | 'outline'
}) =>
  label && href ? (
    <a
      className={
        tone === 'accent'
          ? 'bg-accent text-on-accent text-label inline-block rounded-lg px-6 py-3 no-underline'
          : 'text-on-primary text-label inline-block rounded-lg border border-current px-6 py-3 no-underline'
      }
      href={href}
    >
      {label}
    </a>
  ) : null
