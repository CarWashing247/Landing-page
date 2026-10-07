# Checklist

**The running record of what is done.** Read it before starting a task; update it
when one is finished.

## How to use it

1. **Before starting**, find the task below. Check its row is not already done,
   and read the "Still open" section — a task often inherits work another one
   left behind.
2. **After finishing**, move the task to done with its PR number, and add
   anything it left undone to "Still open" or to
   [`follow-ups.md`](./follow-ups.md).

## What goes where

Three files track different things, and they drift the moment that blurs:

| File | Owns |
| --- | --- |
| [`Design.md`](./Design.md) | the plan — what each task *is*, its dependencies, the gates |
| **this file** | the status — what is *done*, and what the next person should pick up |
| [`follow-ups.md`](./follow-ups.md) | defects and decisions found but not fixed |

A bug belongs in `follow-ups.md`, not here. A task's scope belongs in its task
file, not here. This file answers one question: **where are we?**

---

## Phase 1 — Foundation · complete

| Task | | PR |
| --- | --- | --- |
| T-01 | Bootstrap the app | — |
| T-02 | Media storage and the Media collection | #1 |
| T-03 | Users, roles and access control | #2 |
| T-04 | Deploy pipeline | #5 |
| T-04A | Localization foundation | #4 |
| T-04B | Secret loading from Vault | #6, #8, #9 |
| T-04C | Structured logging | #7 |

> **Gate 1 — passed.** Admin login works, the deploy is green, both locales
> resolve.

## Phase 2 — Content and SEO · complete, Gate 2 not signed off

| Task | | PR |
| --- | --- | --- |
| T-05 | Globals | #10 |
| T-06 | Pages collection | #11 |
| T-07 | Services collection | #12 |
| T-08 | SEO field group | #13 |
| T-09 | `buildMetadata()` and route wiring | #14 |
| T-10 | Static generation and cache tags | #16 |
| T-11 | Revalidation webhook | #18 |
| T-12 | Draft preview | #19, #21 |
| T-13 | Sitemap and robots | #20 |
| T-14 | JSON-LD | #22 |

> **Gate 2 — NOT signed off.** Meta tags, reciprocal `hreflang` and JSON-LD were
> all verified in both locales with `curl`. What is missing is the Rich Results
> Test, which the gate names and which needs a public URL — the site is not
> deployed. Tracked as **A7**. Do not record Gate 2 as passed until it is run.

## Phase 3 — Interface · in progress

| Task | | PR |
| --- | --- | --- |
| T-15 | Design foundation | #23 |
| T-15A | Interface message catalog | #24 |
| T-15B | Design system regeneration | #32 |
| T-15C | Phase 3 interface direction | #34 |
| T-15D | Implement the design prototypes | #35 |
| T-15E | Interaction polish | #36 |
| T-16 | Layout shell | #26 |
| T-17 | Content blocks | #27 |
| T-18 | Service detail template | #28 |
| T-19 | Contact page | #30 |
| T-19A | Admin interface | #31 |
| T-19B | The admin follows Payload | #33 |
| T-19C | Admin chrome and dashboard | #37 |
| T-19D | Block picker previews | #38 |
| T-19E | Design conformance pass | — |
| T-17A | Home page | — (branch `t-17a-home-page`, PR not yet opened) |

**Not done:**

| Task | | Blocked by |
| --- | --- | --- |
| **T-20** | **Performance pass** | nothing — T-17A is done |

> **Gate 3 — not reached.** Mobile Lighthouse at 90 or above, which is T-20.

### What the conformance pass changed

**T-19E compared every implemented surface against `design/phase3/` and closed
the gaps.** It is not in `Design.md` — it is a sweep, not a feature — and the
things it found are worth knowing before the next UI task:

- **Section headings were rendering at 30px against the prototype's fluid
  `clamp(2.2rem, 3.3vw, 3.5rem)`.** `h2` could not simply be enlarged: the same
  element is a prose heading in CMS rich text and `ServicePage` uses `text-h2`
  for a price. The fluid sizes are now their own roles, `text-section` and
  `text-panel`, applied where the prototype draws a section heading. `--text-h3`
  moved from Tailwind's 20px to the prototype's `1.45rem`.
