import type { ReactNode } from 'react'

/**
 * The pieces the dashboard widgets share, matching
 * `design/phase3/dashboard.html`.
 *
 * These are plain elements with a `pd-` class prefix, styled by
 * `src/app/crm/admin.css`. They deliberately do **not** use the public site's
 * Tailwind utilities: the admin document never loads `globals.css`, because
 * Tailwind's preflight resets the elements Payload styles itself.
 */

/** A dashboard panel: white, bordered, on the card radius the prototype uses. */
export const Panel = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`pd-panel ${className}`}>{children}</section>
)

/** A panel's header row: title on the left, an optional action on the right. */
export const PanelHead = ({ action, title }: { action?: ReactNode; title: string }) => (
  <header className="pd-panel__head">
    <h2 className="pd-panel__title">{title}</h2>
    {action}
  </header>
)

/**
 * The empty state the prototype is explicit about: it says what will appear and
 * why nothing is there, and it **invents nothing** — no placeholder rows, no
 * sample dates, no fake authors. A dashboard that shows plausible-looking
 * content before any exists teaches an editor to distrust it.
 */
export const Empty = ({ detail, title }: { detail: string; title: string }) => (
  <div className="pd-empty">
    <span aria-hidden="true" className="pd-empty__mark">
      —
    </span>
    <p className="pd-empty__title">{title}</p>
    <p className="pd-empty__detail">{detail}</p>
  </div>
)
