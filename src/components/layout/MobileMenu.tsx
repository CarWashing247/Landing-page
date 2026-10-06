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
 * **It is `md:hidden`, and the desktop navigation is a separate list.** The
 * first attempt put one list inside this element and tried to reveal it at
 * desktop width with `md:block` on the panel. Measured in Chrome: the links were
 * invisible on desktop. A closed `<details>` hides its content through the user
 * agent stylesheet, and a `display` rule on the child does not override that —
 * there is no CSS that forces a `<details>` open. Rendering the list twice from
 * the same `NAV` array is the honest fix: five extra anchors in the markup, and
 * no way for the two to drift, because neither is a copy of the other.
 */
export const MobileMenu = ({ children, label }: { children: ReactNode; label: string }) => (
  <details className="relative md:hidden">
    <summary
      // `list-none` plus the webkit rule removes the default disclosure
      // triangle; the glyph below is the control's visible affordance.
      className="text-on-primary flex cursor-pointer list-none items-center rounded-lg p-3 marker:content-none [&::-webkit-details-marker]:hidden"
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="text-h3 leading-none">
        ☰
      </span>
    </summary>

    <div className="bg-primary absolute inset-x-0 top-full z-50 border-t border-white/10 p-4">
      {children}
    </div>
  </details>
)
