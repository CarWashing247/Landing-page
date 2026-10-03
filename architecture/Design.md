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
| `page:<slug>` | One CMS page | That page is published |
| `service:<slug>` | One service page | That service is published |
| `sitemap` | `sitemap.xml` | Any page or service is published |
| `globals` | Header, footer, JSON-LD | `BusinessInfo` or `SiteSettings` changes |

A `globals` purge is site-wide and therefore expensive. It is correct and
rare — opening hours do not change weekly.

---

## 2. Data model

### 2.1 Collections

| Collection | Key fields |
| --- | --- |
| `Pages` | `title`, `slug`, `layout` (blocks), `meta` (SEO tab), `_status` |
| `Services` | `name`, `slug`, `price`, `durationMinutes`, `includes[]`, `image`, `meta`, `_status` |
| `Media` | `alt` (**required**), `caption`, generated sizes |
| `Users` | `email`, `role` (`admin` \| `editor`) |

`Pages` and `Services` both enable `versions: { drafts: true }`.

### 2.2 Globals

| Global | Holds |
| --- | --- |
| `BusinessInfo` | Legal name, street address, locality, lat/lng, phone, Zalo, opening hours per weekday, price range |
| `SiteSettings` | Brand name, default meta title suffix, default description, OG fallback image, favicon, GA4 measurement ID, social links |

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

---

## 3. Keyword map

One page per keyword cluster. Two pages chasing the same term compete with
each other and Google picks one — usually not the one intended.

| Route | Primary cluster | Search intent |
| --- | --- | --- |
| `/` | rửa xe tự động + area name | Finding a location, wants to know where and what |
| `/bang-gia` | giá rửa xe tự động | Comparing prices, close to deciding |
| `/dich-vu/<slug>` | the specific wash package name | Knows what they want, looking for that service |
| `/huong-dan` | rửa xe tự động có xước sơn không | Sceptical, needs reassurance |
| `/lien-he` | rửa xe tự động gần đây | About to drive over, needs address and directions |

Store each page's cluster in `meta.keywordFocus`. It is never rendered —
the `keywords` meta tag is ignored by search engines — but it stops two
editors from writing two pages against the same term.

Placement that matters: `<h1>`, the front of `meta.title`, the opening
paragraph, the hero image `alt`, and the slug. Beyond that, repetition
does not help ranking and makes the copy read like it was generated.

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

> **Gate 1 — Admin login works and the deploy is green.**
> Do not start Phase 2 until T-01 to T-04 are merged.

### Phase 2 — Content and SEO

This phase is the core of the project. Everything here is built before any
visual work, so that SEO is a property of the data layer rather than
something retrofitted onto finished components.

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
Fallback chain per section 2.3.
Depends on: T-08.
Done when: `curl` of a page shows title, description, canonical, `og:*`
with an **absolute** image URL, and `twitter:card`; a page with a blank
SEO tab still emits complete tags from fallbacks; `meta.noindex` produces
`<meta name="robots" content="noindex, nofollow">`.

**T-10 · Static generation and cache tags**
`src/lib/cache-tags.ts`, `generateStaticParams()` on every dynamic route,
and `next: { tags, revalidate: 3600 }` on every content query.
Depends on: T-09.
Done when: `npm run build` output lists each CMS page as statically
prerendered (`○` or `●`, not `ƒ`); no tag string appears outside
`cache-tags.ts`.

**T-11 · Revalidation webhook**
`/api/revalidate` verifying `REVALIDATE_SECRET`, plus `afterChange` hooks
on `Pages`, `Services`, `BusinessInfo` and `SiteSettings` sending both the
current and previous slug.
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
`app/sitemap.ts` and `app/robots.ts` generated from the CMS. Exclude
`noindex` and non-published documents. Disallow `/admin` and `/api`.
Depends on: T-10.
Done when: `/sitemap.xml` lists published, indexable routes only, with
accurate `lastModified`; a page toggled to `noindex` disappears from it
after revalidation.

**T-14 · JSON-LD**
`AutoWash` on the home page from `BusinessInfo`; `Service` + `Offer` on
service pages; `FAQPage` where an FAQ block is present.
Depends on: T-05, T-07, T-09.
Done when: every emitted schema passes Google's Rich Results Test with
zero errors; changing opening hours in `/admin` changes the rendered
`openingHoursSpecification`.

> **Gate 2 — `view-source:` shows complete meta tags and valid JSON-LD on
> every route type.** Verify with `curl`, not devtools.

### Phase 3 — Interface

**T-15 · Design foundation**
Tailwind config, colour and spacing tokens, `next/font` with the
`vietnamese` subset and `display: 'swap'`, base typography.
Depends on: T-04.
Done when: no layout shift attributable to font loading; Vietnamese
diacritics render correctly at every weight used.

**T-16 · Layout shell**
Header with navigation, footer rendering name, address, phone, Zalo and
opening hours from `BusinessInfo`. Mobile navigation.
Depends on: T-05, T-15.
Done when: no business detail is hardcoded anywhere in the shell;
`'use client'` appears only on the mobile menu toggle.

**T-17 · Content blocks**
`Hero`, `Steps` (the QR-scan-to-wash sequence), `Pricing`, `Faq`, `Cta` —
each a Payload block and a matching Server Component.
Depends on: T-06, T-15.
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
Depends on: T-05, T-17.
Done when: the map iframe is `loading="lazy"` and does not affect LCP;
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
filled SEO tab carrying the correct `keywordFocus`.
Depends on: T-17, T-18, T-19.
Done when: no two pages share a `keywordFocus`; every image has a
meaningful Vietnamese `alt`; no placeholder text remains.

**T-24 · Handover**
A short Vietnamese guide for editors (publish flow, preview, rollback,
what each SEO field does) plus a checklist for keeping Google Business
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
T-01 → T-06 → T-08 → T-09 → T-10 → T-11 → T-14 → T-17 → T-20 → T-23
```

Everything else can run alongside it. Work that parallelises cleanly:

- T-02, T-03 and T-04 after T-01, by different agents.
- T-15 and T-16 can start as soon as T-05 lands — they do not wait for
  Phase 2 to finish.
- T-13 only needs T-10, so it can run while T-11 and T-12 are in progress.
- T-22 is independent of all UI work.

What must not be reordered: **Phase 2 before Phase 3.** Building components
first and adding `generateMetadata` afterwards means prising metadata out
of finished components and treating JSON-LD as something pasted on at the
end. That is the failure this ordering exists to prevent.

---

## 6. Out of scope

Online booking, payments, customer accounts and PLC integration are a
separate backend. This site links to it; it does not host it.

Hooks already in place for later, requiring no architectural change:

| Extension | Where it attaches |
| --- | --- |
| Blog or articles | A `Posts` collection reusing the same SEO group and `buildMetadata()` |
| Multiple locations | `BusinessInfo` becomes a `Locations` collection; add `/chi-nhanh/<slug>`, one `LocalBusiness` each |
| Mobile app deep links | `AppLinks` and universal links in metadata; CTA target from `SiteSettings` |
| Vietnamese / English | Payload localization plus a `[locale]` segment and `hreflang` |
