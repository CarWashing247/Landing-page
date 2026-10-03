# T-13 · Sitemap and robots

| | |
| --- | --- |
| Phase | 2 — Content and SEO |
| Branch | `t-13-sitemap-robots` |
| Depends on | T-10 |
| Blocks | T-21, T-22 |
| Critical path | no — can run alongside T-11 and T-12 |

## Goal

`/sitemap.xml` generated from the CMS, listing exactly the routes Google
should index, and `/robots.txt` keeping crawlers out of `/admin` and
`/api`. A page missing from the sitemap is a page that may never be found.

## Scope

**In scope**

- `src/app/landing-page/sitemap.ts`: all published, indexable `Pages` and
  `Services`, plus the static routes.
- Exclusions: `_status !== 'published'`, `meta.noindex === true`.
- `lastModified` from `updatedAt` — accurate, not `new Date()`.
- `src/app/landing-page/robots.ts`: `Disallow: /admin`, `Disallow: /api`,
  `Sitemap:` pointing at the absolute sitemap URL from `metadataBase`.
- Both queries carry the `sitemap` tag from T-10 and `revalidate: 3600`.

**Out of scope**

- Submitting the sitemap to Search Console (T-21).
- `changeFrequency` / `priority` beyond sensible defaults — Google ignores
  them; do not spend time tuning them.

## Steps

1. Write `sitemap.ts` using the tagged query layer from T-10. Fetch only
   the fields needed (`slug`, `updatedAt`, `meta.noindex`) — a sitemap
   query that pulls full `layout` blocks is wasteful on every rebuild.
2. Filter in the query where possible (`where` on `_status` and
   `meta.noindex`), not in JS after the fact, so the filter survives
   pagination.
3. Handle pagination explicitly, or set a limit high enough with an
   assertion that it was not hit.
4. Write `robots.ts` with the disallows and the absolute `Sitemap:` line
   built from `NEXT_PUBLIC_SITE_URL`.
5. Verify a `noindex` toggle removes the page after revalidation — this is
   the interaction between T-11's purge and this task.

## Files

```
src/app/landing-page/sitemap.ts
src/app/landing-page/robots.ts
src/lib/payload.ts              # add the narrow sitemap query
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] `/sitemap.xml` lists published, indexable routes only.
- [ ] `lastModified` reflects each document's real `updatedAt`.
- [ ] A page toggled to `noindex` disappears from the sitemap after
      revalidation.
- [ ] A draft page never appears.
- [ ] `/robots.txt` disallows `/admin` and `/api` and names the sitemap
      with an absolute URL.
- [ ] Every URL in the sitemap returns 200.
- [ ] The sitemap query uses the `sitemap` cache tag.

## Verification

```bash
npm run build && npm run start &
curl -s localhost:3000/sitemap.xml | tee /tmp/sm.xml | head -40
curl -s localhost:3000/robots.txt
# every listed URL must resolve
grep -o '<loc>[^<]*</loc>' /tmp/sm.xml | sed 's/<[^>]*>//g' \
  | while read u; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$u")" "$u"; done
# toggle noindex on one page in /admin, publish, then
curl -s localhost:3000/sitemap.xml | grep -c '<noindexed-slug>'   # expect 0
```

## Notes

- Draft filtering and `noindex` filtering are two separate conditions and
  both are easy to half-implement. Check both, with a real draft and a real
  `noindex` page.
- Disallowing `/api` in robots does not secure it. T-22 covers the actual
  controls; this is only crawl hygiene.

## Flags

- None expected.
