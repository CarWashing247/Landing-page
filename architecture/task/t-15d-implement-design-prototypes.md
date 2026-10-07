# T-15D · Implement the design prototypes

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-15d-implement-design` |
| Depends on | T-15C |
| Status | **merged** (PR #35) |

## What it did

Deleted the generated `design-system/` folder so `design/phase3/` is the only UI
design source, repointed every reference across Design.md, `task/README.md` and
nine task files, and built the shell and blocks to what `landing.html` actually
draws rather than only its palette.

## The schema had to grow

Implementing the design honestly meant adding the fields it needs rather than
hardcoding its text into components:

| Block | Added |
| --- | --- |
| Hero | `eyebrow`, `secondaryCtaLabel`/`Href`, `highlights[]` |
| Steps, Pricing, Faq | `eyebrow`, `note` |
| Cta | `eyebrow` |

All optional, so a block without them renders as before. Migration
`20261006_165327_block_eyebrows` created and applied.

## Layout decisions worth keeping

- **The 1120px wrap puts its 40px gutter inside the width calculation**
  (`min(1120px, 100% - 40px)`), so a full-bleed background sits outside it while
  text stays aligned with every other section.
- **The closing CTA is a rounded panel inside the content column**, not a
  full-bleed band. The corners are what make it read as an object at the end of
  the page rather than one more section.
- **The navigation collapses at 900px**, which is the prototype's breakpoint and
  sits between Tailwind's `md` and `lg`. Rounding either way crowds the nav or
  hides it while there is still room, so it is a `--breakpoint-nav` token.
- The hero image sits in a dark rounded panel: in the prototype it is the only
  dark surface above the fold, and it is what makes the white header read as a
  header.

## Two corrections

- The brand mark became the prototype's `A/` in a rounded red square, replacing
  a droplet an earlier revision drew. It still carries no business name — that
  lives in `SiteSettings`.
- Service cards were labelled `sections.servicePackage` — a noun used as a
  button. They use `actions.viewPackage` now, whose Vietnamese composes two
  phrases already in the catalog rather than translating anything new.

## Left undone

The prototype's header carries a "Find a station" button. The implementation
renders a call button only when `BusinessInfo.phone` is real, and it is still
`TODO(data)`. The prototype's button is a **station link**, not a phone link, so
its destination is a content decision and was not invented.
