# AGENT.md

Instructions for any AI coding agent working in this repository.
This is the single source of truth. `CLAUDE.md` points here.

---

## 1. What this project is

**AutoWash247 landing page** — a marketing site for an automated car-wash
service in Hanoi, Vietnam.

Two goals drive every decision in this repo:

1. **Search engines and social crawlers must get complete HTML on the first
   request.** Googlebot, Facebook, Zalo and Coc Coc all read this site.
   Zalo and Coc Coc do not execute JavaScript.
2. **Non-technical staff must be able to edit SEO metadata without a
   developer and without a deploy.**

If a change you are about to make conflicts with either goal, stop and raise
it instead of working around it.

**Content language is Vietnamese.** Code, comments, commit messages,
identifiers and documentation are English. Never machine-translate
user-facing Vietnamese copy — leave a `TODO(copy)` marker instead.

---

## 2. Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router) |
| CMS | Payload CMS, mounted inside the same Next.js app |
| SEO fields | `@payloadcms/plugin-seo` |
| Database | PostgreSQL via `@payloadcms/db-postgres` |
| Media | Cloudflare R2 (S3-compatible) via `@payloadcms/storage-s3` |
| Styling | Tailwind CSS |
| Forms | React Hook Form + Zod |
| Hosting | Vercel |
| Language | TypeScript, `strict: true` |

One repo, one deploy, one domain. The CMS is **not** a separate service.

---

## 3. Commands

```bash
npm install
npm run dev                   # Next.js + Payload admin on :3000
npm run build                 # production build; must pass before any PR
npm run lint                  # eslint, zero warnings allowed
npm run typecheck             # tsc --noEmit
npx payload generate:types    # REQUIRED after any collection/global change
npx payload migrate:create    # REQUIRED after any schema change
npx payload migrate           # apply migrations locally
npm test                      # vitest
npm run test:e2e              # playwright
```

`npx payload generate:types` writes `src/payload-types.ts`. That file is
generated — never hand-edit it, and always commit it alongside the config
change that produced it.

---

## 4. Repository layout

```
src/
  app/
    landing-page/
      layout.tsx            # <html lang="vi">, metadataBase, Organization JSON-LD
      page.tsx              # home
      [slug]/page.tsx       # CMS pages
      dich-vu/[slug]/page.tsx
      sitemap.ts
      robots.ts
      opengraph-image.tsx
    crm/
      layout.tsx            # Payload admin shell; does NOT import globals.css
      admin/segements/page.tsx
      admin/adminParams.ts  # decodes path depth from the rewrite
      admin/importMap.js    # GENERATED
      api/slug/route.ts
    global-not-found.tsx    # 404 for unmatched URLs; there is no single root layout
    api/
      revalidate/route.ts   # webhook target for Payload afterChange hooks
      draft/route.ts        # enables draftMode() for CMS preview
  collections/
    Pages.ts  Services.ts  Media.ts  Users.ts
  globals/
    BusinessInfo.ts  SiteSettings.ts
  components/
    seo/metadata.ts         # buildMetadata() — the ONLY place metadata is built
    seo/JsonLd.tsx
    blocks/                 # Hero, Pricing, Steps, Faq, Cta
    ui/
  lib/
    payload.ts  cache-tags.ts
  payload.config.ts
  payload-types.ts          # GENERATED
```

`landing-page` and `crm` are plain folders, so Next.js would normally put them
in the URL. The rewrites in `next.config.mjs` map the public paths (`/`,
`/admin/**`, `/api/**`) onto them, and redirects send the internal paths back
out so no page is reachable at two URLs.

Path depth cannot be expressed by a plain folder name: the admin reads it from
the `__p` query parameter the rewrite adds, and the REST API reads it from the
request path. Both live in `src/app/crm/admin/adminParams.ts`.

**Renaming or moving anything under `src/app/` means changing
`next.config.mjs` in the same commit.** The filesystem no longer determines
the URLs.

---

## 5. Non-negotiable rules

Violating any of these silently breaks the two project goals. They are not
style preferences.

### 5.1 Rendering

- Every public page is statically generated. Any dynamic route **must**
  export `generateStaticParams()` returning slugs from the CMS.
- Do not add `export const dynamic = 'force-dynamic'` to a public page.
- Do not fetch page content in a client component or in `useEffect`.
  Content must be in the server-rendered HTML.
- `'use client'` is allowed only for genuine interactivity (menu toggle,
  form state, carousel). Keep it at the leaves of the tree.

### 5.2 Metadata

- Every route with content exports `generateMetadata()`.
- `generateMetadata()` **always** delegates to `buildMetadata()` in
  `src/components/seo/metadata.ts`. Never assemble a `Metadata` object
  inline in a page file.
