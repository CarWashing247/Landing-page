# Design.md

Architecture reference and task breakdown for the **AutoWash247 landing
page**.

`AGENT.md` tells an agent *how to write code here*. This file tells it
*what to build and in what order*. Each task below is sized for one branch
and one PR.

---

## 1. Architecture

### 1.1 Shape

One Next.js deploy contains four runtime pieces:

| Piece | Path | Responsibility |
| --- | --- | --- |
| Frontend | `landing-page/*` | Static pages, metadata, sitemap, JSON-LD |
| Admin | `crm/admin` | Payload CMS UI for non-technical editors |
| Revalidate webhook | `api/revalidate` | Purges edge cache tags on publish |
| Preview route | `api/draft` | Enables `draftMode()` for unpublished content |

Two data stores sit behind it: **PostgreSQL** (all content) and
**Cloudflare R2** (media). Both are external to the deploy.

### 1.1a Locales

The site ships in **Vietnamese and English**. Vietnamese is the default and
the primary market; English serves visitors who cannot read the Vietnamese
pages at all.

| Locale | URL shape | Example |
| --- | --- | --- |
| `vi` (default) | unprefixed | `/`, `/bang-gia`, `/dich-vu/rua-xe-nhanh` |
| `en` | `/en` prefix | `/en`, `/en/pricing`, `/en/services/quick-wash` |

The default locale is unprefixed so the Vietnamese URLs stay the shortest
path for the market that matters most, and so the slug design in section 3
survives unchanged. Slugs are **localized**: `bang-gia` and `pricing` are
different documents' worth of keyword value, and section 3 lists the slug as
one of the five placements that affect ranking.

Every page emits `hreflang` for both locales plus `x-default` pointing at
Vietnamese. A locale is a first-class part of the cache key, the sitemap and
the metadata contract — not a translation layer bolted on afterwards. See
section 4, T-04A, for why that ordering is not negotiable.

### 1.2 The two flows

**Read path.** Visitor or crawler hits the edge. On a cache hit the edge
serves pre-rendered HTML with zero JavaScript required. On a miss, the
frontend renders from Postgres and the result is cached under a tag.

**Write path.** An editor saves in `/admin`. Payload writes to Postgres,
then its `afterChange` hook POSTs to `/api/revalidate`, which calls
`revalidateTag()` for that page and for the sitemap. The next request to
that URL rebuilds and re-caches. **No CI/CD run is involved** — content
changes never trigger a build.

These two flows are independent. That independence is the whole point of
the architecture: it is why a non-developer can change a meta description
and see it live in seconds.

### 1.3 Cache tag scheme

Defined once in `src/lib/cache-tags.ts`:

| Tag | Covers | Purged when |
| --- | --- | --- |
| `page:<locale>:<slug>` | One CMS page in one locale | That page is published |
| `service:<locale>:<slug>` | One service page in one locale | That service is published |
| `sitemap` | `sitemap.xml` (all locales) | Any page or service is published |
| `globals` | Header, footer, JSON-LD | `BusinessInfo` or `SiteSettings` changes |

The locale is part of the page tag because translations are published
independently: fixing a typo in the English copy must not throw away the
cached Vietnamese page, and vice versa. A slug rename purges the old and new
slug **of that locale only**.

A `globals` purge is site-wide and therefore expensive. It is correct and
rare — opening hours do not change weekly.

---

## 2. Data model

### 2.1 Collections

`L` marks a **localized** field — stored once per locale, edited through the
locale switcher in `/admin`.

| Collection | Key fields |
| --- | --- |
| `Pages` | `title` `L`, `slug` `L`, `layout` (blocks) `L`, `meta` (SEO tab) `L`, `_status` |
| `Services` | `name` `L`, `slug` `L`, `includes[]` `L`, `meta` `L`, `price`, `durationMinutes`, `image`, `_status` |
| `Media` | `alt` `L` (**required**), `caption` `L`, generated sizes |
| `Users` | `email`, `role` (`admin` \| `editor`) |

`Pages` and `Services` both enable `versions: { drafts: true }`.

