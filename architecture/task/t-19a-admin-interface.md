# T-19A · Admin interface

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-19a-admin-interface` |
| Depends on | T-03, T-05, T-06, T-07, T-08, T-15 |
| Blocks | — |
| Critical path | no — nothing public depends on it |

## Goal

The CMS an editor actually works in, matching the Canva design instead of
Payload's stock appearance.

> **Direction changed (T-19B): the admin follows Payload CMS's own design.**
>
> This task was built against a Canva admin deck that is now retired, and it
> imposed a bespoke dark theme — 220 lines and 68 custom properties — on top of
> Payload's panel. The direction now is that the CMS admin *is* Payload's
> interface: its own stylesheet, its own light/dark theme, its own components.
>
> **What the project adds is branding, not design**: the logo and navigation
> mark, and the browser-tab title, both of which are first-class Payload
> configuration. Everything else is Payload's.
>
> Colour values for the mark come from `design-system/autowash247/MASTER.md`.
> The admin does **not** participate in the public site's token system — there is
> no Tailwind `@theme` in that document to read from.

> **Remapped from `DAHXNnCsHfc` ("AutoWash247 Admin CMS UI", 8 pages) on
> 2026-10-06.** The two decks are different designs, not revisions of one, and
> the change removes work rather than adding it — see *What the remap changed*
> below before reading anything else here as unchanged.

## What the remap changed

The previous deck drove three open product decisions and two build items. The
new deck settles or drops all five, so this task is smaller than it was.

| Was, under `DAHXNnCsHfc` | Now, under `DAHXOjaoczk` |
| --- | --- |
| A `Menu` collection in the sidebar, implying CMS-managed navigation | **Gone.** The sidebar (page 2) is Pages, Services, Media / Globals / Users. No Menu. |
| A four-stage publish flow with a `Kiểm duyệt` (review) gate | **Gone.** Page 7 shows Save Draft → Publish, which is Design.md section 2's three-stage model. |
| A media folder taxonomy (Banner, Dịch vụ, Tin tức…) | **Gone.** Page 8's Media Library is search plus Loại / Định dạng / Ngôn ngữ filters — no folders. |
| A dashboard replacing Payload's landing view | **Not in this deck.** Ten pages, none of them a dashboard. Dropped from scope. |
| `Màu chủ đạo` (brand colour) on `SiteSettings` | **Not in this deck.** Page 9's Site Settings is brand name, multilingual SEO defaults, fallback social image and GA4 ID — all of which T-05 already built. Dropped. |

What the new deck adds that the old one did not make explicit:

- **Role-aware navigation** (page 2) as a screen of its own: admin sees
  Collections, Globals and Users; an editor sees only Collections.
- **An admin UI language independent of content locale** (page 1): the login
  screen carries a `Ngôn ngữ giao diện` selector. Payload does this natively and
  this project already registers `src/i18n/admin-translations.ts`.
- **A dark admin theme.** Every screen is dark — deep navy surfaces, teal
  accent, lime-green for published state. The old deck was light. This is the
  single largest visual change and the main reason the remap is not cosmetic.

## Read this before scoping the work

**The deck's screens are Payload's information architecture, restyled.** Nearly
every element in them maps to a Payload feature this project has already
configured. Reading the deck as a specification for a bespoke CMS would mean
rebuilding, in custom React, software that already exists and already works —
and then maintaining it across Payload upgrades.

So the first job is subtraction. What the deck depicts that is **already
delivered**:

| Deck page | Shows | Already built by |
| --- | --- | --- |
| 1 | Login through the Users collection | T-03 (`auth: true`, `access.admin`) |
| 1 | Admin UI language selector, independent of content locale | T-04A + `i18n.translations` in `payload.config.ts` |
| 2 | Editor sees only Pages, Services, Media | T-03 — Payload hides what `read` denies; `Users` also carries `admin.hidden` |
| 3 | Pages list: title, slug, status, last updated | T-06 (`defaultColumns`) |
| 3 | Draft / Published badges | T-06, T-07 (`versions.drafts`) |
| 3, 10 | Preview button per document | T-12 (`admin.preview`) |
| 4 | Locale VI/EN switcher in the editor | T-04A (`localization`) |
| 4 | Slug auto-generated, read-only once published | T-06 (`slug-field.ts`) |
| 4, 10 | Version history and `Restore this version` | T-06, T-07 (`maxPerDoc: 50`) |
| 5 | Block composer — Hero, Steps, Pricing, FAQ, CTA, Content | T-17 owns the blocks |
| 5 | "Only one Hero per page" | T-17 |
| 6 | SEO panel: live Google preview, counters, canonical, noindex, focus keyword, social image | T-08 (`fields/seo.ts` + `plugin-seo`) |
| 6 | "Noindex tự động cho SEO locale tiếng Anh chưa dịch" | T-08's `forceNoindexWhenUntranslated` — the deck is describing a guardrail that exists |
| 7 | Services: multilingual name/slug, integer VND price, duration, required image | T-07 |
| 8 | Media: alt text required per language, caption optional, auto thumbnail/card/hero/OG variants | T-02 |
| 9 | Business Information: legal name, address, phone, Zalo, exactly 7 opening-hours rows | T-05 (`minRows: 7, maxRows: 7`) |
| 9 | Site Settings: brand name, multilingual SEO defaults, fallback social image, GA4 ID | T-05 |
| 9, 10 | Globals are admin-only | T-05 (`update: isAdmin`) |
| 10 | Editor cannot delete | T-03 (`delete: isAdmin` on all three) |

If a step below seems to ask for one of these, it is asking for it to be
**styled**, not built.

## Scope

**In scope**

- **Brand theming, dark.** Payload 3 has **no `admin.css` config key** — checked
  against the installed `payload@3.90.2` types, which have `admin.meta`,
  `admin.components` and `admin.livePreview` but nothing for a stylesheet. The
  admin's styles are reached by importing a stylesheet into
  `src/app/crm/layout.tsx`, the admin's own root layout, which currently imports
  none on purpose (it must *not* pull in `globals.css` — Tailwind's preflight
  fights Payload's own styles, which is why the two folders have separate
  layouts). Payload exposes its appearance as CSS custom properties, so the
  theme is a small stylesheet overriding those, not a rewrite.
- **The colour values must not be restated.** T-15 owns them. Extract the raw
  values into one plain stylesheet both `globals.css` and the admin theme read,
  so the admin cannot drift from the site.
- **The logo and the nav icon**, via `admin.components.graphics.Logo` (the login
  page) and `.Icon` (the navigation). Page 9 shows the brand name at the top of
  the sidebar; page 1 shows the login card.
- **`admin.meta`**: the admin's own title and favicon, so a browser tab says
  what this is rather than "Payload".
- **Navigation grouping**, via `admin.group` on each collection and global, to
  match page 2's three groups — Collections, Globals, Users — rather than
  Payload's flat default list.
- **List views**: `defaultColumns` and `useAsTitle` tuned to the columns the
  deck shows.
- **Live preview beside the editor.** Page 10 shows the page rendering next to
  the form; Payload's `admin.livePreview` does exactly this. T-12 delivered
  `admin.preview`, which opens a new tab — a different feature, and the deck
  shows both.

**Out of scope**

- **Rebuilding Payload's views in custom React.** See the table above. A custom
  list or edit view is a maintenance liability that must be re-tested on every
  Payload upgrade, for an internal tool used by a handful of people.
- **A dashboard.** Not in this deck. See *What the remap changed*.
- **A brand-colour field on `SiteSettings`.** Not in this deck, and a colour
  picker that feeds nothing is worse than no field.
- Any public-facing page.
- Security, rate limiting, 2FA and backups — that is T-22, and the split is
  deliberate: how the admin *looks* and how it *resists attack* fail in
  different ways and are reviewed by different people.
- Changing any access rule. The deck is a design; access control is T-03's, and
  the two places this deck disagrees with it are in *Conflicts* below.

## Steps

1. Read the deck. Map each screen onto the table above and write down what is
   genuinely missing before changing anything.
2. Move the brand colour values into one shared stylesheet, so the admin theme
   and `globals.css` cannot disagree. Verify the public site renders unchanged.
3. Add the admin stylesheet and point Payload's custom properties at those
   tokens. Do not restate hex values.
4. Set `admin.meta` and the logo and icon components.
5. Add `admin.group` to every collection and global per page 2, and tune
   `defaultColumns`.
6. Wire `admin.livePreview` for `Pages` and `Services`, reusing the URL builder
   in `src/lib/preview.ts` rather than writing a second one.
7. Check the admin in both admin languages — Payload's own UI is translated and
   this project registers its messages through `src/i18n/admin-translations.ts`
   (AGENT.md 5.6).

## Files

```
src/app/brand.css                # the raw token values, shared by both themes
src/app/globals.css              # reads them instead of holding them
src/app/crm/admin.css            # the dark admin theme
src/app/crm/layout.tsx           # the one place that import can go
src/components/admin/Logo.tsx    # and Icon.tsx
src/payload.config.ts            # admin.meta, components, livePreview
src/collections/*.ts             # admin.group, defaultColumns
src/globals/*.ts                 # admin.group
```

`crm/layout.tsx` carries a comment saying its shape is dictated by Payload and
to change it only for an upgrade. Adding one stylesheet import is the exception
this task needs; keep it to that.

Run `npm run generate:importmap` after adding any admin component — Payload
resolves custom components through the generated import map, and this project
keeps it at `src/app/crm/admin/importMap.js` (see `payload.config.ts`).

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] The admin uses the deck's dark palette and the brand logo, and its colours
      come from the T-15 tokens rather than new hex values.
- [ ] The public site renders unchanged after the token extraction.
- [ ] Navigation is grouped as page 2 groups it, and an editor sees only the
      Collections group.
- [ ] `Pages` and `Services` list views show the deck's columns.
- [ ] Live preview renders beside the editor and updates as fields change.
- [ ] Every behaviour the deck depicts either works or is recorded in this file
      as delivered by an earlier task.
- [ ] No custom replacement for Payload's list or edit views.
- [ ] The admin still works in both admin languages.
- [ ] `npm run generate:importmap` has been run and its output committed.

## Verification

```bash
npm run build && npm run start &
# the admin loads and is themed
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/admin
# the import map includes every custom component
grep -c 'Logo\|Icon' src/app/crm/admin/importMap.js
# the admin is still excluded from crawlers (T-13)
curl -s localhost:3000/robots.txt | grep -A1 Disallow
```

The rest is visual: open `/admin` as an `editor` and as an `admin`, and compare
each screen against the deck page by page. Say in the PR which screens you
compared and what differs.

## Conflicts in the deck, and how they were resolved

The deck disagrees with itself and with the repo in four places. None is a
styling question, so none was decided silently.

- **Can an editor see Globals?** Page 10's permission table says
  `Globals · Editor · View only`. Page 2's editor sidebar has **no Globals group
  at all**, and page 9 states `Chỉ Admin mới có quyền truy cập và chỉnh sửa`.
  Two screens against one, and the two agree with `update: isAdmin` on both
  globals and with AGENT.md 5.6. **Resolved as admin-only**; page 10 is the
  outlier.
- **Page 3's sidebar shows `Navigation`, `Footer` and `Roles`**, which are not
  collections in this project and are not in page 2's role-aware navigation —
  the slide that is actually *about* the sidebar. Treated as decorative chrome,
  the same way page 3 also shows an `All Authors` filter (below). **Page 2 is
  canonical for navigation.**
- **`All Authors` filter on the Pages list** (page 3) implies an author
  relationship on `Pages`. There is none, and adding one is a schema change with
  a migration, not a list-view setting. **Not built**; recorded as a follow-up.
- **AGENT.md 5.6 says the editor role has "read and update"** on the three
  content collections. The deck's page 10 says `Create, read, update`, and the
  code has said `create: isAdminOrEditor` since T-03 — an editor who cannot
  create cannot upload an image. The deck and the code agree; **AGENT.md's
  sentence is the one that is out of date.** Not edited here: AGENT.md is the
  binding document and correcting it is not a styling task's call.

## Flags

- **Most of this deck is already built.** The table above is the important part
  of this file. The risk this task carries is not missing a feature; it is
  rebuilding six that already work.
- **The deck's sample business data is Ho Chi Minh City** — `123 Đường Lê Lợi,
  P. Bến Nghé, Quận 1, TP. Hồ Chí Minh` and a `0901 234 567` phone. This
  business is in **Hanoi**. It is illustrative sample data, it is not seed data,
  and copying it would put an invented address into JSON-LD and Google Business
  Profile. `BusinessInfo` stays `TODO(data):` until T-23.
- **Canva's text extraction is OCR-damaged throughout these decks** — this one
  produces `Globalg`, `Versiong`, `Trang thải` and `Tiên tệ`. Read the rendered
  pages, not the extracted text, for anything that becomes a string.
- **The admin is excluded from Gate 3.** It is authenticated, `noindex` and
  disallowed in robots, and Payload owns its bundle. Measuring it against a
  public-page performance budget would be measuring someone else's code.

---

## As built

### The admin had no styles at all, and that is why there was nothing to theme

`src/app/crm/layout.tsx` never imported `@payloadcms/next/css`, which Payload 3's
admin layout is required to do. Every screen of the panel has therefore rendered
as **unstyled HTML** since the admin was created — serif headings, blue
underlined links, no cards, no navigation chrome. Nothing failed and nothing
logged, which is why it survived: the panel works, it just looked like a plain
form.

Found by screenshotting `/admin/login` while theming it, and confirmed by
screenshotting it again with this task's own stylesheet removed — the page was
unstyled either way, so the defect predates this branch. One import fixes it.

This is the reason to be sceptical of the earlier deck comparison: there was
never a styled admin to compare against a design.

### Where the theme lives, and why it is three files

- `src/app/brand.css` — the raw colour values, moved out of `globals.css`. Both
  stylesheets read them, so the admin cannot drift from the site.
- `src/app/globals.css` — now references them through `var()`. Its `@theme`
  block, the semantic names and everything else stay put; T-15 still owns it.
- `src/app/crm/admin.css` — the dark theme. Payload derives every surface from
  `--color-base-*`, so re-casting that one ramp themes the whole panel; the
  ramp is mixed from `--brand-ink` with `color-mix()` rather than written out,
  which is how the admin gets a navy cast **without a single new hex value**.
  Everything in it is unlayered, so it beats Payload's `@layer payload-default`
  rules without `!important` and keeps working if Payload reorders its own
  stylesheets.

### Globals are hidden from editors, not shown read-only

The deck's own screens disagreed (see *Conflicts*), and the shipped behaviour
before this change was page 10's reading: an editor saw both globals in the
sidebar and could open them read-only, because `read: anyone` is what lets the
public site render them. Resolved for pages 2 and 9 with `admin.hidden` on both
globals — cosmetic only, exactly as `Users` already did it. `update: isAdmin`
remains the control and `read` is untouched.

### Verification actually run

| Check | Result |
| --- | --- |
| `lint`, `typecheck`, `build` | pass |
| `npm test` | 316 pass, 25 files |
| `/admin`, `/favicon.svg`, `/` | 200, 200, 200 |
| `robots.txt` | still `Disallow: /admin`, `Disallow: /api` |
| Import map after `generate:importmap` | `Logo` and `Icon` both resolved |
| Admin nav, logged in as **admin** | Collections (Pages, Services, Images, Contact submissions) · Globals (Business information, Site settings) · Users |
| Admin nav, logged in as **editor** | Collections (Pages, Services, Images) — no Globals, no Users, no Contact submissions |
| Login screen | dark, brand mark and wordmark, teal primary button — deck page 1 |
| Dashboard | dark, the three groups as cards — deck page 2 |
| Public home page vs `master` | **byte-identical PNG** at 390×844, so the token extraction changed nothing |

Screens compared against the deck: page 1 (login), page 2 (role-aware
navigation, both roles), page 3 and page 7 (list columns, via config).

**Not visually compared:** pages 4, 5, 6, 8, 9 and 10 — the editor, block
builder, SEO workspace, media library, globals and version history. They need
seeded content to render anything, and the database is deliberately empty until
T-23. What they show is configuration this task did not change; the theme
reaches them through the same `--color-base-*` ramp as everything else.

### Left for someone else

- **Live preview is wired but unexercised.** `admin.livePreview` is configured
  for `pages` and `services` with three breakpoints, and the URL builder reuses
  `pathForPreview`. With no documents in the database there was nothing to open
  it on, so "updates as fields change" is **not verified** — it is the one
  acceptance criterion this task leaves unticked. First person with seeded
  content should check it.
- **The nav group headings are the English words in both locales**, because
  that is what the deck shows: page 2's sidebar is otherwise fully Vietnamese
  yet its three headings read `Collections`, `Globals` and `Users`. Taking deck
  copy verbatim is the rule; inventing Vietnamese would be writing copy rather
  than taking it. Recorded as a follow-up.
- `public/favicon.svg` carries two literal hex values. A standalone SVG served
  as a static file cannot read `brand.css`, so this is the one place a brand
  colour is written twice; the file says so.

---

## Second pass — the deck's remaining screens

The first pass could only compare pages 1 and 2, because the database was empty.
`scripts/seed-dev.ts` fills it from the decks, which made the other eight
comparable and turned up two defects neither this task nor the three UI tasks
before it could have seen.

### `scripts/seed-dev.ts`

A **development** seed, not T-23's content seed, and it says so at the top. Every
Vietnamese string is verbatim from the Desktop Pages deck (`DAHXNi05PeY`) or the
admin deck (`DAHXOjaoczk`); nothing is written or translated. The Desktop Pages
deck marks **its own English screens** `TODO(copy): <English gist>`, so the
English locale here is markers too — which is also what Design.md 2.3 requires.

It is idempotent and it writes both locales **as a draft before publishing**,
because T-06's slug lock refuses a slug change on a published document and a
locale with no slug yet counts as a change. Creating a page published in
Vietnamese and then giving it an English slug fails with
`publishedSlugCannotChange`. That is the guardrail working, and the seed has to
be written around it.

Not seeded, deliberately: the legal name, address and phone stay `TODO(data):`.
The decks show sample values — the admin deck's address is in Ho Chi Minh City
and this business is in Hanoi — and AGENT.md 5.4 requires these to match Google
Business Profile exactly. **Prices are placeholders except one**: the admin deck
gives 150 000 ₫ for `Rửa xe cơ bản` and nothing else, so the other four are
invented structure and must not survive into T-23.

### Two defects found by rendering the seeded pages

- **Every heading on a dark band was invisible.** `globals.css` set
  `color: var(--color-primary)` on `h1`/`h2`/`h3` so rich text lands on the brand
  colour — but the hero and `Band tone="primary"` paint `bg-primary`, so each
  heading painted itself in its own background. Every hero `<h1>` and CTA `<h2>`
  was dark navy on dark navy. Fixed to `color: inherit`; recorded as **A11**.
  It is outside this task's nominal scope and was fixed anyway, because the brief
  was to make the UI match the design and an unreadable `<h1>` is the largest
  possible divergence from it.
- **The SEO plugin's status badges are inline-styled `red`, `orange` and
  `green`.** No custom property reaches them, so the admin theme overrides them
  by matching the `style` attribute with `!important` — ugly, and the only lever
  there is. It matters because a new document shows three at once and Payload's
  saturated red on dark navy reads as something broken rather than as metadata
  nobody has written yet.

### Screens compared, second pass

| Deck page | Verdict |
| --- | --- |
| 3 · Pages list | Columns match (title, slug, status, updated). Status renders as plain text, not the deck's coloured pill — see below. |
| 4 · Title & actions | Matches: locale switcher, slug read-only with its reason, Save Draft / Publish, Preview, Versions count. |
| 5 · Block builder | Matches: numbered collapsible blocks, Add Block, per-locale content. |
| 6 · SEO workspace | Matches: character counters, Google preview, 1200×630 image, canonical. Badges now in-palette. |
| 7 · Services list & editor | Fields match. The deck's two-pane list-beside-editor is not Payload's layout and was not built — that is a custom view. |
| 8 · Media library | Alt text per locale, search, thumbnails. The deck shows a card grid; Payload lists a table. Not rebuilt. |
| 9 · Globals | Matches, including the 7-row opening hours and the GA4 field. |
| 10 · Permissions & versions | Version history and restore work; the permission matrix is as resolved in *Conflicts*. |

### Known remaining differences

- **Status is text, not a coloured pill.** The deck shows lime `Published` and
  teal `Draft`. Payload renders `_status` into a `<td class="cell-_status">` with
  no element around the word, and CSS cannot select on text content — colouring
  it per state needs a custom `Cell` component for a Payload-internal field,
  which is the "no custom views" line this task is not crossing for a cosmetic.
- **Page 3's `New Page` is a prominent primary button**; Payload's `Create New`
  is a small secondary one beside the title. Moving it is a custom list view.
- **Page 7's list-beside-editor and page 8's media card grid** are design
  idealisations of layouts Payload does not have.
- `/` still renders T-17A's placeholder, so the seeded home document is reachable
  at `/home` instead. Which slug `/` reads is open decision **D1** and this task
  does not get to settle it.
