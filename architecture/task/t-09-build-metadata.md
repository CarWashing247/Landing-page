# T-09 · `buildMetadata()` and route wiring

| | |
| --- | --- |
| Phase | 2 — Content and SEO |
| Branch | `t-09-build-metadata` |
| Depends on | T-08 |
| Blocks | T-10, T-14 |
| Critical path | **yes** |

## Goal

One function builds every `Metadata` object in this repo. Every content
route delegates to it. A page whose editor skipped the SEO tab entirely
still ships complete tags, because the fallback chain lives in code rather
than in the editor's memory.

## Scope

**In scope**

- `src/components/seo/metadata.ts` exporting `buildMetadata()` — the
  **only** place a `Metadata` object is assembled (AGENT.md 5.2).
- `metadataBase` declared once, in `landing-page/layout.tsx`, from
  `NEXT_PUBLIC_SITE_URL`.
- `generateMetadata()` on `landing-page/page.tsx`, `[slug]/page.tsx` and
  `dich-vu/[slug]/page.tsx`, each delegating — **and the English mirror of each**,
  which the file list below originally omitted. Two locale folders means eight
  route files, not four.
- **Creating those `[slug]` routes at all**, plus the rewrite and redirect rules
  that reach them. They did not exist before this task, and the acceptance
  criteria below cannot be checked without them.
- Fallback chain (Design.md 2.3):
  - blank `meta.title` → `${title} | ${brandName}` (via
    `SiteSettings.titleSuffix`)
  - blank `meta.description` → `SiteSettings.defaultDescription`
  - blank `meta.image` → `SiteSettings.ogFallback`
  - blank `meta.canonical` → `${metadataBase}${route}`
- `openGraph.locale: 'vi_VN'`, `openGraph.type`, `twitter.card:
  'summary_large_image'`.
- `meta.noindex` → `robots: { index: false, follow: false }`.
- `app/opengraph-image.tsx` as the last-resort OG image if even
  `ogFallback` is unset.

**Out of scope**

- Cache tags on the queries this task adds (T-10) — but write the queries
  so T-10 only has to add the `next` option, not restructure them.
- JSON-LD (T-14). `buildMetadata()` returns `Metadata`; JSON-LD is a
  separate component.

## Steps

1. Write `buildMetadata()` taking `{ doc, route, type }` and returning
   `Metadata`. Fetch `SiteSettings` inside it, or accept it as an argument —
   prefer the argument so the function stays pure and testable, and fetch
   once per request in the caller.
2. Declare `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!)` in
   the frontend root layout. Throw at module load if the variable is
   missing — a silently relative OG URL is worse than a failed build.
3. Wire `generateMetadata()` into each content route.
4. Ensure exactly one `<h1>` per page in the placeholder markup; real
   markup is Phase 3 but the rule starts here.
5. Add unit tests for the fallback chain: all fields set, all fields blank,
   each field blank individually, `noindex` set.
6. Add `app/opengraph-image.tsx`.

## Files

```
src/components/seo/metadata.ts        # buildMetadata(), rootMetadata(), notFoundMetadata()
src/components/seo/metadata.test.ts
src/components/seo/OpenGraphImage.tsx # the generated last-resort image
src/components/ContentPage.tsx        # page body + its metadata helper, both locales
src/components/ServicePage.tsx
src/components/HomePage.tsx           # gains homeMetadata()
src/lib/content.ts                    # the query layer; T-10 attaches tags here
src/lib/locales.ts                    # SERVICE_SEGMENT and the pathFor* helpers
next.config.mjs                       # catch-all rewrite + the matching redirects
src/app/landing-page/{layout,page,opengraph-image}.tsx
src/app/landing-page/[slug]/page.tsx
src/app/landing-page/dich-vu/[slug]/page.tsx
src/app/landing-page-en/{layout,page,opengraph-image}.tsx
src/app/landing-page-en/[slug]/page.tsx
src/app/landing-page-en/services/[slug]/page.tsx
src/app/global-not-found.tsx          # its inline Metadata moved into the builder
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] `curl` of a page shows `<title>`, `<meta name="description">`,
      `<link rel="canonical">`, `og:title`, `og:description`,
      `og:image`, `og:locale` = `vi_VN`, and `twitter:card`.
- [ ] `og:image` is an **absolute** URL. A relative one means
      `metadataBase` is missing and Facebook/Zalo will silently fail.
- [ ] A page with a completely blank SEO tab still emits complete tags from
      fallbacks.
- [ ] `meta.noindex` produces
      `<meta name="robots" content="noindex, nofollow">`.
- [ ] `meta.canonical` set by the editor wins over the generated one.
- [ ] No `Metadata` object is assembled anywhere but `metadata.ts`.
- [ ] No `keywords` meta tag anywhere (AGENT.md section 9).

## Verification

```bash
npm run build && npm run start &
for p in / /bang-gia /dich-vu/<slug>; do
  echo "== $p"
  curl -s "localhost:3000$p" | grep -iE '<title|name="description"|rel="canonical"|og:|twitter:|name="robots"'