What is deliberately **not** localized: `price`, `durationMinutes` and
`image` on `Services` (one price, one photo, whatever language you read it
in), and everything on `Users`. On `Media`, `alt` is localized because it is
read aloud and indexed, so an English page needs English alt text.

Which fields are localized is a **schema** decision: Payload stores
localized values in separate tables, so adding `localized: true` to a field
later is a migration, not an edit. That is the whole reason T-04A precedes
T-06.

### 2.2 Globals

| Global | Holds |
| --- | --- |
| `BusinessInfo` | Legal name, street address, locality, lat/lng, phone, Zalo, opening hours per weekday, price range |
| `SiteSettings` | Brand name, default meta title suffix `L`, default description `L`, OG fallback image, favicon, GA4 measurement ID, social links |

Nothing in `BusinessInfo` is localized. Name, address and phone must stay
byte-identical to Google Business Profile (section 5.4 of `AGENT.md`), and a
translated street address is wrong in both languages.

`BusinessInfo` is the single source for the footer, the contact page and
the `AutoWash` JSON-LD. Nothing in a component may hardcode these values.

### 2.3 SEO field group

Lives in its own admin tab on both `Pages` and `Services`.

| Field | Type | Vietnamese label |
| --- | --- | --- |
| `meta.title` | text, max 70 | Tiêu đề trên Google — 50 đến 60 ký tự |
| `meta.description` | textarea, max 180 | Mô tả dưới tiêu đề — 140 đến 160 ký tự |
| `meta.image` | upload | Ảnh khi chia sẻ lên Facebook/Zalo — 1200×630 |
| `meta.canonical` | text | Để trống nếu không biết — hệ thống tự điền |
| `meta.noindex` | checkbox | Ẩn trang này khỏi Google |
| `meta.keywordFocus` | text | Từ khoá chính — chỉ để ghi nhớ, không ảnh hưởng thứ hạng |

Fallbacks are applied in `buildMetadata()`, not in the CMS: a blank
`meta.title` becomes `${title} | ${brandName}`, a blank `meta.image`
becomes `SiteSettings.ogFallback`. A page can therefore never ship without
tags, even if the editor skips the SEO tab entirely.

**The whole group is localized**, so each locale carries its own title,
description, canonical and keyword focus. `meta.image` is localized too: a
share card usually has words on it.

**Untranslated locales must not be indexed.** Payload's field-level fallback
means an English page with an empty SEO tab would render Vietnamese text
under an `/en/` URL — thin duplicate content that competes with the page it
was copied from. The guardrail reuses a field that already exists: a
`beforeChange` hook forces `meta.noindex` on for a locale whose `meta.title`
and `meta.description` are both empty, and T-13 already drops `noindex`
routes from the sitemap. An editor translates the SEO tab, and the page
becomes indexable by itself. No new concept to explain in the handover.

---

## 3. Keyword map

One page per keyword cluster. Two pages chasing the same term compete with
each other and Google picks one — usually not the one intended.

**Vietnamese** — the primary market:

| Route | Primary cluster | Search intent |
| --- | --- | --- |
| `/` | rửa xe tự động + area name | Finding a location, wants to know where and what |
| `/bang-gia` | giá rửa xe tự động | Comparing prices, close to deciding |
| `/dich-vu/<slug>` | the specific wash package name | Knows what they want, looking for that service |
| `/huong-dan` | rửa xe tự động có xước sơn không | Sceptical, needs reassurance |
| `/lien-he` | rửa xe tự động gần đây | About to drive over, needs address and directions |

**English** — a smaller audience with different intent. Expatriates and
visitors in Hanoi search in English, usually for a place that will not be a
language problem when they arrive:

| Route | Primary cluster | Search intent |
| --- | --- | --- |
| `/en` | automatic car wash hanoi | Finding a location that is easy to use |
| `/en/pricing` | car wash price hanoi | Comparing prices |
| `/en/services/<slug>` | the package name in English | Knows what they want |
| `/en/how-it-works` | is automatic car wash safe for paint | Sceptical, needs reassurance |
| `/en/contact` | car wash near me hanoi | About to drive over |

