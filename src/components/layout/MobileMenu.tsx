import type { ReactNode } from 'react'

/**
 * The mobile navigation disclosure, with no client directive anywhere in it.
 *
 * **T-16's task file asks for a React client leaf holding a boolean. That
 * conflicts with T-20**, whose acceptance criterion is that no client component
 * sits above the fold, and a header is the most above-the-fold thing there is. A
 * native `<details>` satisfies both: browsers have implemented it for a decade,
 * screen readers announce its expanded state, and it ships no JavaScript.
 *
 * It is also better on the criterion this task does state. A React toggle leaves
 * the links in the HTML but inert until hydration, so with JavaScript disabled
 * they are present and unreachable — sealed behind a button that does nothing.
 * This opens with no script, which was verified in a real browser with
 * JavaScript turned off.
 *
 * **The panel is positioned against the header, not against this element.**
 * `absolute inset-x-0` resolves to the nearest positioned ancestor; while that
 * was this `<details>`, the panel inherited the width of the hamburger — a 44px
 * sliver beside the button, with every link wrapped to one character per line.
 * It had been that way since the menu was built, because every check asserted
 * the links were present and visible and none measured them. The header carries
 * `relative` now, so `inset-x-0` spans the page.
 *
 * **It is `nav:hidden`, and the desktop navigation is a separate list.** The
 * first attempt put one list inside this element and tried to reveal it at
 * desktop width with `md:block` on the panel. Measured in Chrome: the links were
 * invisible on desktop. A closed `<details>` hides its content through the user
 * agent stylesheet, and a `display` rule on the child does not override that —
 * there is no CSS that forces a `<details>` open. Rendering the list twice from
 * the same `NAV` array is the honest fix: five extra anchors in the markup, and
 * no way for the two to drift, because neither is a copy of the other.
 */
export const MobileMenu = ({ children, label }: { children: ReactNode; label: string }) => (
  <details className="nav:hidden">
    <summary
      // `list-none` plus the webkit rule removes the default disclosure
      // triangle; the mark below is the control's visible affordance.
      className="border-border text-ink hover:border-slate hover:bg-mist grid min-h-11 min-w-11 cursor-pointer list-none place-items-center rounded-[10px] border marker:content-none [&::-webkit-details-marker]:hidden"
    >
      <span className="sr-only">{label}</span>
      {/*
        Three bars drawn as an SVG, which is what the prototype's `.menu__lines`
        draws: 18×2px, 2px radius, in ink. It was a `☰` character, and a glyph
        is whatever the platform font has — different weight and width on
        Android, iOS and Windows, and sized by the type scale rather than by the
        design. `aria-hidden` because the `sr-only` label above names the
        control.
      */}
      <svg
        aria-hidden="true"
        fill="currentColor"
        height="14"
        viewBox="0 0 18 14"
        width="18"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect height="2" rx="1" width="18" y="0" />
        <rect height="2" rx="1" width="18" y="6" />
        <rect height="2" rx="1" width="18" y="12" />
      </svg>
    </summary>

    <div className="bg-surface border-border absolute inset-x-0 top-full z-50 border-t p-4 shadow-card">
      {children}
    </div>
  </details>
)
