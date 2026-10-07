import type { ReactNode } from 'react'

import { Panel } from './shared'

/**
 * The three collection cards from `design/phase3/dashboard.html`: what each
 * collection is for, and a way in.
 *
 * **No counts.** The prototype's own banner says "No invented counts or
 * content", and a count here would be a second query on every dashboard load to
 * tell an editor something the list view shows them anyway. The numbers in the
 * design are ordinals — 01, 02, 03 — not totals.
 *
 * Links are plain `<a href>` to Payload's own list routes rather than anything
 * clever: these are the routes the navigation already uses, and a hard
 * navigation into a list view is what an editor expects from a card.
 */

/**
 * **Each card has its own mark.** `dashboard.html` draws three different
 * glyphs — a plain frame for Pages, a divided one for Services, a hatched one
 * for Media — and all three cards here carried the same plain square. A repeated icon
 * is worse than none: it reads as a decoration the editor should ignore, in the
 * one place on the dashboard that is meant to be scanned rather than read.
 *
 * They are SVG rather than the prototype's box-drawing characters for the same
 * reason the block previews are (AGENT.md 5.6): a glyph is whatever the
 * platform font happens to have, and the box-drawing block is outside the
 * subset several of them ship. `aria-hidden`, because the card's heading names it.
 */
type Entry = { description: string; href: string; icon: ReactNode; ordinal: string; title: string }

const Frame = ({ children }: { children?: ReactNode }) => (
  <svg
    aria-hidden="true"
    fill="none"
    height="20"
    stroke="currentColor"
    strokeWidth="1.7"
    viewBox="0 0 20 20"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect height="15" rx="2.5" width="15" x="2.5" y="2.5" />
    {children}
  </svg>
)

const ENTRIES: Entry[] = [
  {
    description: 'Build and update landing content with reusable blocks.',
    href: '/admin/collections/pages',
    // A page: a heading rule and two lines of body.
    icon: (
      <Frame>
        <path d="M6 7h5M6 10.5h8M6 14h8" strokeLinecap="round" />
      </Frame>
    ),
    ordinal: '01',
    title: 'Pages',
  },
  {
    description: 'Keep packages, prices, durations, and included items accurate.',
    href: '/admin/collections/services',
    // A divided frame: the package and its price column.
    icon: (
      <Frame>
        <path d="M12 2.5v15" />
      </Frame>
    ),
    ordinal: '02',
    title: 'Services',
  },
  {
    description: 'Manage images and localized alternative text.',
    href: '/admin/collections/media',
    // An image: the horizon and the sun every picture placeholder draws.
    icon: (
      <Frame>
        <circle cx="7.5" cy="7.5" r="1.6" />
        <path d="m2.8 14.4 4-3.6 3.4 3 2.6-2.2 4.4 3.8" strokeLinecap="round" strokeLinejoin="round" />
      </Frame>
    ),
    ordinal: '03',
    title: 'Media',
  },
]

export const CollectionsWidget = () => (
  <div className="pd-cards">
    {ENTRIES.map((entry) => (
      <Panel className="pd-card" key={entry.href}>
        <div className="pd-card__top">
          <span aria-hidden="true" className="pd-card__icon">
            {entry.icon}
          </span>
          <span className="pd-card__ordinal">{entry.ordinal}</span>
        </div>
        <h2 className="pd-card__title">{entry.title}</h2>
        <p className="pd-card__body">{entry.description}</p>
        <a className="pd-card__link" href={entry.href}>
          Open {entry.title.toLowerCase()} →
        </a>
      </Panel>
    ))}
  </div>
)
