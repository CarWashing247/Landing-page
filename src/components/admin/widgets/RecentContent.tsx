import { getPayload } from '../../../lib/payload'
import { Empty, Panel, PanelHead } from './shared'

/**
 * The most recently edited documents, or an honest empty state.
 *
 * **It reads Payload's own data and keeps no store of its own** — the design's
 * stated boundary for this view. One query per collection, `depth: 0`, five
 * rows, newest first, `overrideAccess: false` so an editor sees only what their
 * role allows rather than a dashboard that lists documents they cannot open.
 *
 * `updatedAt` is not localized (one row, one timestamp — see T-13), so the
 * listing is locale-independent and the admin's own language, not the content
 * locale, decides the chrome around it.
 *
 * A failure renders the empty state rather than throwing: the dashboard is the
 * first screen after login, and a broken panel there reads as a broken CMS.
 */

type Row = { collection: string; href: string; id: number | string; title: string; updatedAt: string }

const recent = async (): Promise<Row[]> => {
  try {
    const payload = await getPayload()

    const results = await Promise.all(
      (['pages', 'services'] as const).map(async (collection) => {
        const { docs } = await payload.find({
          collection,
          depth: 0,
          limit: 5,
          overrideAccess: false,
          select: { name: true, title: true, updatedAt: true },
          sort: '-updatedAt',
        })

        return docs.map((doc) => {
          const record = doc as Record<string, unknown>

          return {
            collection,
            href: `/admin/collections/${collection}/${String(record.id)}`,
            id: record.id as number | string,
            // `Pages` calls it `title` and `Services` calls it `name`.
            title: String(record.title ?? record.name ?? record.id),
            updatedAt: String(record.updatedAt ?? ''),
          }
        })
      }),
    )

    return results
      .flat()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
  } catch {
    return []
  }
}

export const RecentContentWidget = async () => {
  const rows = await recent()

  return (
    <Panel>
      <PanelHead
        action={
          <a className="pd-panel__action" href="/admin/collections/pages">
            View all
          </a>
        }
        title="Recent content"
      />

      {rows.length === 0 ? (
        <Empty
          detail="Nothing has been created yet. This panel lists real documents only — it does not invent pages, dates, or publication states."
          title="Content appears here when available."
        />
      ) : (
        <ul className="pd-list">
          {rows.map((row) => (
            <li className="pd-list__row" key={`${row.collection}-${row.id}`}>
              <a className="pd-list__link" href={row.href}>
                {row.title}
              </a>
              <span className="pd-list__meta">{row.collection}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
