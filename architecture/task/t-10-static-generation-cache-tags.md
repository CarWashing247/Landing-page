# T-10 · Static generation and cache tags

| | |
| --- | --- |
| Phase | 2 — Content and SEO |
| Branch | `t-10-static-generation-cache-tags` |
| Depends on | T-09 |
| Blocks | T-11, T-13 |
| Critical path | **yes** |

## Goal

Every public page is statically generated, and every query that feeds one
is tagged so T-11 has something to purge. This is project goal 1: complete
HTML on the first request, with zero JavaScript required.

## Scope

**In scope**

- `src/lib/cache-tags.ts` defining the scheme from Design.md 1.3:

| Tag | Covers |
| --- | --- |
| `page:<locale>:<slug>` | one CMS page in one locale |
| `service:<locale>:<slug>` | one service page in one locale |
| `sitemap` | `sitemap.xml`, all locales |
| `globals` | header, footer, JSON-LD |

  Exported as functions (`pageTag(locale, slug)`, `serviceTag(locale, slug)`)
  plus the two constants, so no caller builds a tag string by hand.

  **This table originally omitted the locale** and gave the functions one
  argument. Design.md 1.3 and AGENT.md 5.3 both specify
  `page:<locale>:<slug>`, and AGENT.md 5.3 states the reason — publishing an
  English edit must not purge the cached Vietnamese page. Those two are the
  binding pair, so the locale is in and this table has been corrected.
- `generateStaticParams()` on `[slug]/page.tsx` and
  `dich-vu/[slug]/page.tsx`, returning published slugs from the CMS.
  **Four route files, not two**: each locale has its own folder, and the
  English service segment is `services/[slug]` (Design.md 1.1a). T-09 created
  all four; each one's slugs come from its own locale, so the route count is
  locales x documents as section 4 says.
- A tag and a `revalidate` floor on **every** Payload query that feeds a page.
  **Not `next: { tags, revalidate }`** — that is a `fetch` extension, and
  Payload's Local API talks to Postgres through a driver, so there is no
  `fetch` to annotate. The equivalent for a database query is
  `unstable_cache(fn, keyParts, { tags, revalidate })`, which Next's own
  caching guide presents for exactly this case.
- `notFound()` for a slug that is not a published document.

**Out of scope**

- The webhook that purges these tags (T-11).
- `sitemap.ts` itself (T-13) — but define the `sitemap` tag here so T-13
  only consumes it.

## Steps

1. Write `src/lib/cache-tags.ts`. Keep it dependency-free.
2. The thin query layer already exists: **`src/lib/content.ts`**, added by
   T-09 for this purpose. Every public page reads through it, so attaching
   tags there is an added option rather than a restructuring. Note it does two
   reads per document — the rendered locale, and a `locale: 'all'` read for the
   slug and canonical that must not be fallback-resolved — and both need tags.
3. Add `generateStaticParams()` to both dynamic routes, filtering to
   `_status: 'published'`.
4. Attach tags and `revalidate: 3600` to every query. The floor is a safety
   net for a failed webhook — do not remove it (AGENT.md 5.3).
5. Confirm no route exports `dynamic = 'force-dynamic'`.
6. Run the build and read the route table.

## Files

```
src/lib/cache-tags.ts
src/lib/payload.ts
src/app/landing-page/page.tsx
src/app/landing-page/[slug]/page.tsx
src/app/landing-page/dich-vu/[slug]/page.tsx
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] `npm run build` output lists each CMS page as statically prerendered
      (`○` or `●`), **not** `ƒ`.
- [ ] No tag string appears anywhere outside `cache-tags.ts`.
- [ ] Every content query carries both `tags` and `revalidate: 3600`.
- [ ] No public route exports `dynamic = 'force-dynamic'`.
- [ ] An unknown slug returns 404, not a blank page.
- [ ] Draft documents do not appear in `generateStaticParams()`.

## Verification

```bash
npm run build | sed -n '/Route (app)/,/^$/p'          # expect ○/● on page routes
# Test files are excluded: src/lib/log.test.ts carries 'page:vi:bang-gia' as
# sample data for the log format in AGENT.md 5.8, not as a tag for a query.
grep -rn "'page:\|\"page:\|'service:\|\"service:\|'sitemap'\|'globals'" src --include=*.ts --include=*.tsx \
  | grep -v src/lib/cache-tags.ts | grep -v '\.test\.ts' || echo 'no inline tag literals'
grep -rn "force-dynamic" src || echo 'no force-dynamic'
grep -rn "revalidate" src/lib src/app | grep -c 3600
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/khong-ton-tai     # expect 404
```

## Notes

- A `ƒ` in the build output means that route renders per request. For this
  project that is a defect, not a performance detail: it is the difference
  between a crawler getting HTML from the edge and getting whatever the
  origin manages under load.
- A `globals` purge is site-wide and therefore expensive. That is correct
  and rare — opening hours do not change weekly.
- **`dynamicParams` stays at its default of `true`.** `generateStaticParams()`
  prerenders what exists at build time; a page published afterwards must still
  be reachable without a deploy, which is project goal 2. Verified: a page
  created after the build served 200 on first request. Setting it to `false`
  would make every new page a 404 until someone redeploys.
- **A miss is cached under the same tag as a hit**, because the tag is derived
  from the requested slug rather than from the document. That is what makes
  publishing a draft take effect through T-11's webhook: the negative entry for
  `page:vi:ban-nhap` is purged by the same call that would purge a real one.
  Confirmed by reading `.next/cache/fetch-cache` — entries exist for slugs that
  resolved to nothing. The cost is that a typo'd URL occupies an entry for an
  hour, which the revalidate floor bounds.
- **Two cache layers, doing different jobs.** React's `cache()` dedupes within
  one render, which is what stops `generateMetadata()` and the page body
  querying the same row twice. `unstable_cache` persists across requests and
  carries the tag. Removing either one does not leave the other covering for it.

## Flags

- **`unstable_cache` is the superseded API.** Next 16 replaces it with the
  `use cache` directive, which requires the `cacheComponents` flag. That flag is
  repo-wide: data fetching becomes dynamic by default, Partial Prerendering
  turns on, and the route segment configs are replaced. Next's own migration
  guide drives it with a dedicated skill, one feature at a time, following
  per-route validation errors — and it would have to account for Payload's admin
  routes under `/crm`, which are `ƒ` by nature. That is its own task. The same
  guide states that `unstable_cache` "keeps working as a separate layer", and
  every use of it in this repo is inside `src/lib/content.ts`, so the migration
  stays a small, contained change whenever it is scheduled.
- `generateStaticParams()` reads the slug **per locale with the fallback off**.
  A plain `find` returns rows for a locale that has no translation, because
  `slug` is fallback-resolved — so the Vietnamese slug would be prerendered
  under `/en/` too, and T-09's `hreflang` rule would be contradicted by the
  route table. Verified: `huong-dan` is prerendered in `vi` only.
