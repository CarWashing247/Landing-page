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

> **Design source: Canva "AutoWash247 Admin CMS UI"** (design `DAHXNnCsHfc`,
> 8 pages). Read it before starting. Use the T-15 tokens by name; do not
> re-read hex values out of the deck.

## Read this before scoping the work

**The deck's screens are Payload's information architecture, restyled.** Nearly
every element in them maps to a Payload feature this project has already
configured. Reading the deck as a specification for a bespoke CMS would mean
rebuilding, in custom React, software that already exists and already works —
and then maintaining it across Payload upgrades.

So the first job is subtraction. What the deck depicts that is **already
delivered**:

| Deck shows | Already built by |
| --- | --- |
| Draft / published status badges ("Nháp", "Đã xuất bản") | T-06, T-07 (`versions.drafts`) |
| Slug locked once published ("Đã publish" on the slug) | T-06 (`slug-field.ts`) |
| Language switcher in the editor (Việt / English) | T-04A (`localization`) |
| Block composer — Hero, Steps, Pricing, FAQ, CTA | T-17 owns the blocks themselves |
| SEO panel: Google preview, character counters, canonical, noindex, focus keyword, social image | T-08 (`fields/seo.ts` + `plugin-seo`) |
| "SEO tiếng Anh để trống → trang này sẽ được đặt noindex" | T-08's `forceNoindexWhenUntranslated` — the deck is describing the guardrail that already exists |
| "Xem trước" per row and in the editor | T-12 (`admin.preview`) |
| Version history and "Khôi phục phiên bản" | T-06, T-07 (`maxPerDoc: 50`) |
| Media: required alt text per language, caption, dimensions | T-02 |
| Roles Admin / Editor with scoped access | T-03 |
| Business Information and Site Settings as globals | T-05 |
| Services with price in VND, duration, status, language | T-07 |

If a step below seems to ask for one of these, it is asking for it to be
**styled**, not built.

## Scope

**In scope**

- **Brand theming.** Payload 3 has **no `admin.css` config key** — checked
  against the installed `payload@3.90.2` types, which have `admin.meta`,
  `admin.components` and `admin.livePreview` but nothing for a stylesheet. The
  admin's styles are reached by importing a stylesheet into
  `src/app/crm/layout.tsx`, the admin's own root layout, which currently imports
  none on purpose (it must *not* pull in `globals.css` — Tailwind's preflight
  fights Payload's own styles, which is why the two folders have separate
  layouts). Payload exposes its appearance as CSS custom properties, so the
  theme is a small stylesheet overriding those, not a rewrite.
- **The logo and the nav icon**, via `admin.components.graphics.Logo` (the login
  page) and `.Icon` (the navigation). Those are the two the API offers; the deck
  shows both.
- **`admin.meta`**: the admin's own title and favicon, so a browser tab says
  what this is rather than "Payload".
- **Navigation grouping**, via `admin.group` on each collection and global, to
  match the deck's grouping (content, globals, users) rather than Payload's flat
  default list.
- **List views**: `defaultColumns`, `admin.useAsTitle`, `listSearchableFields`
  and `admin.pagination` tuned to the columns the deck shows — name, status,
  language, last updated, preview.
- **Live preview beside the editor.** The deck shows the page rendering next to
  the form; Payload's `admin.livePreview` does exactly this. T-12 delivered
  `admin.preview`, which opens a new tab — a different feature, and the deck
  shows both.
- **A dashboard**, via `admin.components.views.dashboard`, showing what the deck
  shows: recent edits and the counts an editor opens the CMS to check.
- **`Màu chủ đạo`** (brand colour) on `SiteSettings`, which the deck shows and
  the global does not have.

**Out of scope**

- **Rebuilding Payload's views in custom React.** See the table above. A custom
  list or edit view is a maintenance liability that must be re-tested on every
  Payload upgrade, for an internal tool used by a handful of people.
- Any public-facing page.
- Security, rate limiting, 2FA and backups — that is T-22, and the split is
  deliberate: how the admin *looks* and how it *resists attack* fail in
  different ways and are reviewed by different people.
- Editorial approval. See the Decisions section.

## Steps

1. Read the deck. Map each screen onto the table above and write down what is
   genuinely missing before changing anything.
