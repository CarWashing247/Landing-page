# T-15C · Phase 3 interface direction

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-15c-phase3-interface-direction` |
| Depends on | T-15B, T-16, T-17 |
| Status | **merged** (PR #34) |

## What it did

Adopted the design from the local branch `design/phase3-uiux-promax` as the
Phase 3 visual source, and implemented its tokens and typography.

Brought in `architecture/phase3-uiux-promax.md` and the prototypes in
`design/phase3/` — `landing.html`, `admin.html`, `dashboard.html`, `tokens.css`
and the PNG captures. **The 68 vendored copies of the `ui-ux-pro-max` skill on
that branch were deliberately left behind**: they are a plugin cache, not project
source, and ~69k lines of a skill's own test suite inside the application repo
would be hard to unpick later.

| | Before (T-15B) | After |
| --- | --- | --- |
| Palette | green `#059669` / orange | ink `#0F172A`, slate `#1E293B`, action red `#C62929`, paper `#F8FAFC` |
| Type | Inter only | Inter Tight display + Inter body, both `vietnamese` |
| Radii | five steps | 12px control, 20px card |
| Width | `max-w-6xl` | 1120px |

## Why the direction document won

It is more project-aware than the generated system it replaced: it reasons about
crawlers receiving all content in the first HTML response, Vietnamese diacritics
and longer translated labels, and prices and hours being content rather than
decoration. It independently reaches the same conclusion as T-19B — "the admin
design configures Payload; it does not replace its list or edit views" — and it
refuses to invent business data, labelling the prototypes' cards "PRICE FROM CMS"
and the footer "TODO(data)".

## What it found

- **Headings were invisible on dark bands.** Base headings were hard-set to
  `ink`; inside the dark closing band that is ink on ink, so the CTA rendered its
  body text and no heading. It read as a content problem rather than a CSS one.
  Headings now inherit, so `body` sets ink, a dark band sets `on-ink`, and a
  heading an editor types into rich text is right in either place. Measured
  after: 17.85:1, from invisible.
- **A broken hero image was stale seed data**, not a pipeline fault — `wash.png`
  served 200 while the referenced `.jpg` 500'd.

## Deviations from the prototypes, and why

The prototypes' `tokens.css` uses a Google Fonts `@import`; it is a standalone
HTML file with no build step. The application loads both families through
`next/font`, which the direction document itself asks for — that keeps T-15's
zero-third-party-request criterion and the metric-matched fallback holding CLS at
0. The prototypes' global `* { transition }` reset was also not copied; Tailwind
scopes transitions per utility and a global one animates properties that should
change instantly.

## It answered an open decision

The direction document records the user-selected answer to **D1**: `/` becomes a
`Pages` document with reserved slug `home`. T-17A moved from "cannot start
without this" to answered, and `/home` must 404 with exactly one sitemap entry
per locale.
