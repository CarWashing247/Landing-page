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
  `dich-vu/[slug]/page.tsx`, each delegating.
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
src/components/seo/metadata.ts
src/components/seo/metadata.test.ts
src/app/landing-page/layout.tsx
src/app/landing-page/page.tsx
src/app/landing-page/[slug]/page.tsx
src/app/landing-page/dich-vu/[slug]/page.tsx
src/app/landing-page/opengraph-image.tsx
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
  nowhere else.
- Resist adding per-route tweaks inline "just this once". Every exception
  becomes the next page's precedent.

## Flags

- None expected. If `NEXT_PUBLIC_SITE_URL` is still a `.vercel.app` URL
  from T-04, note that canonicals will need revisiting at T-21.
