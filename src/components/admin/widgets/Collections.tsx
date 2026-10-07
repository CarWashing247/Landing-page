import type { WidgetServerProps } from 'payload'
import type { ReactNode } from 'react'

import type { AdminMessageKey } from '../../../i18n/admin-translations'
import { adminLabel, adminMessage } from '../../../i18n/admin-translations'
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
type Entry = {
  collection: 'media' | 'pages' | 'services'
  description: AdminMessageKey
  icon: ReactNode
  ordinal: string
}

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
    <rect height="13" rx="0.5" width="13" x="3.5" y="3.5" />
    {children}
  </svg>
)

const ENTRIES: Entry[] = [
  {
    collection: 'pages',
    description: 'dashboardPagesBody',
    icon: <Frame />,
    ordinal: '01',
  },
  {
    collection: 'services',
    description: 'dashboardServicesBody',
    // The prototype's divided service card.
    icon: (
      <Frame>
        <path d="M10 3.5v13" />
      </Frame>
    ),
    ordinal: '02',
  },
  {
    collection: 'media',
    description: 'dashboardMediaBody',
    // The prototype's hatched media tile.
    icon: (
      <Frame>
        <path d="m3.5 5 11.5 11.5M3.5 9l7.5 7.5M3.5 13l3.5 3.5M7.5 3.5l9 9M11.5 3.5l5 5M15.5 3.5l1 1" />
      </Frame>
    ),
    ordinal: '03',
  },
]

/**
 * **The card titles are the collections' own plural labels**, so the dashboard
 * names each collection exactly as the navigation does, in the panel language,
 * without a second copy of the wording that could drift from it.
 */
export const CollectionsWidget = ({ req }: WidgetServerProps) => (
  <div className="pd-cards">
    {ENTRIES.map((entry) => {
      const title = adminLabel(
        req,
        req.payload.collections[entry.collection]?.config.labels.plural,
        entry.collection,
      )

      return (
        <Panel className="pd-card" key={entry.collection}>
          <div className="pd-card__top">
            <span aria-hidden="true" className="pd-card__icon">
              {entry.icon}
            </span>
            <span className="pd-card__ordinal">{entry.ordinal}</span>
          </div>
          <h2 className="pd-card__title">{title}</h2>
          <p className="pd-card__body">{adminMessage(req, entry.description)}</p>
          <a className="pd-card__link" href={`/admin/collections/${entry.collection}`}>
            {adminMessage(req, 'dashboardOpenCollection', { collection: title.toLowerCase() })}
          </a>
        </Panel>
      )
    })}
  </div>
)
