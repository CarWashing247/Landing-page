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
| `page:<slug>` | one CMS page |
| `service:<slug>` | one service page |
| `sitemap` | `sitemap.xml` |
| `globals` | header, footer, JSON-LD |

  Exported as functions (`pageTag(slug)`, `serviceTag(slug)`) plus the two
  constants, so no caller builds a tag string by hand.
- `generateStaticParams()` on `[slug]/page.tsx` and
  `dich-vu/[slug]/page.tsx`, returning published slugs from the CMS.
- `next: { tags: [...], revalidate: 3600 }` on **every** Payload query that
  feeds a page.
- `notFound()` for a slug that is not a published document.

**Out of scope**

- The webhook that purges these tags (T-11).
- `sitemap.ts` itself (T-13) — but define the `sitemap` tag here so T-13
  only consumes it.

## Steps

1. Write `src/lib/cache-tags.ts`. Keep it dependency-free.
2. Add a thin query layer in `src/lib/payload.ts` (or alongside) so each
   content fetch has one call site that already carries its tags. This is
   what makes the "no inline tag literals" rule hold by construction rather
   than by review.
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
grep -rn "'page:\|\"page:\|'service:\|\"service:\|'sitemap'\|'globals'" src --include=*.ts --include=*.tsx \
  | grep -v src/lib/cache-tags.ts || echo 'no inline tag literals'
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

## Flags

- None expected.
