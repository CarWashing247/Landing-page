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

- **D1 is unanswered as of this file being written.** It was recorded during
  T-09, assigned to T-17, and T-17 merged without deciding it — reasonably, since
  T-17 built blocks rather than the page that uses them. It cannot be deferred
  again: this task is the one that needs it.
- The home page currently has no `lastModified` of its own in the sitemap and no
  title suffix, both of which are consequences of `/` not being a document. Path
  A resolves both; path B makes them permanent.