- `metadataBase` is declared once, in the frontend root layout. Without it,
  Open Graph image URLs are relative and Facebook/Zalo silently fail to
  pull the image.
- Exactly one `<h1>` per page.
- `openGraph.locale` is `vi_VN`.

### 5.3 Caching and revalidation

- Every Payload query that feeds a page passes `next: { tags: [...],
  revalidate: 3600 }`. Tag strings come from `src/lib/cache-tags.ts` —
  never inline a tag literal.
- The `revalidate: 3600` floor is a safety net for a failed webhook.
  Do not remove it.
- `afterChange` hooks send both `doc.slug` and `previousDoc?.slug` so a
  renamed page purges its old URL too.
- `/api/revalidate` verifies `REVALIDATE_SECRET` before doing anything and
  returns 401 otherwise.

### 5.4 Structured data

- JSON-LD is built from the `BusinessInfo` global, never from hardcoded
  values. Name, address and phone must be byte-identical to what is in
  Google Business Profile.
- Home page emits `AutoWash`. Service pages add `Service` + `Offer`.
  Pages with an FAQ block add `FAQPage`.
- After changing any JSON-LD shape, validate against Google's Rich Results
  Test before considering the task done.

### 5.5 Images and performance

- All images go through `next/image`. No bare `<img>`.
- The hero image on each page gets `priority`; everything below the fold
  is lazy.
- `alt` is a required field on the `Media` collection. Do not make it
  optional "for now".
- Fonts load through `next/font` with `display: 'swap'` and the
  `vietnamese` subset.
- Target: mobile Lighthouse performance and SEO both at 90 or above.
  Check before marking a UI task done.

### 5.6 CMS authoring experience

- Every field has a Vietnamese `label` and, where the purpose is not
  obvious, a Vietnamese `admin.description`. The audience cannot read
  `canonical` and infer what it does.
- SEO fields live in their own tab, separate from the content tab.
- Prefer a guardrail in the config over a line in a handover document:
  `required`, `maxLength`, `readOnly`, `admin.condition`, access control.
- `editor` role has read and update on `Pages`, `Services` and `Media`.
  No delete, no user management.
- `slug` becomes `readOnly` once `_status` is `published`. Changing a
  published slug breaks indexed URLs.

---

## 6. Conventions

- TypeScript strict. No `any`. Use generated types from `payload-types.ts`.
- Named exports except for Next.js files that require a default export
  (pages, layouts, route handlers).
- Server Components by default.
- Tailwind utility classes only. No `@apply` beyond `globals.css`, no
  runtime CSS-in-JS.
- Slugs are unaccented lowercase Vietnamese with hyphens: `bang-gia`,
  `dich-vu/rua-xe-nhanh`.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`.
- Secrets come from environment variables. Never commit `.env`.

---

## 7. Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URI` | Postgres connection string |
| `PAYLOAD_SECRET` | Signs admin session JWTs |
| `NEXT_PUBLIC_SITE_URL` | `metadataBase`, canonical URLs, sitemap |
| `REVALIDATE_SECRET` | Shared secret for the revalidate webhook |
| `PREVIEW_SECRET` | Shared secret for the draft preview route |
| `R2_BUCKET` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ENDPOINT` | Media storage |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | Optional: a local admin account for the login specs in `e2e/` |

Add any new variable to `.env.example` in the same commit.

---

## 8. Definition of done

A task is complete when all of these hold:

- [ ] `npm run lint`, `npm run typecheck` and `npm run build` pass
- [ ] `npx payload generate:types` run and `payload-types.ts` committed,
      if the Payload config changed
- [ ] A migration exists, if the schema changed
- [ ] Page source (`view-source:`, not devtools) shows the expected
      `<title>`, `<meta name="description">`, `og:*` tags and JSON-LD
- [ ] The new or changed page appears in `/sitemap.xml`, unless it is
      `noindex` or draft
- [ ] No new `'use client'` above a leaf component
- [ ] `.env.example` updated, if a variable was added

---

## 9. Do not

- Do not install a second CMS, headless UI kit or state manager.
- Do not add a UI library that ships its own CSS reset.
- Do not use `localStorage` or `sessionStorage` for anything that affects
  rendered content.
- Do not hardcode business details (address, phone, opening hours, prices)
  anywhere in components — they belong in `BusinessInfo` or `Services`.
- Do not add a `keywords` meta tag. Search engines ignore it.
- Do not build booking, payment, customer accounts or PLC integration in
  this repo. That is a separate backend; this site links out to it.
- Do not add tracking scripts beyond GA4 without raising it first — each
  one costs LCP.
