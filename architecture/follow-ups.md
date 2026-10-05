# Follow-ups

Everything found during a task but deliberately **not** fixed in it, in one
place. `CLAUDE.md` says to report an out-of-scope bug rather than fix it; this
is where those reports accumulate so they are not only in a merged PR
description nobody re-reads.

Each entry says what is wrong, how it was found, who owns it, and why it was
left. An entry is deleted when the fix merges — this file is a worklist, not a
changelog.

Items already written into the task file that owns them are marked **recorded**;
those are safe to find at the point of use. The rest exist only here.

---

## A. Open defects

### A1 · The 404 page renders an empty body

**Owner: T-16** (recorded in `task/t-09-build-metadata.md` and
`task/t-16-layout-shell.md`)

T-09's catch-all rewrite (`/:path*` onto the Vietnamese folder) means every URL
now matches a route, so `app/global-not-found.tsx` — which renders only for a
URL matching *no* route — stopped being reachable for public paths. An unknown
slug reaches `[slug]/page.tsx` and calls `notFound()`.

Measured: HTTP 404 with `<meta name="robots" content="noindex">`, so the status
and the indexing are right, but `<html id="__next_error__">` with no `lang` and
no visible body.

Not a quick fix, and not for want of trying. Adding `not-found.tsx` under each
locale does nothing while `experimental.globalNotFound` is enabled — Next never
builds the file. Turning that flag off makes the component render into the RSC
payload while the SSR shell stays `__next_error__` with the same empty body; the
flag exists precisely because this app has two root layouts. It is a 404
architecture decision, so it belongs with the shell.

The 404 copy is still `TODO(copy)`, so no finished wording regressed — only the
shell.

### A2 · `titleSuffix`'s placeholder produces `Liên hệ| AutoWash247`

