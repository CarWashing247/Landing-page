# T-15E · Interaction polish

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-15e-ui-polish` |
| Depends on | T-15D |
| Critical path | no |

## Goal

Make the interface respond the way the design says it should, using
`ui-ux-pro-max`'s interaction guidance.

> **Design source: the prototypes in [`design/phase3/`](../../design/phase3/).**
> Its rule on motion is a constraint, not a licence: *"Animation is limited to
> hover, focus, and menu transitions; the information hierarchy works with motion
> disabled."* No entrance animation, no scroll reveal.

## What the guidance changed

`ui-ux-pro-max` (`--domain ux`) gave three things that shaped this:

- **"Don't present 150-300ms or any cutoff as a universal requirement — use
  shared motion tokens."** So motion is three tokens, not one number copied per
  component: `--duration-feedback` (120ms) for colour, `--duration-control`
  (200ms) for a control settling, `--duration-menu` (260ms) for a panel that
  travels a real distance. One shared duration would make at least two of them
  wrong.
- **"No hover feedback on clickable elements"** is listed as the anti-pattern.
  Seven interactive elements had none.
- **Touch targets and spacing**: web uses the WCAG target-size rule, with a
  minimum 8px gap between adjacent targets.

## What it did

- Moved transitions into `@layer base` on `a, button, summary`, so a new link is
  smooth by default rather than being the one that was forgotten, and no
  component carries its own duration.
- Added hover states to the brand lockup, the locale links, the service card
  title, the FAQ summary row, the footer phone, the contact links and the draft
  banner's exit.
- Gave the locale switch real targets (44px high) and opened its gap from 4px to
  8px — it had two adjacent links 4px apart.
- Smooth disclosure via `::details-content` and `interpolate-size`, behind
  `@supports`, so it animates where the browser can and snaps where it cannot.
  The menu never depends on it.

## The bug it found

**The mobile menu panel had been a 44px-wide sliver since T-16.** `absolute
inset-x-0` resolves against the nearest positioned ancestor, which was the
`<details>` element — itself only as wide as the hamburger. Every link wrapped to
one character per line.

Measured at 390px: the open panel was `44x1013 at x=246` and the first link
`12x214`. After moving the positioning context to the header: `390x269 at x=0`
and `358x41`.

It survived three tasks because every check asserted the links were **present**
and **visible** — both true — and none measured their geometry. A visible element
of the wrong shape passes every assertion that does not look at its box.

## Acceptance criteria

- [ ] Every interactive element has a hover state and a visible focus ring.
- [ ] No component sets its own transition duration.
- [ ] No touch target under 24px, and no adjacent pair closer than 8px.
- [ ] The mobile menu panel spans the viewport.
- [ ] `prefers-reduced-motion` still disables everything.

## Verification

Geometry is measured in a real browser against computed rects, not estimated
from classes — that is the only check that would have caught the sliver:

```bash
npm run build && npm run start &
# at 390px: report every target under 24px and every adjacent pair under 8px apart
# and the open menu panel's box
```
