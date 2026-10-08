# T-19H · Admin views design match

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-19h-admin-views-design-match` |
| Depends on | T-19F, T-19G (both merged) |

## Goal

Bring every Payload admin view other than the dashboard in line with the T-19G
references in [`design/phase3/`](../../design/phase3/README.md): the lists, the
document and global editors, the account screen and the login screen.

T-19F made the dashboard match its capture, and scoped every shell rule to
`:has(.dashboard)`. Opening Pages from the dashboard therefore dropped the
visitor back into Payload's default canvas. T-19G drew what the other views
should look like but changed no code. This task implements those drawings.

## Implementation boundary

This boundary is the one T-19C, T-19F and the T-19G handoff all draw. It is
binding:

- **Payload keeps every view.** No `components.views` replacement, no second
  admin router, no client-side data source. The change is `admin.css`, plus
  Payload-supported configuration where CSS cannot reach.
- **Native mechanics stay native**: search, filters, column picker,
  pagination, bulk selection, the locale selector, autosave/draft/publish,
  versions, live preview, uploads, the block picker and the last-admin guard.
  The references' HTML controls are visual examples, not replacements.
- **The reference's annotations are not product UI.** The yellow strip, the blue
  "Design decision" and "Implementation boundary" cards, and every sample row
  stay out of the CMS.
- **No invented data.** Lists show real documents or Payload's own empty state.
- **No `rem` in `admin.css`.** Payload's root is 13px, and a `rem` there renders at
  81% of the designed size (T-19E). Use absolute px, as the references do.

## In scope

| Surface | Reference | What changes |
| --- | --- | --- |
| Shell on every view | `dashboard.html` | The `#edf1f4` canvas, 72px white top bar, 32px desktop and 20px mobile gutters: the T-19F shell rules, unscoped from the dashboard |
| Collection lists | `pages-list`, `services-list`, `users`, `contact-submissions` | Display-weight title, the table as a white 20px-radius card with an uppercase header row, roomy rows, a 44px search field |
| Status column | `pages-list`, `services-list` | Published as a green pill and Draft as an amber pill, each with its text label (closes A13) |
| Lists at phone width | the same, `-mobile.png` | Rows become cards; the table must not scroll sideways |
| Document and global editors | `page-editor`, `services-editor`, `business-info`, `site-settings`, `user-editor`, `contact-detail` | Display-weight title, red underline on the current tab, 44px inputs with a 12px radius, the sidebar as a white card |
| Account | `account.html` | Uses the editor treatment above |
| Login | `login.html` | A slate brand header above a white form card, a full-width red Sign in button |

## Out of scope

- **The Media grid.** The handoff calls it "a proposed visual enhancement inside
  Payload [that] needs its own later implementation decision". Media keeps
  Payload's list, and gets the same list styling as the other collections.
- The reference's per-view descriptions and eyebrows ("Content workspace",
  "Page records"). Payload already renders a collection's `admin.description`
  under the title; adding new captions would be new copy without a source.
- Changes to fields, access or collection schema. No migration.

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [x] At 1440×900, Pages, Services, Media, Users and Contact submissions lists,
      the Page, Service and User editors, both globals, Account and Login follow
      their reference: rail, canvas, top bar, title, card, table and form
      treatment.
- [x] Published and Draft render as coloured pills beside Payload's own text
      label, and contrast is at least 4.5:1 as measured in the browser.
      *Narrowed:* "in both admin languages" could not be checked, because the
      admin offers English only (A15). The label is Payload's translated
      string, so it follows whichever language A15 enables.
- [x] At 390×844, no view scrolls horizontally
      (`document.documentElement.scrollWidth <= innerWidth`), and list rows
      render as cards.
- [x] Text inputs, selects and every text or toolbar action are at least 44px
      high, and keyboard focus stays visible on every restyled control.
      *Narrowed:* Payload's in-field icon affordances (a select's arrow, a row's
      menu, a tag's remove button) keep Payload's size. They sit inside a 44px
      control or row, and resizing them is the re-theme T-19B removed.
- [x] Search, the column drawer, row links, tab switching, the locale selector,
      the mobile menu and logout still work.
- [x] The dashboard is unchanged against its T-19F captures.
- [x] `npm run lint`, `npm run typecheck`, `npm test` and the production build
      pass. No schema migration is generated.

## Verification

Use an admin probe user, deleted afterwards, and the real Postgres. Capture
every view listed above at 1440×900 and 390×844 in Chromium, and compare each
against its reference PNG. Measure `scrollWidth`, the pill colours and the
control heights through `getComputedStyle`. Exercise search, a tab switch and
the mobile menu. Seed no content beyond what is already in the database.

## Outcome

**Implemented in `src/app/crm/admin.css` and `src/components/admin/Logo.tsx`.**
No view, field, collection or migration changed, and no component was added.

What was learned, for the next admin UI task:

- **Payload's styles are mostly in `@layer payload-default`**, so an unlayered
  rule in `admin.css` wins without fighting specificity. The exceptions found so
  far are T-19E's `:has()` rule and nothing in this task.
