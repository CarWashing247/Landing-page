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

type Entry = { description: string; href: string; ordinal: string; title: string }

const ENTRIES: Entry[] = [
  {
    description: 'Build and update landing content with reusable blocks.',
    href: '/admin/collections/pages',
    ordinal: '01',
    title: 'Pages',
  },
  {
    description: 'Keep packages, prices, durations, and included items accurate.',
    href: '/admin/collections/services',
    ordinal: '02',
    title: 'Services',
  },
  {
    description: 'Manage images and localized alternative text.',
    href: '/admin/collections/media',
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
            □
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