**Owner: `src/globals/SiteSettings.ts` (T-05's file) — not recorded elsewhere**

The admin placeholder is `| AutoWash247`, with no leading space
(`SiteSettings.ts:145`). An editor who copies it gets a title with no space
before the separator, which is what the live pages showed during T-09's
verification.

`buildMetadata()` appends the suffix verbatim **by design** — the editor owns
the separator, so trimming or re-spacing it in code would take that away. The
fix is the placeholder, and arguably the `admin.description` beside it.

One line, in a file T-09 and T-10 had no other reason to touch.

---

## B. Documentation inconsistencies

### B1 · T-16 and T-17 omit T-15A from their dependencies

**Owner: whoever starts Phase 3 — not recorded in the task files themselves**

| Source | T-16 | T-17 |
| --- | --- | --- |
| `Design.md` section 4 | T-05, T-15, **T-15A** | T-06, T-15, **T-15A** |
| the task file | T-05, T-15 | T-06, T-15 |

`Design.md` section 5 also says "T-16 can start as soon as T-05 and T-15A land".

This is not cosmetic. Both tasks render interface strings, and T-15A is the
typed message catalog those strings must come from. Started from the task file,
either one gets built with hardcoded Vietnamese and then rewritten when T-15A
lands — which is the exact mistake T-15A's own goal section warns about, and
which the closed PR #15 already made once.

**Left as a note rather than an edit** because changing a task's stated
dependencies is a planning decision, not a typo fix. Both files should be
corrected before Phase 3 opens.

---

## C. Deferred migrations

### C1 · `unstable_cache` is superseded by `use cache`

**Owner: its own task — recorded in `task/t-10-static-generation-cache-tags.md`**

Next 16 replaces `unstable_cache` with the `use cache` directive, which requires
the repo-wide `cacheComponents` flag. That flag makes data fetching dynamic by
default, turns on Partial Prerendering and replaces the route segment configs.
Next's own guide drives the migration with a dedicated skill, one feature at a
time, following per-route validation errors — and it would have to account for
Payload's admin routes under `/crm`, which are dynamic by nature.

The same guide states `unstable_cache` "keeps working as a separate layer", and
every use of it in this repo is inside `src/lib/content.ts`, so this stays a
small contained change whenever it is scheduled. Worth doing before Phase 3
adds more data-reading components, not after.

---

## D. Decisions still open

### D1 · Is `/` a CMS document, and under what slug?

**Owner: T-17** (recorded in `task/t-09-build-metadata.md`)

T-23 lists `/` among the documents to create, but nothing in `Design.md` says
which slug a home document would carry. T-09 did not invent one, because doing
so commits two later tasks: the `[slug]` route would have to refuse that slug so
`/` and `/trang-chu` are not one page at two URLs, and the sitemap would have to
special-case it.

Today the home route reads `SiteSettings` alone — the "blank SEO tab still ships
complete tags" path. Consequence: the home `<title>` is the brand name with no
suffix, because `AutoWash247 | AutoWash247` reads like a bug.

A second consequence, added by T-13: the home entries' sitemap `lastModified` is
`SiteSettings.updatedAt`, which bounds when the indexable part of `/` changed but
not when its hardcoded body did. Deciding this question replaces that bound with
a real document timestamp.

### D2 · What to salvage from the closed Phase 3 PR

**Owner: T-15 — not recorded in the task files**

PR #15 (`feat/phase3-figma-ui-map`, closed) mapped a Figma design into the
codebase. It is worth reading before T-15 starts, because the palette, the type
scale and the layout dimensions are real design decisions someone made.

It is **not** worth merging as-is, and the reasons are the checklist for doing
it properly:

- It spanned T-15, T-16, T-17 and T-18 in one PR.
- It stripped the explanatory comments from `src/lib/content.ts` (−93 lines) and
  `src/collections/Pages.ts` (−121).
- It hardcoded Vietnamese copy in components, so the `en` locale rendered
  Vietnamese — T-15A exists to prevent exactly this.
- It hardcoded `AUTOWASH247` in the header rather than reading
  `SiteSettings.brandName`, which is the rule T-16 exists to enforce.
- It mixed raw hex (`bg-[#141a24]`) with the tokens it had just defined, which
  is the one thing T-15's acceptance criteria forbid.
- It used no `next/font` and no `vietnamese` subset — the core of T-15, and
  AGENT.md 5.5.

Note also that the task file tells T-15 to define tokens in
`tailwind.config.ts`. **This project is on Tailwind v4**, which has no such
file — tokens are declared in CSS with `@theme`. The closed PR already did it
that way. The task file needs correcting when T-15 starts.

---

## E. Repository hygiene

### E1 · `AGENTS.md` duplicates `CLAUDE.md`

Untracked in the working tree, byte-identical to `CLAUDE.md` apart from the
title line. Two copies of the binding working-style document will drift, and
`CLAUDE.md` itself says duplication in this repo is always a mistake.

Decide which name is canonical and keep one. If both must exist for different
tools, make the second a one-line pointer rather than a copy.

### E2 · `.claude/settings.json` is untracked and holds a personal preference

It enables a Canva plugin. `.claude/settings.json` is the *shared project*
settings file, so committing it imposes that plugin on everyone; a personal
preference belongs in `.claude/settings.local.json`, which is the per-developer
file.

Neither path is in `.gitignore`, so both are one `git add -A` away from being
committed by accident. Either ignore `.claude/settings.local.json` and commit a
deliberate shared `settings.json`, or ignore the directory.

---

## F. Watch list

Not defects — behaviour that is correct today and would be a defect if the
surrounding assumption changed.

- **`og:image:alt` falls back across locales.** `Media.alt` is localized and
  required, so an English page shares an image whose alt text is Vietnamese
  until someone writes the English one. That is Payload's documented fallback
  working as designed, and T-23 writes both. It becomes a defect only if T-23
  ships with one locale filled in.
- **A cache miss is cached under the same tag as a hit**, so an unknown slug
  occupies an entry for an hour. Bounded by the revalidate floor, and load
  bearing: it is what makes publishing a draft take effect through T-11's purge
  rather than only through the floor.
- **Changing the shape of anything cached in `src/lib/content.ts` needs its cache
  key bumped, and nothing enforces that.** `unstable_cache` entries survive a
  deployment on purpose, so a new build is handed the previous build's values
  deserialized into the new type — a boundary TypeScript cannot see. T-13 hit it
  for real: adding a field to `SitemapDocument` failed the build on a `TypeError`
  reading the missing key, which is why `loadSitemap`'s key is now
  `['sitemap', 'v2']`. The other cached reads (`loadPage`, `loadService`,
  `siteSettings`) return Payload documents whose shape follows the collection, so
  they carry the same hazard without the same reminder.