The English set is **not a translation of the Vietnamese keywords**. `car
wash price hanoi` and `giá rửa xe tự động` are different searches by
different people; translating the Vietnamese term produces a phrase nobody
types. Each locale's clusters are researched separately.

Store each page's cluster in `meta.keywordFocus`, which is localized. It is
never rendered — the `keywords` meta tag is ignored by search engines — but
it stops two editors writing two pages against the same term. **Uniqueness
is per locale**: `/bang-gia` and `/en/pricing` do not compete, because they
target different languages, and `hreflang` tells Google they are the same
page for different audiences.

Placement that matters: `<h1>`, the front of `meta.title`, the opening
paragraph, the hero image `alt`, and the slug — **in each locale
independently**. Beyond that, repetition does not help ranking and makes the
copy read like it was generated.

Never machine-translate either direction. An English page assembled by
running the Vietnamese copy through a translator reads as machine output to
the audience it is meant to win, and Google has been able to tell for years.
Untranslated copy stays `TODO(copy)` and the locale stays `noindex`.

---

## 4. Task breakdown

**Conventions.** IDs are stable; branch names derive from them
(`t-09-build-metadata`). `Depends on` means merged, not merely started.
Every task also inherits the definition of done in `AGENT.md` section 8 —
the criteria below are *in addition* to it.

### Phase 1 — Foundation

**T-01 · Bootstrap the app**
Scaffold Next.js App Router with Payload mounted in-process, Postgres
adapter configured, route groups `landing-page` and `crm` in place.
Depends on: nothing.
Done when: `npm run dev` serves a frontend page and a reachable `/admin`
login; `npm run build` passes; `.env.example` lists every variable.

**T-02 · Media storage and the Media collection**
R2 via the S3 storage adapter. `Media` collection with a **required**
`alt`, `caption`, and generated sizes (thumbnail, card, hero, og).
Depends on: T-01.
Done when: an upload from `/admin` lands in R2 and all sizes resolve over
public URLs; saving without `alt` is rejected by the admin UI.

**T-03 · Users, roles and access control**
`admin` and `editor` roles. `editor` gets read + update on `Pages`,
`Services`, `Media`; no delete, no access to `Users`.
Depends on: T-01.
Done when: an `editor` test account cannot see the Users collection and
cannot delete a page; an `admin` can do both.

**T-04 · Deploy pipeline**
Vercel project, Postgres instance, environment variables per environment,
preview deploys on PRs, migrations applied on deploy.
Depends on: T-01.
Done when: a push to `main` deploys green; `/admin` is reachable on the
deployed URL; a PR produces a working preview deployment.

**T-04A · Localization foundation**
Payload `localization` with `vi` (default) and `en`, the `/en` URL prefix,
locale resolution in the request path, and the admin UI in both languages.
Converts the Vietnamese labels and hook messages already written in T-02 and
T-03 into `{ vi, en }` form, so no further task hardcodes a user-facing
string in one language.
Depends on: T-01.
Done when: `/` serves Vietnamese and `/en` serves English; `/admin` has a
working locale switcher and its own language setting; every label and
`admin.description` in the config is a `{ vi, en }` pair and every hook
message resolves through `req.t`; `payload-types.ts` shows localized fields;
a migration exists.

> **Gate 1 — Admin login works, the deploy is green, and both locales
> resolve.**
> Do not start Phase 2 until T-01 to T-04A are merged.
>
> **T-04A is the hard gate.** Localization decides the database schema, the
> cache key, the routing and the metadata contract. Every task in Phase 2
> reads one of those. Doing it after T-06 means a migration for every
> localized field, a rewrite of every query, and re-cutting every cache tag —
> the same failure the Phase 2 before Phase 3 rule exists to prevent, one
> layer deeper.

### Phase 2 — Content and SEO

This phase is the core of the project. Everything here is built before any
visual work, so that SEO is a property of the data layer rather than
something retrofitted onto finished components. Localization (T-04A) lands
before this phase for the same reason, one layer deeper: it decides the
schema these collections are built on.