2. Add the admin stylesheet and point the palette at the T-15 tokens. Do not
   restate hex values.
3. Set `admin.meta` and the logo and icon components.
4. Add `admin.group` to every collection and global, and tune `defaultColumns`
   and the searchable fields per the deck's tables.
5. Wire `admin.livePreview` for `Pages` and `Services`, reusing the URL builder
   in `src/lib/preview.ts` rather than writing a second one.
6. Build the dashboard view.
7. Add the brand colour field to `SiteSettings`.
8. Check the admin in both admin languages — Payload's own UI is translated and
   this project registers its messages through `src/i18n/admin-translations.ts`
   (AGENT.md 5.6).

## Files

```
src/payload.config.ts            # admin.meta, components, livePreview, folders
src/app/crm/admin.css            # the brand theme, imported by crm/layout.tsx
src/app/crm/layout.tsx           # the one place that import can go
src/components/admin/Logo.tsx    # and Icon.tsx
src/components/admin/Dashboard.tsx
src/collections/*.ts             # admin.group, defaultColumns
src/globals/*.ts                 # admin.group, brand colour field
```

`crm/layout.tsx` carries a comment saying its shape is dictated by Payload and
to change it only for an upgrade. Adding one stylesheet import is the exception
this task needs; keep it to that.

Run `npm run generate:importmap` after adding any admin component — Payload
resolves custom components through the generated import map, and this project
keeps it at `src/app/crm/admin/importMap.js` (see `payload.config.ts`).

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] The admin uses the brand palette and logo, and its colours come from the
      T-15 tokens rather than new hex values.
- [ ] Navigation is grouped as the deck groups it.
- [ ] `Pages` and `Services` list views show the deck's columns and filters.
- [ ] Live preview renders beside the editor and updates as fields change.
- [ ] A dashboard replaces Payload's default landing view.
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
grep -c 'Logo\|Icon\|Dashboard' src/app/crm/admin/importMap.js
# the admin is still excluded from crawlers (T-13)
curl -s localhost:3000/robots.txt | grep -A1 Disallow
```

The rest is visual: open `/admin` as an `editor` and as an `admin`, and compare
each screen against the deck page by page. Say in the PR which screens you
compared and what differs.

## Decisions still open

These are in the deck but are **product scope, not styling**, and should be
decided before they are built:

- **A `Menu` collection.** The deck's sidebar lists "Menu" between Media and
  Users, implying navigation managed in the CMS. Today the header's navigation
  comes from the T-15A catalog, which is a developer-edited file. CMS-managed
  navigation is a new collection, new access rules and a new cache tag — a task
  of its own, not a line in this one.
- **An approval step.** Page 7 shows a four-stage publish flow: Soạn thảo →
  Xem trước → **Kiểm duyệt** → Xuất bản. Payload has drafts and versions but no
  review-and-approve gate; that is a workflow feature, and with two roles and a
  small team it may not be wanted at all. Design.md's publishing model
  (section 2) has three stages, not four.
- **Media folders.** The deck shows a folder taxonomy (Banner, Dịch vụ, Hướng
  dẫn, Tin tức, Khuyến mãi). Payload supports this natively — the root config
  takes `folders`, with a `browseByFolder` view — so it is a flag and a
  migration rather than custom work. Still worth confirming the editors want it
  before adding a dimension that everything uploaded has to be filed into.

## Flags

- **Most of this deck is already built.** The table above is the important part
  of this file. The risk this task carries is not missing a feature; it is
  rebuilding six that already work.
- **`#29C885` in the deck's text is an extraction error.** The brand colour on
  page 7 reads `#29C885`, which is one character away from the Accent token
  `#29C8B5` defined in the UI Foundation deck and implemented in T-15. Canva's
  text extraction is OCR-damaged elsewhere in these decks too (it produced "Bằng
  giả" for "Bảng giá" in the Website UI deck). Treat `#29C8B5` as correct and do
  not introduce a second teal.
- **The admin is excluded from Gate 3.** It is authenticated, `noindex` and
  disallowed in robots, and Payload owns its bundle. Measuring it against a
  public-page performance budget would be measuring someone else's code.
- Sample data in the deck — editor names like `nguyen.vu@autowash247.vn`,
  prices, timestamps — is illustrative. It is not seed data and it is not
  business data.