- **Every `rem` in `admin.css` was rendering at 81% of its designed size.**
  Payload's admin sets `html { font-size: 13px }` where the prototype's root is
  16px, so the card descriptions landed at 10.7px and the eyebrow at 9.8px —
  both under the readable floor. The widget sizes are absolute px now. Anything
  added to `admin.css` should be: the design's numbers are absolute, and `rem`
  silently rescales them. Payload's own components keep Payload's sizing.
- **The CMS's main action was visibly broken.** A primary button with a dropdown
  is a wrapper holding a plain `button.btn` and a `.popup-button`, neither
  carrying the `--style-primary` class, so "Publish changes" rendered as a dark
  pill with a red plate behind its label. Both inner elements are painted now.
- **Two defects were invisible in the source and only a browser found them** —
  that one, and Payload's `:has()` rule out-ranking ours to zero the active rail
  item's left padding. `curl` is the right check for HTML and metadata; computed
  style needs a real browser.

### The design source has moved three times

Visual decisions now come from **[`design/phase3/`](../design/phase3/)** —
`landing.html`, `admin.html`, `dashboard.html`, `tokens.css` and the PNG
captures — described by
[`phase3-uiux-promax.md`](./phase3-uiux-promax.md). Everything before it is
retired and should not be read as a source:

1. Canva decks (T-15, T-15A, T-16, T-17) — retired in T-15B
2. generated `design-system/MASTER.md` (T-15B) — deleted in T-15D
3. `design/phase3/` prototypes (T-15C onward) — **current**

Earlier task files describe implementations against a retired source. Their
decisions still hold; their colours do not.

## Phase 4 — Launch · not started

| Task | | Blocked by |
| --- | --- | --- |
| T-21 | Analytics and Search Console | T-19 (done) — ready |
| T-22 | Admin hardening | nothing — ready, independent of all UI |
| T-23 | Content seed | nothing — T-17A is done; seed `/` at slug `home` |
| T-24 | Handover | everything |

---

## Still open

Work that is not a task of its own and that the next person should know about.
Defects live in [`follow-ups.md`](./follow-ups.md); this is the short list of
what most affects the next task.

- **T-20 is the next thing on the critical path.** `/` and `/en` are now the
  `Pages` document with slug `home` (T-17A): `/home` 404s, the sitemap takes the
  home entries from the document, and `pathForPage` maps the slug to the locale
  root. **The home page must be created at slug `home` in each locale** — a page
  titled "Trang chủ" auto-generates `trang-chu` and lands at `/trang-chu`
  instead. The slug field's help text now says so in English; its Vietnamese
  is still `TODO(copy)` (A14), as are thirteen admin dashboard strings (A11b).
- **The 404 renders an empty body (A1).** Four approaches measured, all failing
  identically; the suspected cause is the catch-all rewrite rather than the
  not-found boundary. T-15A wrote the copy, so there is finished wording nobody
  can see.
- **An open redirect in `safeLocalPath` (A3).** A measured reproduction and a
  one-line fix, still unapplied. It is the oldest unfixed security defect here.
- **Business data is still `TODO(data)`.** Name, address, phone and hours are
  placeholders, so the `AutoWash` JSON-LD is withheld by its own guardrail and
  the footer's contact block is empty. T-23 fills them.
- **`/dich-vu` 404s (A10)** — the services index the navigation links to has no
  document behind it.
- **The admin dashboard still stacks its two lower panels (A12)** and the list
  view's published state is not green (A13). Both were measured during the
  design conformance pass and both were left alone on purpose: the first needs
  Payload's own dashboard container restyled, the second needs a custom cell
  component. Neither belongs in a styling pass.
- **Playwright's Chromium is now installed** in `~/.cache/ms-playwright`. The
  conformance pass needed a browser to measure computed sizes, which is how the
  13px-root defect below was found. `npm run test:e2e` will now run without a
  separate `npx playwright install`.

## Verification debts

Claims that are **not** backed by a check that was actually run:

- **Gate 2's Rich Results Test (A7)** — needs a public URL, and the site is not
  deployed.
- **T-19's two map acceptance criteria are vacuous as shipped (B5)**, not met.
  The map was deliberately bypassed in favour of what the decks show, so there
  is no iframe to measure `loading="lazy"` or CLS against. `MapEmbed.tsx` is
  built and unused.
- **T-20's Gate 3 measurement on the contact page** will therefore be taken
  against a page with no map in it. Turning the map on later changes that
  measurement.

Where a task's PR says a check was run, it was run; where it could not be, the
PR says so. Add to this list rather than quietly relaxing a criterion.