**T-05 · Globals**
`BusinessInfo` and `SiteSettings` per section 2.2, with Vietnamese labels
and `admin.description` on every non-obvious field. Opening hours as a
repeating field keyed by weekday.
Depends on: T-02.
Done when: both globals are editable in `/admin` and typed in
`payload-types.ts`.

**T-06 · Pages collection**
`Pages` with slug, blocks-based `layout`, drafts and version history.
`slug` is `readOnly` once `_status` is `published`.
Depends on: T-01.
Done when: a page can be drafted, published, edited and rolled back from
the Versions tab; a published page's slug field is not editable.

**T-07 · Services collection**
Per section 2.1, including a price field with an explicit currency unit.
Depends on: T-06 (reuses the same SEO field group shape).
Done when: services are listable and each has a unique slug.

**T-08 · SEO field group**
Install `@payloadcms/plugin-seo`, add the three custom fields, move the
whole group into its own tab, write Vietnamese labels and descriptions,
set the length limits.
Depends on: T-06, T-07.
Done when: an editor sees a live Google-style preview with a character
counter that warns past 60 and 160; the SEO tab is visually separate from
the content tab.

**T-09 · `buildMetadata()` and route wiring**
The single metadata builder, `metadataBase` in the frontend root layout,
and `generateMetadata()` on every content route delegating to it.
Fallback chain per section 2.3, plus `alternates.languages` for both locales
and `x-default`, and `openGraph.locale` matching the rendered locale.
Depends on: T-08, T-04A.
Done when: `curl` of a page shows title, description, canonical, `og:*`
with an **absolute** image URL, and `twitter:card`; a page with a blank
SEO tab still emits complete tags from fallbacks; `meta.noindex` produces
`<meta name="robots" content="noindex, nofollow">`; both locales carry
reciprocal `hreflang` links plus `x-default`, and `og:locale` is `vi_VN` on
Vietnamese routes and `en_US` on English ones.

**T-10 · Static generation and cache tags**
`src/lib/cache-tags.ts`, `generateStaticParams()` on every dynamic route,
and tagged, revalidating queries per section 1.3. Both the tag scheme and
`generateStaticParams()` are keyed by **locale and slug**, so the route
count is locales x documents.
Depends on: T-09.
Done when: `npm run build` output lists each CMS page as statically
prerendered (`○` or `●`, not `ƒ`); no tag string appears outside
`cache-tags.ts`.

**T-11 · Revalidation webhook**
`/api/revalidate` verifying `REVALIDATE_SECRET`, plus `afterChange` hooks
on `Pages`, `Services`, `BusinessInfo` and `SiteSettings` sending both the
current and previous slug, **scoped to the locale that changed** so
publishing an English edit does not discard the cached Vietnamese page.
Depends on: T-10.
Done when: publishing an edit in `/admin` changes the live page within
~10s with no build triggered; a request without the secret returns 401;
renaming a slug purges the old URL as well.

**T-12 · Draft preview**
`/api/draft` enabling `draftMode()` behind `PREVIEW_SECRET`, plus Payload
`admin.preview` config on both collections.
Depends on: T-11.
Done when: the Preview button in `/admin` renders unpublished content; the
same URL in a logged-out browser does not.

**T-13 · Sitemap and robots**
`app/sitemap.ts` and `app/robots.ts` generated from the CMS. One entry per
locale per document, each listing the other locale under `alternates`.
Exclude `noindex` and non-published documents — which is what keeps
untranslated locales out, per section 2.3. Disallow `/admin` and `/api`.
Depends on: T-10.
Done when: `/sitemap.xml` lists published, indexable routes only, with
accurate `lastModified`; a page toggled to `noindex` disappears from it
after revalidation.

**T-14 · JSON-LD**
`AutoWash` on the home page from `BusinessInfo`; `Service` + `Offer` on
service pages; `FAQPage` where an FAQ block is present. Each carries
`inLanguage` for the rendered locale; name, address and phone stay
untranslated because they must match Google Business Profile byte for byte.
Depends on: T-05, T-07, T-09.
Done when: every emitted schema passes Google's Rich Results Test with
zero errors; changing opening hours in `/admin` changes the rendered
`openingHoursSpecification`.

