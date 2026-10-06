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

Not a quick fix, and not for want of trying. **Four combinations have now been
measured, and all four produce the same empty SSR body:**

| `globalNotFound` | boundary | result |
| --- | --- | --- |
| on | `not-found.tsx` per locale | never built (T-09) |
| off | `not-found.tsx` per locale | renders into the RSC payload only (T-09) |
| on | `not-found.tsx` at `app/landing-page/` | built (`/_not-found` appears), renders into the RSC payload only (T-16) |
| off | `not-found.tsx` at `app/landing-page/` | renders into the RSC payload only (T-16) |

In every case the response is a correct 404 with `<html id="__next_error__">`, an
empty `<body>` and the component's markup present only inside
`self.__next_f.push(...)` — so it would paint after hydration and never for a
crawler.

**The suspected cause is the catch-all rewrite, not the boundary.** T-09 rewrites
`/:path*` onto `/landing-page/:path*`, so no public URL is ever unmatched and
every 404 comes from `notFound()` inside `[slug]` on a rewritten request. That
makes `global-not-found.tsx` dead code for public paths and is the one variable
none of the four tests changed. The next attempt should start by serving a 404
on a path that bypasses the rewrite and comparing.

T-16 built the shell the 404 should render inside, so the page is the only piece
still missing. It stays a 404 architecture decision.

