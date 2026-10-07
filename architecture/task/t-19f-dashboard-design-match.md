# T-19F · Dashboard design match

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-19f-dashboard-design-match` |
| Depends on | T-19C, T-17A |

## Goal

Match `design/phase3/autowash-dashboard-desktop.png`,
`design/phase3/autowash-dashboard-mobile.png`, and
`design/phase3/dashboard.html` in the live Payload dashboard. The yellow
"design preview" strip belongs to the reference artifact, not the CMS.

## Implementation boundary

- Keep `admin.dashboard.widgets` and the existing server-side recent-content
  query. Real documents appear when available; an empty account gets the honest
  empty state. Do not reproduce the reference's sample text as fake records.
- Use Payload's `header`, `beforeNav`, and `beforeNavLinks` slots for the brand,
  Dashboard link, and native mobile menu toggle. Keep Payload's native
  collection and global navigation.
- Scope dashboard canvas, typography, and widget placement rules to the
  dashboard. Do not replace the list, edit, or field views.
- Use the shared `next/font` Inter families in the admin document. Do not import
  the public Tailwind stylesheet into Payload.
- Resolve the existing A12 lower-panel stacking gap by laying out the four
  native widgets as a two-column grid above 1100px.
- Match the reference's English “Media” label in the collection navigation and
  card. The Vietnamese collection label remains “Hình ảnh”.
- The new Workspace rail caption reads from the admin translation catalog;
  its Vietnamese entry is `TODO(copy)` until approved wording is supplied.

## Acceptance

- Desktop 1440px: 244px slate rail with a red current-page pill; 72px light
  header; content begins 32px inside the work area; three equal cards; recent
  content and editorial checklist share a 60/40 row.
- Mobile 390px: 90px slate brand bar with a functional Menu button; 72px light
  header; 20px content gutters; full-width Create page action; cards and lower
  panels stack in the reference order.
- The Dashboard link exposes `aria-current="page"`; native Pages navigation,
  editor access, keyboard focus, and menu open/close still work.
- Both content locales and Payload's account theme remain usable. No
  horizontal overflow at 320px, 390px, 701px, 900px, or 1440px.
- The production build, lint, typecheck, and tests pass. The generated Payload
  import map is committed. The Media label change produces no schema migration.