> **Gate 2 — `view-source:` shows complete meta tags, reciprocal `hreflang`
> and valid JSON-LD on every route type, **in both locales**.** Verify with
> `curl`, not devtools.

### Phase 3 — Interface

**T-15 · Design foundation**
Tailwind config, colour and spacing tokens, `next/font` with the
`vietnamese` subset and `display: 'swap'`, base typography.
Depends on: T-04.
Done when: no layout shift attributable to font loading; Vietnamese
diacritics render correctly at every weight used.

**T-15A · Interface message catalog**
Every string the interface renders itself — navigation, buttons, form
labels, validation messages, empty states, the 404 page — in a typed
catalog with a `vi` and an `en` entry, resolved on the server. No
client-side i18n runtime: strings must be in the server-rendered HTML,
because Zalo and Coc Coc do not execute JavaScript.
Depends on: T-04A, T-15.
Done when: `grep` finds no user-facing literal in any component; a missing
key fails `npm run typecheck` rather than rendering a blank or a key name;
switching locale changes every interface string on the page, not only the
CMS content.

**T-16 · Layout shell**
Header with navigation, footer rendering name, address, phone, Zalo and
opening hours from `BusinessInfo`. Mobile navigation.
Depends on: T-05, T-15, T-15A.
Done when: no business detail and no interface string is hardcoded anywhere
in the shell; the locale switcher is a plain link per locale, not a client
component;
`'use client'` appears only on the mobile menu toggle.

**T-17 · Content blocks**
`Hero`, `Steps` (the QR-scan-to-wash sequence), `Pricing`, `Faq`, `Cta` —
each a Payload block and a matching Server Component.
Depends on: T-06, T-15, T-15A.
Done when: an editor can compose a page from blocks in any order and the
frontend renders it; the `Faq` block feeds T-14's `FAQPage` schema.

**T-18 · Service detail template**
`/dich-vu/<slug>` rendering price, duration, what the package includes,
and a CTA.
Depends on: T-07, T-17.
Done when: the page is statically generated and emits `Service` + `Offer`
schema with the price from the CMS.

**T-19 · Contact page**
Contact form (React Hook Form + Zod, validated on both sides), lazily
loaded Google Maps embed, and call / directions buttons above the fold —
both firing GA4 events.
Depends on: T-05, T-17, T-15A.
Done when: the map iframe is `loading="lazy"` and does not affect LCP;
validation messages come from the catalog in the visitor's locale;
call and directions clicks appear in GA4 DebugView.

**T-20 · Performance pass**
Audit every image through `next/image`, `priority` on each hero, verify
no client component sits above the fold, trim unused CSS and JS.
Depends on: T-16, T-17, T-18, T-19.
Done when: mobile Lighthouse performance and SEO are both 90 or above on
the home page, a service page and the contact page.

> **Gate 3 — Mobile Lighthouse at 90 or above.**

### Phase 4 — Launch

**T-21 · Analytics and Search Console**
GA4 with the measurement ID from `SiteSettings`, custom events for call
and directions, Search Console verified, sitemap submitted.
Depends on: T-13, T-19.
Done when: Search Console accepts the sitemap and reports no fetch errors;
both custom events are visible in GA4.

**T-22 · Admin hardening**
Rate limit the login route, enable 2FA for `admin` accounts, confirm
`/admin` and `/api` are disallowed in robots, schedule daily Postgres
backups.
Depends on: T-03, T-13.
Done when: repeated failed logins are throttled; a restore from backup has
been tested at least once.

**T-23 · Content seed**
Create the five routes from section 3 with real copy, real images, and a
filled SEO tab carrying the correct `keywordFocus` — **in both locales**.
English copy is written, not translated; any route whose English SEO tab is
empty stays `noindex` and out of the sitemap rather than shipping
machine-translated filler.
Depends on: T-17, T-18, T-19.
Done when: no two pages share a `keywordFocus`; every image has a
meaningful Vietnamese `alt`; no placeholder text remains.