~~The 404 copy is still `TODO(copy)`~~ **The 404 copy now exists** (T-15A moved it
into the message catalog: "Không tìm thấy trang này." / "We could not find that
page."), which makes this entry more visible rather than less — there is now
finished wording that nobody can see. Re-measured during T-15A: `/khong-ton-tai`
returns 404 with an empty body and `<html id="__next_error__">`, so none of the
catalog strings render. T-16 has now built the header and footer it should sit
inside, so everything but the page itself is ready.

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

### A3 · `safeLocalPath` passes `/\host`, so the exit route is an open redirect

**Owner: `src/lib/preview.ts` (T-12's file)** (recorded in
`task/t-12-draft-preview.md`)

`safeLocalPath` rejects an absolute URL and the protocol-relative `//host`, and
its comment names those as the two shapes that matter. There is a third. A
backslash: `/\evil.example` starts with one slash and not two, so the guard
passes it, and the URL parser every browser uses reads that backslash as the
second slash of an authority.

Measured against the built server, with no secret and no draft cookie — the exit
route requires neither:

```
POST /api/draft/exit?to=%2F%5Cevil.example
  → 303 See Other
    location: /\evil.example
new URL('/\evil.example', 'https://site/')  → https://evil.example/
```

`to=%2F%5C%2Fevil.example%2Fphish` behaves the same way. Because Next answers a
form-encoded `POST` with a 303, the browser follows it as a `GET`, which is the
clean version of the hop the comment in `safeLocalPath` set out to prevent.

One line closes it: disqualify a `to` whose second character is `/` **or** `\`
(and a `\` anywhere else, which no local path here needs). `preview.test.ts`
already has the `//` rows to copy.

### A4 · `/api/draft` answers a missing `PREVIEW_SECRET` with a bare 500

**Owner: `src/app/api/draft/route.ts` (T-12's file)** (recorded in
`task/t-12-draft-preview.md`)

`secretMatches()` throws when the key is absent from Vault, deliberately: a
failure to *read* the expected secret is an outage, not a refusal. `/api/draft`
does not catch it. `/api/revalidate`, which has exactly the same dependency,
returns 503 and writes `log.error('cannot verify', …)` for the same case.

Measured with `PREVIEW_SECRET` removed from the Vault path and nothing else
changed: HTTP 500, empty body, and the only record is an unhandled stack trace
in the server output. `grep ' [ERROR] '` finds nothing, which is the silence
AGENT.md 5.8 exists to prevent.

### A6 · Two smaller rule slips in T-12's files

**Owner: T-12's files** (recorded in `task/t-12-draft-preview.md`)

Neither is user-visible today; both are the kind of thing that is cheapest to
fix before another file copies it.

- ~~**`DraftBanner.tsx` styles itself with inline `style={{…}}` objects.**~~
  **Fixed in T-16**, which owned replacing them with tokens. It is now
  `bg-highlight text-on-highlight` in normal flow rather than fixed-positioned
  amber — the palette has no amber, and fixed positioning overlapped the new
  header.
- **The exit side of the preview contract hardcodes its parameter names.**
  `preview.ts` declares `PARAM` as the one place those names live, "shared by the
  builder and the parser", precisely so a rename cannot half-land — and then
  `to` and `locale` are spelled as literals in `api/draft/exit/route.ts` and
  `DraftBanner.tsx`.

---

### A7 · T-14's Rich Results Test has not been run

**Owner: whoever deploys first, and T-21 before it submits to Search Console**
(recorded in `task/t-14-json-ld.md`)

The acceptance criterion is "every emitted schema passes Google's Rich Results
Test with zero errors". The test takes a public URL and this site is not
deployed; its code-paste mode needs a browser session and sends the page to an
external service, which was not done unasked.

There is also no browser tool in this environment: `WebFetch` cannot reach
`localhost` and cannot drive a JavaScript application, so the code-paste mode is
not reachable either.

Verified instead, and it is worth more than it sounds: every emitted node is
checked against schema.org's own published vocabulary in
`src/lib/schema/schema-org.test.ts` — every `@type` must be a real class, every
property must be defined on that type or an ancestor — along with the properties
Google documents as required per type, and every block was read out of the HTML
with `curl` on all three route types in both locales. That check found a real
error T-14 had shipped (`inLanguage` on `AutoWash` and `Service`; see B4).

It is still not sufficient. It covers schema.org's vocabulary, not Google's
rich-result eligibility, and only Google's test covers the latter. Run it on the
first deployed URL.

### A8 · Two components carry raw hex, and one of them is off-palette

**Owner: T-16** (recorded here only)

T-15's acceptance criterion is "no tokens bypassed — no raw hex in a component".
Two pre-existing files still have some, and they are not the same case:

| File | Values | Why it is there |
| --- | --- | --- |
| `src/components/seo/OpenGraphImage.tsx` (T-09) | `#0b1b2b`, `#ffffff` | Rendered by Satori via `ImageResponse`, which does not run Tailwind — inline styles are the only option |
| `src/components/DraftBanner.tsx` (T-12) | `#b45309`, `#ffffff` | Inline styles chosen so the banner ships no CSS to published pages |

**The OG image's background is off-palette**: `#0b1b2b` against the design's
Primary `#0b1f33`. Close enough to look deliberate, different enough to be wrong
in every share card the site produces.

Not fixed here for two reasons. Changing it alters every rendered share image,
which is T-09's surface rather than a token task's. And doing it *properly* needs
a decision T-15 should not take alone: Satori cannot read the CSS tokens, so
either the palette is duplicated into a TypeScript module — creating the second
source of truth this project otherwise avoids — or the OG image imports from a
generated file. T-16 touches both components anyway.

The banner's hex is defensible as-is; now that tokens exist it could become
classes, but only once T-16 decides whether the banner keeps shipping zero CSS.

### A9 · A service's photo is promised as the share image and is not used as one

**Owner: `src/components/seo/metadata.ts` (T-09's chain) and
`src/collections/Services.ts` (T-07's field)** (recorded in
`task/t-18-service-detail-template.md`)

`Services.image` tells the editor, in both languages, that the photo is "used at
the top of the service page and as the share image". The first half is true as of
T-18. The second is not: `buildMetadata()` resolves `og:image` from `meta.image`,
then `SiteSettings.ogFallback`, then the generated `opengraph-image` route, and
never looks at `service.image`.

Measured on the built server with a service whose photo was uploaded and whose
SEO tab was left blank, which is the state the description describes:

```
<meta property="og:image" content="http://localhost:3000/opengraph-image"/>
```

So every service shares the generic brand card instead of the wash it is selling,
and the editor has no way to tell — the field they filled in says it is handled.

Two fixes, and the choice is a decision rather than a typo. Either
`buildMetadata()` gains a per-collection image fallback — the chain is
collection-agnostic today, and `Pages` has no equivalent field, so this adds a
branch to the one function T-09 built to have none — or the field description
stops promising it and points at the SEO tab. The first is what the editor
expects; the second is one string.

Not T-18's to take: the template renders the hero the task asked for, and the
share-image chain is the metadata builder's contract.

### A10 · `/dich-vu` 404s, and no task creates the document behind it

**Owner: T-23, with a planning hole behind it** (recorded in
`task/t-23-content-seed.md`)

The header links "Dịch vụ" to `/dich-vu` (`src/lib/routes.ts`, T-16), and that
file states the contract: "the services index is the segment itself — `/dich-vu`
against `/en/services` — which is a `Pages` document at that slug rather than a
route of its own". Nothing creates that document. Design.md section 3 lists five
routes and the index is not one of them; T-23 step 1 copies that list — `/`,
`bang-gia`, `huong-dan`, `lien-he`, plus `dich-vu/<slug>` per package — so the
seed will not create it either.

The result is a header link that 404s on every page of the site, which is how
this was found: reported from a running deployment, not from reading the code.

**The routing is fine, and that is worth recording** because it looks like the
suspect. A static `dich-vu/` folder (the service detail route) sits beside
`[slug]` in the same segment, and Next still falls back to `[slug]` for
`/landing-page/dich-vu` because that folder has no page of its own. Measured
against the built server: 404 before a published page existed at the slug, 200
after, in both locales — and the next build prerendered
`● /landing-page/dich-vu` next to `● /landing-page/dich-vu/rua-xe-nhanh`, and
`● /landing-page-en/services` next to `● /landing-page-en/services/quick-wash`,
with no route collision.

So the fix is content, and it is two decisions rather than one `create`:

- **Both locales need their own slug** — `dich-vu` for `vi` and `services` for
  `en`. An `en` page with no slug of its own inherits the Vietnamese one through
  Payload's fallback, and `publishedSlugs()` then drops it, so the English index
  silently stays a 404 while the Vietnamese one works. That was the second half
  of the measurement above.
- **The slug cannot be corrected later** (T-06 locks it on publish), so it has to
  be right the first time.

Not fixed here: creating it means writing real Vietnamese copy for a page the
decks do cover, which is T-23's job and not something to machine-translate
(CLAUDE.md). What this entry asks for is that T-23's list gains the sixth
document, and that whoever seeds it knows about the per-locale slug.

### A11 · Every heading on a dark band was invisible — fixed in T-19A

**Owner: was T-15 / T-17. Fixed, recorded here because the cause outlived the
task that introduced it.**

`src/app/globals.css`'s base layer set `color: var(--color-primary)` on `h1`,
`h2` and `h3`, so that an editor's rich-text heading lands on the brand colour
without a class. But `Band tone="primary"` and the hero both paint
`bg-primary text-on-primary`, and a heading that re-declares the primary colour
paints itself in its own background: **dark navy on dark navy.** Every hero
`<h1>` and every CTA `<h2>` was unreadable.

It survived three UI tasks because it is invisible in both senses. The text is
in the HTML, so the markup, the metadata, the heading outline and every
`curl`-based check in every task's verification block all passed — and no page
had any content to render until T-19A seeded some. Found by screenshotting
`/bang-gia`, confirmed with `getComputedStyle`: `rgb(11, 31, 51)` on
`rgb(11, 31, 51)`.

Fixed by making the three rules `color: inherit`, so a heading takes the colour
its band already states — which is what the `on-*` tokens exist for. The sizes
stay, because that half of the rule is what rich text needs. On a light band the
rendered colour moves from `--color-primary` to `--color-ink`, two near-black
navies one step apart.

**Worth generalising:** `curl | grep '<h1'` cannot see a contrast bug, and three
tasks' verification blocks were built on exactly that. Anything about appearance
needs a rendered page.

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

### B2 · T-12 describes a refactor of `/api/revalidate` that never landed

**Owner: `src/app/api/revalidate/route.ts` and `src/lib/secrets.ts`** (recorded in
`task/t-12-draft-preview.md`)

T-12's commit message says the timing-safe comparison "moved into secrets.ts as
`secretMatches` … `/api/revalidate` now uses it too rather than keeping a second
hand-rolled copy", and `secrets.ts` repeats it in prose: "Two endpoints need it —
`/api/revalidate` and `/api/draft`".

Neither is true. `/api/revalidate` still has its own `matches()` and its own
`createHash`/`timingSafeEqual` import, and `git log -- src/app/api/revalidate/route.ts`
stops at T-11. The file was simply not in the commit.

So the second hand-rolled comparison the refactor existed to remove is still
there, in the one area — credential handling — where AGENT.md 5.7 asks for a
single place. The fix is three lines and the behaviour is identical; what makes
it worth doing is that a reader who trusts either comment will not go looking.

The same T-12 commit also says `draftMode()` is read "in the page component and
in the banner" for the home pages. It is not read there at all — see A5.

---

### B3 · T-14's task file contradicted Design.md twice

**Owner: none — both corrected in `task/t-14-json-ld.md` during T-14**

Recorded here only because the pattern is worth noticing: the task file asked for
an `Organization` node in the root layout, which neither Design.md's T-14
paragraph nor AGENT.md 5.4 mentions and which would put two entity nodes for one
business on every page; and it asked for `Mo`–`Su` day tokens, which belong to the
`openingHours` string form rather than to the `openingHoursSpecification` that
Design.md actually names.

Both were followed to the point of writing the code before being checked against
Design.md. CLAUDE.md's rule — the task file is what is wrong when they disagree —
is what caught them, and it is worth applying before implementing rather than
after.

### B4 · AGENT.md 5.4 requires `inLanguage` on schemas that cannot carry it

**Owner: `AGENT.md` — needs a decision, recorded in `task/t-14-json-ld.md`**

AGENT.md 5.4 says "Every emitted schema carries `inLanguage` for the rendered
locale". Checked against schema.org's published vocabulary, `inLanguage` is
defined on `CreativeWork`, `Event`, `BroadcastService`, `CommunicateAction`,
`LinkRole`, `PronounceableText` and `WriteAction` only:

| Node | `inLanguage` valid? | Why |
| --- | --- | --- |
| `FAQPage` | yes | `FAQPage` < `WebPage` < `CreativeWork` |
| `AutoWash` | **no** | `AutoWash` < `AutomotiveBusiness` < `LocalBusiness` < `Organization`/`Place` |
| `Service` | **no** | `Service` < `Thing`, and no language property is defined on it |

T-14 emits it on `FAQPage` alone and `src/lib/schema/schema-org.test.ts` pins
that. The only language property valid on `AutoWash` is `knowsLanguage`, which
states which languages the business can serve customers in — a claim about the
business that nothing in the CMS supports.

Nothing is lost by the omission: `<html lang>`, the reciprocal `hreflang` set and
`og:locale` all carry the page's language already (T-09).

**Left as a note rather than an edit** because AGENT.md is the binding document
and narrowing one of its rules is not a typo fix. The sentence wants to become
something like "every emitted schema that schema.org defines `inLanguage` on
carries it". One line in `src/lib/schema/` reverts the behaviour if literal
compliance is preferred instead.

### B5 · The contact map is bypassed for now, by decision

**Owner: a later enhancement task** (recorded in `task/t-19-contact-page.md`)

**Decided 2026-10-06: the map is deliberately bypassed in the UI for this
release and will be done as an enhancement later.** What follows is why the
question arose and what the bypass costs, so the enhancement starts from it
rather than rediscovering it.

Design.md section 4's T-19 entry and the task file both make a lazily loaded
Google Maps embed the headline deliverable — it is named in the scope list, in
step 4, and in two acceptance criteria. Both decks say the opposite:

- The Desktop Pages deck (`DAHXNi05PeY`, page 6, "Liên hệ / lien-he") shows a
  heading, a lead paragraph, a form and three detail cards. **No map.**
- The UI Foundation deck's layout rules state "Map and contact integrations are
  out of scope for this release".

T-19's own file flags the contradiction and says to resolve it before building.
It was resolved **in favour of the decks**, because the standing rule for Phase
3 is that the UI is what the decks show. `src/components/MapEmbed.tsx` is built,
documented and ready; nothing imports it.

Two consequences worth knowing before someone reads the task as done:

- The two map acceptance criteria ("the map iframe is `loading="lazy"`", "the
  map reserves its space — CLS contribution 0") are **vacuous as shipped**, not
  met. There is no iframe to measure.
- T-20's Gate 3 measurement on the contact page is therefore taken against a
  page with no map in it. Turning the map on later is one import, but it is also
  the single heaviest thing that can be added to this page, so it needs its own
  LCP measurement rather than inheriting T-20's.

**What the enhancement has to do**, beyond adding the import: run T-19's
Verification block against the page with the map in it, because none of the
numbers recorded there were measured with one. If the keyless
`/maps?q=…&output=embed` URL is swapped for Google's documented Embed API
(`/maps/embed/v1/place`), that needs an API key in `.env.example` in the same
commit.

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

**Owner: T-17A** (recorded in `task/t-09-build-metadata.md` and
`task/t-17a-home-page.md`)

T-17 was listed as the owner and merged without deciding it — reasonably, since
it built the blocks rather than the page that would use them. T-17A is the task
that cannot start without an answer.

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
that way. ~~The task file needs correcting when T-15 starts.~~ **Corrected in
T-15**, which implements the tokens in `src/app/globals.css`.

**Superseded as a design source.** T-15 found four Canva decks holding the real
design — "AutoWash247 UI Foundation" (`DAHXI-Jb8Ig`) plus Website UI, Desktop
Pages and Admin CMS UI — with a full palette, type scale, spacing and radii, and
designer-written Vietnamese copy. That is the source of truth now, and the
palette and type scale questions this entry raised about PR #15 are answered by
it. What remains worth reading in PR #15 is only how it structured components,
and the list of its mistakes above is still the checklist for not repeating
them.

---

### D3 · The Pages list has an author filter with no author field

**Owner: T-19A** (recorded in `task/t-19a-admin-interface.md`)

Page 3 of the admin deck (`DAHXOjaoczk`) shows an `All Authors` dropdown beside
the search box on the Pages list. `Pages` has no author relationship, so there
is nothing to filter on. Adding one is a schema change plus a migration plus a
`defaultValue` hook to stamp the creating user — not a list-view setting, and
not something to slip into a theming task.

Worth deciding rather than assuming: with two roles and a small team, "who last
touched this" is already visible in version history, and an author column earns
its place only if more than one person writes pages.

**This entry replaced the three product decisions the previous admin deck
raised** — a `Menu` collection, a `Kiểm duyệt` approval gate and a media folder
taxonomy. The deck that showed them (`DAHXNnCsHfc`) was superseded on
2026-10-06, and none of the three appears in its replacement. They are not
deferred; they are no longer asked for.

### D4 · The form's error colour is not in the design system

**Owner: T-15 / design** (recorded in `task/t-19-contact-page.md`)

The UI Foundation deck defines six colours and no error state, because none of
the screens it covers contains a form. T-19's contact form needs one: a
validation message is the one piece of interface that fails at its job if it
reads like a hint, and `--color-highlight` is explicitly the success cue while
`--color-ink` is body text. Clearing Tailwind's default ramps (T-15) also means
`text-red-700` is not a class at all and would have rendered unstyled.

So `src/app/globals.css` now carries `--color-danger: #b3261e` and
`--color-on-danger: #ffffff`, chosen rather than borrowed: 6.54:1 on white,
6.02:1 on `--color-surface`, and 6.54:1 for white on it, so it passes AA at the
`text-label` size the messages use.

**It is the only colour in the file that is not from the deck.** It wants a
designer's eye before it spreads beyond form validation — an error red is a
brand decision, and the next person who needs one will reach for this token
rather than ask.

### D5 · The two decks word the same contact fields differently

**Owner: needs a decision, recorded in `task/t-19-contact-page.md`**

T-15A built the `contact` catalog section from the Website UI deck
(`DAHXNsDnbjg`, page 8). T-19's named design source is the Desktop Pages deck
(`DAHXNi05PeY`, page 6). They disagree on three strings:

| Key | T-15A, from Website UI | Desktop Pages |
| --- | --- | --- |
| `nameLabel` | Họ tên | Họ và tên |
| `hoursHeading` | Giờ làm việc | Giờ mở cửa |
| `subjectLabel` | Chủ đề (free text) | Dịch vụ quan tâm (a picker) |

T-19 **changed none of them.** `hoursHeading` is already rendered by the footer
(T-16), so re-wording it here would silently change a component T-19 has no
business touching, and the other two are a coin toss between two signed-off
decks. The service picker is a genuinely different field rather than a
re-wording, so it got its own keys (`serviceLabel`, `servicePlaceholder`) and
`subjectLabel`/`subjectPlaceholder` are now **unused** — dead catalog keys, left
in place because deleting a string one deck still shows is also a decision.

Nothing is broken; the site is internally consistent. What is open is which deck
is canonical when they differ, which matters again at T-23.

### D6 · The admin's navigation group headings are untranslated

**Owner: whoever owns admin copy** (recorded in `task/t-19a-admin-interface.md`)

`admin.group` on every collection and global is `{ en: 'Collections', vi:
'Collections' }` and the same for `Globals` and `Users` — the English word in
both locales.

That is what the design shows. Page 2 of `DAHXOjaoczk` is the role-aware
navigation screen, its sidebar is otherwise fully Vietnamese (`Các trang`,
`Thư viện ảnh`, `Thông tin doanh nghiệp`), and its three group headings read
`Collections`, `Globals` and `Users`. T-19A took that verbatim rather than
inventing Vietnamese for them, because CLAUDE.md's rule is to flag copy that no
deck supplies rather than write it.

So a Vietnamese editor sees three English structural words above otherwise
Vietnamese navigation. It is not wrong — it is what was signed off — but it is
very likely an oversight in the deck rather than a decision, and it is three
short nouns to fix once someone confirms the wording.

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

### E3 · `npm ci` fails on the committed lockfile

**Owner: whoever next touches dependencies — found in the T-12 review**

A clean checkout cannot install:

```
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json … are in sync.
npm error Missing: yaml@2.9.1 from lock file
```

`npm install` resolves it and rewrites 174 lines of the lockfile, so the lock is
simply behind — it was last committed in T-08, and `cosmiconfig` now wants a
`yaml` the tree does not carry.

**Correction, from T-18.** This entry first said Vercel's install step fails the
same way, and named it as a candidate cause of the deployment failures standing
at the time. It is not: the lockfile is unchanged since T-08 and the deployments
for T-17 (#27) and T-18 (#28) both completed, so whatever install command the
project runs tolerates it. The deployment failures had the other cause this
register listed — the build reads Vault, so it needs `VAULT_ADDR`,
`VAULT_ROLE_ID`, `VAULT_SECRET_ID` and `DATABASE_URI` in the Vercel project —
and they are green now.

What is left is real but narrower: a clean `npm ci` fails, so a contributor
following the README and any CI job that uses `npm ci` both stop. The fix is one
`npm install` and committing the lockfile it produces, on its own, so the diff is
reviewable as a dependency change rather than riding a feature branch.

### E4 · `SITEMAP_TAG`'s name is narrower than its job

**Owner: T-11 / T-13** (recorded in `task/t-19-contact-page.md`)

What the tag actually means is "the set of published documents changed":
`src/lib/revalidate.ts` sends it on every page and service `afterChange` and
`afterDelete`. The sitemap is its first consumer, not its only possible one.

T-19's `loadServiceNames` — the published service names for the contact form's
picker — depends on exactly that condition and so is tagged with it. Correct,
and it reads like a mistake at the call site, which is the problem: the next
person needing the same purge either adds a redundant second tag and edits
T-11's hooks to send it, or decides the tag is sitemap-only and goes without a
purge path at all.

Renaming it to something like `PUBLISHED_SET_TAG` is a mechanical change across
`src/lib/cache-tags.ts`, `revalidate.ts`, `content.ts` and their tests. Left
alone because the rename touches T-11's hooks, which T-19 has no reason to
open, and a wrong tag string is a silently stale page rather than a build error.

---

## F. Watch list

Not defects — behaviour that is correct today and would be a defect if the
surrounding assumption changed.

- **`og:image:alt` falls back across locales.** `Media.alt` is localized and
  required, so an English page shares an image whose alt text is Vietnamese
  until someone writes the English one. That is Payload's documented fallback
  working as designed, and T-23 writes both. It becomes a defect only if T-23
  ships with one locale filled in.
- **`PREVIEW_SECRET` reaches every editor's browser.** `admin.preview` builds the
  URL with the secret in the query string, which is Next's documented CMS-preview
  contract and the reason `/api/draft` can trust the request — but it does mean
  the live value is in the HTML of each document view (verified: one occurrence
  in the server-rendered admin page), and from there in history and devtools for
  anyone with the `editor` role. That is the designed trade, not a defect. It
  becomes one if the secret is ever given a second job, or if "editor" stops
  meaning "may read every draft" — and it is why rotating it means Vault plus a
  redeploy, not just Vault.
- **A cache miss is cached under the same tag as a hit**, so an unknown slug
  occupies an entry for an hour. Bounded by the revalidate floor, and load
  bearing: it is what makes publishing a draft take effect through T-11's purge
  rather than only through the floor.
- **The Canva designs contain sample business data that reads as real.** Page 8
  of "AutoWash247 Website UI" shows a hotline of `1900 0000`,
  `info@autowash247.vn`, an address on Đường Lê Duẩn and hours of
  `Thứ 2 - Thứ 7: 08:00 - 18:00`. They are design placeholders, not the
  business's details, and they are deliberately absent from the T-15A catalog —
  business data lives in `BusinessInfo`, where it is still `TODO(data):`. The
  risk is that they are plausible enough to be copied in by someone building the
  contact page or seeding content, and an invented address reaches JSON-LD and
  Google Business Profile. T-19 and T-23 are where that would happen.
- **A rebuild does not refresh `unstable_cache`; only a purge or the floor does.**
  Observed during T-14: a social link added to `SiteSettings` before a rebuild was
  still missing from the rendered JSON-LD afterwards, and appeared the moment
  `globals` was purged. This is `unstable_cache` working as documented — entries
  survive a deployment on purpose — and T-11's hooks purge on every real edit, so
  it affects seeding and verification rather than editors. It is also the
  explanation for the "stale sitemap" episode during T-13. Worth knowing before
  concluding that fresh data did not reach a page.
- **Changing the shape of anything cached in `src/lib/content.ts` needs its cache
  key bumped, and nothing enforces that.** `unstable_cache` entries survive a
  deployment on purpose, so a new build is handed the previous build's values
  deserialized into the new type — a boundary TypeScript cannot see. T-13 hit it
  for real: adding a field to `SitemapDocument` failed the build on a `TypeError`
  reading the missing key, which is why `loadSitemap`'s key is now
  `['sitemap', 'v2']`. The other cached reads (`loadPage`, `loadService`,
  `siteSettings`) return Payload documents whose shape follows the collection, so
  they carry the same hazard without the same reminder.
