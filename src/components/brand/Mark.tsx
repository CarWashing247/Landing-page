/**
 * The AutoWash247 mark: `A/` in a rounded action-red square.
 *
 * Straight from `design/phase3/landing.html`'s `.brand__mark`. It replaces the
 * droplet an earlier revision drew — the prototypes are the design source, and
 * this is the mark they use.
 *
 * **It carries no business name.** `A/` is a logo glyph, not the brand name:
 * the name lives in `SiteSettings.brandName`, and the header composes the two,
 * so renaming the business stays a CMS edit rather than a redraw.
 *
 * Drawn as an element rather than an SVG because it is a letterform in the
 * project's own display face — an SVG would either embed a path that stops
 * matching the font or reference a font it cannot guarantee.
 */
export const Mark = ({ className = '' }: { className?: string }) => (
  <span
    aria-hidden="true"
    className={`bg-action text-on-action font-display grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] text-[0.9rem] font-extrabold tracking-[-0.1em] ${className}`}
  >
    A/
  </span>
)
