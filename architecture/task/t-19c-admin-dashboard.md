# T-19C · Admin chrome and dashboard

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-19c-admin-dashboard` |
| Depends on | T-19B, T-15D |
| Critical path | no |

## Goal

Make the admin look like the design without taking Payload's views away from it.

> **Design source: [`design/phase3/dashboard.html`](../../design/phase3/dashboard.html)
> and [`admin.html`](../../design/phase3/admin.html).** The direction document's
> admin section is the contract: *"A dark slate navigation rail marks the current
> section clearly; the list and editor canvases are light. The main action is
> red, while published state is green with a visible text label."* Each view also
> carries an explicit **implementation boundary** — "Configure Payload dashboard
> components", "Collection `defaultColumns` and Payload list styling", "Native
> edit view plus `admin.livePreview`".

## Why this exists after T-19A and T-19B

The project has swung twice. **T-19A** themed the whole panel from a Canva deck —
220 lines, 68 custom properties, `theme: 'dark'` forced. **T-19B** removed all of
it, on the instruction that the admin follows Payload's own design.

Both overshot. The design asks for something narrower than either: **brand
chrome, native everything else.** T-19B was right that Payload owns the list and
edit views; it went too far in leaving the rail, the primary action and the
dashboard untouched, all of which the design specifies and Payload exposes as
configuration.

## Scope

**In scope**

- The navigation rail in slate, with the current section as a red pill.
- The primary action in the action red.
- A dashboard built from `admin.dashboard.widgets`: a welcome block, the three
  collection cards, recent content, and the editorial checklist.

**Out of scope**

- Replacing `components.views.dashboard`, or any list, edit or field view. That
  is the boundary both the design document and T-19B draw.
- Theming Payload's tables, inputs, buttons beyond the primary, or modals.

## What it did

- `src/app/crm/admin.css`, roughly a fifth of what T-19A shipped, touching the
  rail, the primary action and the dashboard widgets only.
- Four widgets under `src/components/admin/widgets/`, registered through
  `admin.dashboard` with a `defaultLayout` matching the prototype's order.
- The admin mark became the red `A/` of `design/phase3`, replacing a droplet that
  was still green from a retired palette.

## Findings worth keeping

- **Payload 3.90 has a widget dashboard.** `admin.dashboard.widgets` with a
  `defaultLayout` is a first-class API, which is why this task did not have to
  replace the view. `WidgetInstance` is a union generated from the registered
  slugs, so `npm run generate:types` must run before the config typechecks.
- **Payload marks the current nav item with neither a class nor
  `aria-current`.** It renders the active entry as a `div.nav__link` — not an
  anchor — containing a `.nav__link-indicator` bar. Two selector guesses
  (`aria-current="page"`, then an `.active` class) matched nothing and **failed
  silently**: a rule that applies to no element leaves the rail looking fine.
  `.nav__link:has(.nav__link-indicator)` is what reaches it, confirmed by reading
  Payload's own stylesheet and then the live DOM.
- **The dashboard invents nothing.** The recent-content panel queries real
  documents with `overrideAccess: false`, so an editor sees only what their role
  allows, and renders an explicit empty state otherwise. The prototype's own
  banner says "No invented counts or content", and the collection cards carry
  ordinals rather than totals for the same reason.

## Acceptance criteria

- [ ] The rail is slate and the current section is a red pill.
- [ ] The dashboard shows the welcome block, three collection cards, recent
      content and the checklist.
- [ ] Recent content lists real documents or an honest empty state — never a
      placeholder row.
- [ ] No list, edit or field view is replaced.
- [ ] `npm run generate:importmap` output is committed.

## Verification

Admin checks need a logged-in session, so they are done in **one** login:
Payload locks an account after repeated failed attempts, and
`waitForURL(/\/admin(\/|$)/)` matches `/admin/login` too — so a failed login
reads as a successful one and every later assertion silently measures the login
page. Wait for a URL that is *not* `/login`.

```bash
npm run build && npm run start &
# log in once, then: rail background, current-item background, widget count
```

Measured: rail `rgb(30,41,59)`, current item "Pages" `rgb(198,41,41)` on white.
