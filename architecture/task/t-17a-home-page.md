# T-17A · Home page

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-17a-home-page` |
| Depends on | T-16, T-17 |
| Blocks | T-20, T-23 |
| Critical path | **yes** — `/` is the primary keyword route |

## Goal

Make `/` and `/en` real pages.

> **Design source: the prototypes in [`design/phase3/`](../../design/phase3/)** —
> `landing.html`, `admin.html`, `dashboard.html`, `tokens.css` and the PNG
> captures beside them, described by
> [`phase3-uiux-promax.md`](../phase3-uiux-promax.md). They are the only UI
> design source. Tokens are implemented in `src/app/globals.css`; components use
> them by name and never carry a hex value.

## Why this task exists

Nothing in Design.md owned the home page. Phase 3 built the tokens (T-15), the
catalog (T-15A), the shell (T-16), the blocks (T-17), and the service and
contact templates (T-18, T-19) — and `/` was never any task's subject. It still
renders what T-09 left there:

```tsx
<h1>AutoWash247</h1>
<p>{t(locale).placeholder.homeBody}</p>
```

That is the route Design.md section 3 puts the primary Vietnamese cluster on
(`rửa xe tự động` + area name) and the one Gate 4 requires Search Console to
have indexed. It is also the only page the `AutoWash` JSON-LD attaches to.

## The decision — now answered

> **`/` becomes a `Pages` document with the reserved slug `home`, served at `/`
> and `/en`.** The Phase 3 interface direction
> ([`phase3-uiux-promax.md`](../phase3-uiux-promax.md)) records this as the
> user-selected answer to D1 — path **A** below. Its consequences are no longer
> optional and are part of this task: `/home` and `/en/home` must 404, and the
> sitemap must contain exactly one entry per published, indexable locale.

## The decision, as it was framed

**Is `/` a CMS document, and under what slug?** Follow-up D1. The two answers
lead to different work, and neither is obviously right:

**A — `/` becomes a `Pages` document.** The home page composes from T-17's
blocks like every other page, and an editor changes it without a deploy.

- Needs a reserved slug (`trang-chu` / `home`), and `[slug]` must then **refuse**
  it, or the same content answers at `/` and `/trang-chu` — two URLs, one page,
  which is the duplicate-content problem `hreflang` and canonicals exist to
  avoid.
- The sitemap must stop emitting its hand-written home entries and let the
  document supply them, including a real `lastModified` (T-13 currently uses
  `SiteSettings.updatedAt` as a stated bound).
- `buildMetadata()` starts receiving a document, so the home `<title>` gains the
  suffix it is currently suppressed from having (T-09's flag).

**B — `/` stays code, composed from the same blocks with fixed content.** No
schema change, no reserved slug, no sitemap special case.

- An editor cannot change the home page without a developer, which is the one
  thing Design.md's goal 2 is about ("editing SEO without a developer").
- T-23 then has nothing to seed for `/`, and its step 1 says otherwise.

**Recommendation: A.** The whole project is built so a landing page needs no
developer, and the home page is the page most likely to need changing. The cost
is one reserved slug and a sitemap branch, both of which are small and local;
the cost of B is paid every time someone wants a word changed on the most
important page of the site.

~~**Do not start building until this is answered.**~~ **Answered — path A.** Both paths touch `[slug]`, the
sitemap and `buildMetadata`, and doing one then switching is most of the work
twice.

## Scope

**In scope**

- `/` and `/en` rendering the sections the designs show, from T-17's blocks:
  hero, the three-step explainer, featured packages, FAQ, and the closing CTA.
- Whichever of A or B is chosen above, including its consequences — the reserved
  slug and `[slug]` guard, the sitemap change and the `buildMetadata` change for
  A; none of those for B.
- Keeping the `AutoWash` JSON-LD on `/` exactly as it is. It is the one node that
  must not move, because `Service.provider` on every service page resolves to its
  `@id` (T-14).

**Out of scope**

- New blocks. If the designs show a section T-17 has no block for, say so and
  decide whether it is a block or page copy — do not add a sixth block quietly.
- The real Vietnamese copy, which is T-23's. This task renders whatever the CMS
  or the code holds.
- Performance tuning (T-20).

## Steps

1. Get the D1 answer. Record it in this file before writing code.
2. Read deck pages 4 and 5 and list which sections map to which existing block.
3. Build the page, reusing `RenderBlocks` rather than a second dispatcher.
4. Check the `AutoWash` JSON-LD is unchanged and a service page's `provider`
   still resolves to it.
5. Re-check the sitemap: exactly one entry per locale for `/`, no duplicate from
   a home document if path A was taken.

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] `/` and `/en` render the designs' sections, not a hardcoded heading.
- [ ] Exactly one `<h1>` on each, from the hero.
- [ ] The `AutoWash` JSON-LD still renders on `/` with the same `@id`, and a
      service page's `provider` still resolves to it.
- [ ] `/sitemap.xml` has exactly one entry per locale for the home page.
- [ ] If path A: `/trang-chu` (or whichever slug) does **not** also serve the
      home page.
- [ ] No new `'use client'`.

## Verification

```bash
npm run build && npm run start &
curl -s localhost:3000/    | grep -c '<h1'      # expect 1
curl -s localhost:3000/en  | grep -c '<h1'      # expect 1
curl -s localhost:3000/    | grep -o '"@type":"AutoWash"'
curl -s localhost:3000/sitemap.xml | grep -c '<loc>http://localhost:3000/</loc>'   # expect 1
# path A only: the reserved slug must not resolve
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/trang-chu    # expect 404
```

## Notes

- **The home page is the only page carrying the `AutoWash` node.** Moving or
  duplicating it breaks `provider` on every service page silently — the service
  page still renders, the entity link just stops resolving. T-14's tests pin the
  `@id`; run them.
- T-16's shell already supplies the header, footer, landmarks and skip link, so
  this task adds sections inside `<main>` and nothing around them.
- The designs' home page shows a "Dịch vụ nổi bật" section that is T-17's
  `Pricing` block pointed at a few services — not a new block.

## Flags

- ~~**D1 is unanswered as of this file being written.**~~ Answered (path A) and
  implemented — see "What was built" below.
- The home page currently has no `lastModified` of its own in the sitemap and no
  title suffix, both of which are consequences of `/` not being a document. Path
  A resolves both; path B makes them permanent.

## What was built

**No new block and no new section.** Deck pages 4 and 5 are retired; against the
current source, `design/phase3/landing.html`, every home section maps onto a T-17
block that T-15D and T-19E had already matched to the prototype:

| Prototype section | Block |
| --- | --- |
| Hero, with the dark visual panel | `Hero` |
| How it works — three numbered cards | `Steps` |
| Services — "Choose the wash that fits" | `Pricing`, pointed at published services |
| Questions | `Faq` |
| Closing panel | `Cta` |

So the home page is a document, not a template, and this task is wiring:

- **`HOME_SLUG` in `src/lib/locales.ts`, and `pathForPage('home', l)` returns
  `/` or `/en`.** Preview links, `hreflang`, canonicals and the sitemap all build a
  page's path through that one function, so none of them can advertise `/home`.
- **`HomePage` reads the `home` document through `loadPage`** and renders it with
  `PageBody`, the body `ContentPage` already used, now shared — one renderer, one
  `<h1>` rule. The read carries the existing `page:<locale>:home` tag, so T-11's
  webhook purges `/` with no new revalidation path. A document counts as a
  locale's home only if *that locale's own* slug is `home`; Payload's fallback
  would otherwise serve the Vietnamese document at `/en`.
- **No home document** (a fresh install) falls back to the previous body and
  SiteSettings-only metadata, so `/` never 404s.
- **The `AutoWash` node is untouched** — same component, same `BusinessInfo`
  input, still on the home route alone. `FAQPage` is added when the document has
  an FAQ block, through the same `faqSchema` every page uses.
- **`ContentPage` refuses `home`**, so `/home` and `/en/home` 404, and
  `generateStaticParams` does not prerender them.
- **The sitemap's hand-written home entries remain only for a locale with no home
  document.** Otherwise the document supplies them, with its own per-locale
  `lastModified` and `noindex` — the T-09 and T-13 flags above are resolved.
- **`Hero` draws the prototype's abstract wash panel when no image is set**, as an
  `aria-hidden`, token-only CSS and SVG stand-in. Before, a hero with no image
  left the right half of the desktop grid empty. An uploaded image replaces it,
  and keeps `priority`.

### Verification run

Against `npm run build && npm run start` with the local database, which already
holds a published `home` document (hero, steps, pricing, faq, cta):

| Check | Result |
| --- | --- |
| `/`, `/en` stay `○` static in the build output | yes |
| `<h1>` count on `/` and `/en` | 1 and 1, from the hero |
| `/home`, `/en/home` | 404, 404 |
| `<title>` on `/` | `Trang chủ \| AutoWash247` — the suffix is now present |
| `hreflang` on both | `vi` → `/`, `en` → `/en`, `x-default` → `/` |
| `/en` | `noindex, nofollow` — the untranslated-locale guardrail, as intended |
| `/sitemap.xml` home entries | exactly one, `/`; `/en` is absent because it is `noindex` |
| `FAQPage` on `/` and `/en` | present |
| Hero image | preloaded (`<link rel="preload" as="image">`) |
| No horizontal scroll at 390 and 1280px | `scrollWidth` equals the viewport |
| No-image hero panel | rendered in place, 525×500 at 1280px, 350×330 at 390px |
| `npm run typecheck`, `npm run lint` | pass |
| `vitest` | 317 of 318; the failure is A11b, unchanged from `master` |

**`AutoWash` and `provider`, verified with temporary data.** Both are withheld
while `BusinessInfo` holds `TODO(data)`, so the local row's name, street and
locality were set to `TEST …` values, the data cache cleared, the site rebuilt
and checked, and the original row restored. With data present, `/` and `/en`
both emit `"@type":"AutoWash"` with `@id` `…/#business`, and
`/dich-vu/rua-xe-co-ban` and `/en/services/ceramic-coating` both carry
`"provider":{"@id":"…/#business"}` — the same node. Mobile Lighthouse is T-20.

### Fixed in the same branch, by request

The PR was asked to leave nothing open that it could close, so two follow-ups
outside T-17A's scope are wired here rather than recorded:

- **A11b** — the admin dashboard's strings move into `adminTranslations` and
  resolve in the panel language; `no-literals` passes (324/324). Checked in a
  logged-in browser in English. The Vietnamese branch is covered by
  `admin-translations.test.ts`, because Payload pins scripted sessions to `en`.
- **A14** — the `Pages` slug field's help text names the `home` slug, checked on
  the create form.

Both have English only; their Vietnamese is `TODO(copy)`.

### Left for others

- **A11b, A14** — the Vietnamese for fourteen admin strings.
- The local `home` document's content is seed data: no eyebrows, no hero or CTA
  buttons, English untranslated. That is T-23's, and the blocks render those
  fields as soon as they are filled.