**T-24 · Handover**
A short Vietnamese guide for editors (publish flow, preview, rollback,
what each SEO field does, **how the locale switcher works and what happens
to an untranslated page**) plus a checklist for keeping Google Business
Profile in sync with `BusinessInfo`.
Depends on: T-12, T-23.
Done when: a non-technical person publishes a content change end to end
without developer help.

> **Gate 4 — Search Console has indexed the home page and at least one
> service page, and an editor has published a change unaided.**

---

## 5. Ordering

The critical path runs:

```
T-01 → T-04A → T-06 → T-08 → T-09 → T-10 → T-11 → T-14 → T-17 → T-20 → T-23
```

T-04A sits on the critical path because everything downstream of it reads a
decision it makes: the schema (localized fields), the cache key (locale in
the tag), the routing (`/en` prefix) and the metadata contract (`hreflang`).

Everything else can run alongside it. Work that parallelises cleanly:

- T-02, T-03 and T-04 after T-01, by different agents.
- T-15 can start as soon as T-04 lands; it touches no content.
- T-15A needs only T-04A and T-15, so it can run alongside Phase 2.
- T-16 can start as soon as T-05 and T-15A land — it does not wait for
  Phase 2 to finish.
- T-13 only needs T-10, so it can run while T-11 and T-12 are in progress.
- T-22 is independent of all UI work.

What must not be reordered:

**T-04A before Phase 2.** Localization is a schema and routing decision.
Retrofitting it means a migration for every localized field, a rewrite of
every query, and re-cutting every cache tag — after the collections,
metadata and sitemap have all been built against single-locale assumptions.

**Phase 2 before Phase 3.** Building components first and adding
`generateMetadata` afterwards means prising metadata out of finished
components and treating JSON-LD as something pasted on at the end.

**T-15A before T-16 and T-17.** The catalog has to exist before the first
component that renders a string, or every component ships a Vietnamese
literal that someone then has to find and extract. The two rules are the
same rule: put the contract in place before the code that depends on it.

---

## 5a. Known cost of this design

Two consequences worth stating before anyone starts T-04A, rather than
discovering them inside it.

**The locale prefix cannot be a plain folder.** Route folders under
`src/app` are plain words and the public URLs come from rewrites in
`next.config.mjs` (`AGENT.md` section 4). `/en/:path*` is one more rewrite
in that table, carrying the locale the same way `__p` already carries path
depth. Every route added from here needs its rule in both locales.

**Static rendering is settled: the locale is a build-time constant.**
Resolving it per request — from a header or from `searchParams` — makes every
page `ƒ`, which breaks AGENT.md 5.1. So each locale has its own plain-word
folder whose layout carries its `lang` literally, and both are prerendered
(`src/lib/locales.ts`, `FOLDER_FOR`). The cost is one thin folder per locale
per route, re-exporting a shared implementation.

**Slug-level static generation is still open.** `generateStaticParams()`
cannot prerender per slug behind a literal folder name, so T-10's criterion —
each CMS page listed as prerendered, not `ƒ` — remains at risk for content
routes specifically. **Decide before T-09**: accept `ƒ` with the tag cache in
front, or reintroduce a dynamic segment for content routes only.

---

## 6. Out of scope

Online booking, payments, customer accounts and PLC integration are a
separate backend. This site links to it; it does not host it.

Vietnamese and English are **in scope** (T-04A, T-15A). Further locales are
not, though the shape of T-04A is what makes adding one cheap.

Hooks already in place for later, requiring no architectural change:

| Extension | Where it attaches |
| --- | --- |
| Blog or articles | A `Posts` collection reusing the same SEO group and `buildMetadata()` |
| Multiple locations | `BusinessInfo` becomes a `Locations` collection; add `/chi-nhanh/<slug>`, one `LocalBusiness` each |
| Mobile app deep links | `AppLinks` and universal links in metadata; CTA target from `SiteSettings` |
| A third locale | `localization.locales` plus one more entry in the message catalog and the `/xx` rewrite; the schema already supports it |