done
# absolute OG image
curl -s localhost:3000/ | grep -o 'property="og:image" content="[^"]*"'
# nothing assembles Metadata outside the builder
grep -rn "Metadata" src/app | grep -v "import type" | grep -v buildMetadata
grep -rn 'name="keywords"' src || echo 'no keywords tag'
```

Read `curl` output, not devtools. Devtools shows the post-hydration DOM,
which is not what Zalo or Coc Coc sees.

## Notes

- `metadataBase` is the single most common cause of broken social previews
  in this stack. It is declared once, in the frontend root layout, and
  nowhere else. With two locale folders there are two root layouts, so both
  get it from `rootMetadata()` rather than writing it twice.
- Resist adding per-route tweaks inline "just this once". Every exception
  becomes the next page's precedent.
- **Three behaviours shaped this task and none is visible from the config.**
  - **`opengraph-image.tsx` does not cascade to nested route segments.**
    Measured on a running server: `/` and `/en` carried an `og:image` from the
    file in their own segment; `/bang-gia` and `/en/pricing` carried none at
    all. Every CMS page would have shipped with no share image until someone
    uploaded an `ogFallback` — the exact gap that file was added to close. So
    `buildMetadata()` names the generated route by URL instead of relying on
    the convention, and uses the public spelling (`/opengraph-image`,
    `/en/opengraph-image`) rather than the internal folder Next would put in
    the tag.
  - **Payload's locale fallback makes a blank `canonical` actively wrong.**
    `localization.fallback: true` means an English page that leaves the field
    blank — which its own help text tells the editor to do — inherits the
    Vietnamese page's canonical and tells Google the two are one page.
    Reproduced before fixing: `/en/contact` emitted a canonical pointing at the
    Vietnamese URL with `noindex` already released, so nothing said so. `slug`
    has the same problem and breaks `hreflang` the same way. Both are read in
    `src/lib/content.ts` with `locale: 'all'`, which is the only way to tell
    "this locale has no value" from "its value equals the default's".
  - **Next's `metadata` export is read only from a route module.** The one
    `LocaleLayout.tsx` carried had never emitted anything, because that file is
    a component, not an `app/**` layout.
- The `og` image size is 1200x630 by construction (`fit: 'cover'`,
  `withoutEnlargement: false` in `Media.ts`), so those dimensions are stated for
  it. The *original* upload is whatever was uploaded, so its real `width` and
  `height` are read from the `Media` record rather than assumed — Facebook sizes
  the card from what it is told.

## Flags

- If `NEXT_PUBLIC_SITE_URL` is still a `.vercel.app` URL from T-04, canonicals
  will need revisiting at T-21.
- **`/` is not CMS-backed, and T-09 does not decide that it should be.** T-23
  lists `/` among the documents to create, but nothing in Design.md says which
  slug the home document carries, and inventing one would commit two later tasks
  to it — the `[slug]` route would have to refuse that slug so `/` and
  `/trang-chu` are not one page at two URLs, and the sitemap would have to
  special-case it. So the home route reads `SiteSettings` alone, which is
  exactly the "blank SEO tab still ships complete tags" path. **T-17 owns the
  decision**, since it builds the home body. Consequence today: the home
  `<title>` is the brand name with no suffix appended, because
  `AutoWash247 | AutoWash247` reads like a bug.
- **The service path segment is localized** — `/dich-vu/<slug>` against
  `/en/services/<slug>` (Design.md 1.1a and section 3, which say so twice).
  AGENT.md section 4's layout sketch showed `dich-vu/[slug]` under both locale
  folders; the sketch was the loose one and has been corrected.
- **The 404 page renders an empty body for an unknown slug, and T-09 caused
  it.** Before this task the public paths matched no route, so
  `app/global-not-found.tsx` rendered with `lang="vi"`. T-09's catch-all rewrite
  means every URL now matches a route, so an unknown slug reaches
  `[slug]/page.tsx` and `notFound()` instead. Measured: 404 with
  `<meta name="robots" content="noindex">` — so the status and the indexing are
  correct — but `<html id="__next_error__">` with no `lang` and **no visible
  body**.

  Not fixed here, and not for want of trying. Adding `not-found.tsx` under each
  locale folder does nothing while `experimental.globalNotFound` is enabled
  (Next never builds the file). Turning that flag off makes the component render
  into the RSC payload but the SSR shell stays `__next_error__` with the same
  empty body — the flag exists because this app has two root layouts, which is
  exactly the case Next's docs give for it. Fixing it properly is a 404
  architecture decision, not a metadata one, so it is left out of T-09 rather
  than half-done. **The 404 copy is still `TODO(copy)` either way**, so nothing
  user-visible regressed in wording — only the shell.
- The `admin.description` helper text added in T-08 and the placeholder bodies
  here still carry `TODO(copy)`. Nothing in this task writes user-facing prose
  beyond those placeholders.