- **`--gutter-h` controls Payload's bleeds.** The tabs field and the account's
  settings dividers reach the page edge with `calc(var(--gutter-h) * -1)`.
  Inside a card, redefining `--gutter-h` as the card's padding keeps them in.
- **The account's Payload Settings panel renders inside the form gutter**, not
  after it. A rule written as if it were a sibling zeroed the card's padding.
- **The status cell already carries its value as a class** (`selected--draft`,
  `selected--published`). A13 needed CSS, not the custom cell it was waiting
  for.
- **Light theme only.** Every view rule is under `[data-theme='light']`. A user
  who picks Dark in the account menu keeps Payload's dark design; the rail,
  primary button and status pills (which carry their own background) are
  brand-wide.
  *Superseded by the review pass below:* the admin is now pinned to light, so
  no editor reaches the dark theme.

Fixed on the way, because this task owns phone-width overflow on every view:
a long breadcrumb (a user's email) and the save bar's metadata row both pushed
editors past 390px before this change; Account, Media detail and the User
editor overflowed on master.

### Verification run

All against the dev server and then `npm run build && npm run start`, real
Postgres, with an admin probe user created for the run and deleted afterwards.

- 13 views plus Login captured at 1440×900 and 390×844 in Chrome via Playwright,
  and compared against the T-19G PNGs. All 30 captures fit the viewport on the
  production server; three overflowed before this change.
- Status pills measured on computed styles: Published 5.63:1, Draft 8.63:1
  (Draft rendered in the browser on a real cell; no draft document was created).
- Every text and toolbar action measured at 44px; a focused field input shows a
  3px solid outline.
- Search (6 rows to 0), the column drawer, a row link, Content to SEO tab switch
  (active tab computed `rgb(198, 41, 41)`), the locale selector (`?locale=en`),
  the mobile menu and logout all exercised.
- The dashboard pixel-compared against its pre-change capture: identical once
  the breadcrumb rule was excluded from it.
- Dark theme: canvas and table stay Payload's own.
- `npm run lint`, `npm run typecheck`, `npm test` (324 passed) and
  `npm run build` all pass.

### Review pass: colours and values brought back to the reference

The admin was reported as not matching the references' colours. Comparing the
captures with `admin-reference.css` side by side found three causes:

- **The admin followed the operating system's theme.** Payload's default is
  `theme: 'all'`, so on a machine in dark mode the panel rendered Payload's
  dark design and none of the `[data-theme='light']` rules applied. The
  references are light only, so `payload.config.ts` now sets `theme: 'light'`.
  This removes Payload's Appearance setting from Account, although
  `account.html` draws one. A design that is only drawn in light cannot also
  follow a dark system.
- **The body font was Payload's system stack** (Arial on Linux), not Inter.
  `--font-body` now points at Inter, as `tokens.css` sets on `body`.
- **Many values had been rounded away from the reference**: cards with 20px
  radii where the reference has 16px, inputs at 12px radius with a `#c8d3dd`
  border where it has 9px and `#b9c8d3`, table cells at 15px with 22px padding
  where it has 13px and `18px 22px`, its own pill colours, tabs at
  `opacity: 0.5`, Payload's 60px gutter beside a 32px canvas, a white save bar
  and white overflow fades on the grey canvas, Payload's grey `#f5f5f5`
  auth-field plate and grey upload buttons, rail captions with the space under
  the label rather than above it, and captions that turned near-black on hover.
  Each now uses the value in `admin-reference.css`.

Also fixed: at 390px the editor's "Publish changes" was cut off under the save
bar's fade. The actions now wrap onto a second line.

Also fixed, on request: **A17**, the open phone menu widening the page to
577px, plus the duplicate logo and stray close button inside the drawer. The
drawer now starts at its first caption under the slate bar, as `.admin-rail`
does in the references.

Verified against `npm run build && npm run start`, with a Chromium context
set to **dark** colour scheme and an admin probe user, deleted afterwards. All
14 views were captured at 1440×900 and 390×844 and compared against the PNGs.
All of them render light, and none scrolls sideways with the menu closed.
Computed: canvas `rgb(237, 241, 244)`, Published pill `#116b52` on `#e1f4ed`,
active tab `rgb(198, 41, 41)`, inactive tab `rgb(71, 85, 105)` at full opacity,
a focused input 44px high with a 9px radius and a 3px solid outline. Search
(6 rows to 0), the SEO tab switch and the phone menu still work. `npm run lint`,
`npm run typecheck`, `npm test` (324 passed) and `npm run build` pass.

### Found, not fixed

- **A15** — the admin offers English only; Vietnamese is configured as the
  fallback but never supported.
- **A16** — sort buttons' `aria-label` reads "Sort by [object Object]".
- **A17** — with the phone menu open, the page was 577px wide (T-19F shell).
  Closed in the review pass, at the user's request: see `follow-ups.md`.
