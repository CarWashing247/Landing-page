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
- `lastModified` from a real stored timestamp, never `new Date()`: the localized
  `localeUpdatedAt` stamp per locale, falling back to `updatedAt`.
- `src/app/robots.ts`: `Disallow: /admin`, `Disallow: /api`, `Sitemap:`
  pointing at the absolute sitemap URL. **At the root of `app/`, not under the
  locale folder** — see Notes; the path given here originally does not work.
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
src/app/robots.ts               # NOT under the locale folder — see Notes
src/lib/sitemap.ts              # the exclusion rules, pure and tested
src/lib/sitemap.test.ts
src/lib/content.ts              # the narrow, single-query sitemap read
src/fields/locale-updated-at.ts # the localized lastModified stamp
src/collections/Pages.ts        # wire the field and its beforeChange hook
src/collections/Services.ts     # the same
src/lib/revalidate.ts           # a SiteSettings save now purges `sitemap` too
src/migrations/20261005_155731_locale_updated_at.ts
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

- `SITEMAP_TAG` already exists in `src/lib/cache-tags.ts` (T-10) — import it,
  do not spell `'sitemap'`. Nothing attached it until this task.
- **`robots.ts` is recognised only in the root of `app/`.** `sitemap` may nest
  inside a route segment — that is how `/sitemap.xml` is served from the
  Vietnamese folder — but `robots` may not. Nested, it is silently not built:
  no error, no warning, no entry in the route table, and `/robots.txt` 404s.
  Caught by reading the build output rather than by trusting the file to be
  picked up. At the app root it also needs no rewrite, because its own path is
  already the public URL.
- **One sitemap covering both locales, not one per locale.** Google wants each
  URL listed once with its translations declared alongside, and splitting them
  makes the reciprocal `hreflang` harder to keep honest for no gain. The file
  lives under the Vietnamese folder only because the rewrite maps
  `/sitemap.xml` onto it; it is not a Vietnamese sitemap.
- **`alternates` must never name a URL the sitemap itself excluded.** Google
  reads a reciprocal `hreflang` group as a unit, so one member pointing at an
  excluded or 404ing URL devalues the whole set — which is worse than emitting
  no alternates at all. The filter therefore runs once per document and the
  result is reused, rather than being re-derived per entry where the two could
  drift. `x-default` is dropped entirely when Vietnamese is excluded.
- **The query is one `locale: 'all'` read per collection**, not one per
  document. `locale: 'all'` returns the localized fields as per-locale maps,
  which is the only way to tell "this locale has no slug" from "its slug equals
  the default's", and the same read answers the `noindex` question. Note that
  `publishedSlugs()` (T-10) does the per-document version; that cost is paid
  once at build, where it is defensible, while a sitemap is served on request.

- Draft filtering and `noindex` filtering are two separate conditions and
  both are easy to half-implement. Check both, with a real draft and a real
  `noindex` page.
- Disallowing `/api` in robots does not secure it. T-22 covers the actual
  controls; this is only crawl hygiene.

## Flags

- **The `noindex` exclusion depends on T-08's guardrail and is easy to
  misread as a bug.** Verified end to end: an English service translated only
  as far as its name and slug is `noindex: true` by the guardrail, so
  `/en/services/quick-wash` was correctly absent from the sitemap; filling in
  its SEO title and description released the flag and the URL appeared —
  without a rebuild. That is the full T-08 → T-11 → T-13 chain, and the first
  point at which it is observable.
- ~~**`lastModified` moves for both locales when either is edited.**~~ **Fixed.**
  `updatedAt` is not localized — one row, one timestamp — so publishing an
  English edit moved the Vietnamese entry's `lastmod` too. Payload offers no
  localized equivalent, so `src/fields/locale-updated-at.ts` adds one: a
  localized `date` stamped in `beforeChange` for the locale being written, which
  `lastModifiedFor()` prefers and falls back from. Verified against a real
  document: an English-only edit at `16:01:31` moved `/en/pricing` alone and left
  `/bang-gia` at `16:01:10.388`, while the shared `updatedAt` moved to `.324` —
  the value both entries used to report.
- ~~The home entries carry **no `lastModified`**.~~ **Fixed, within a stated
  bound.** They now carry `SiteSettings.updatedAt`. That is the right timestamp
  because everything Google indexes about `/` that is not placeholder copy comes
  from that one global — `brandName` is the `<title>`, `defaultDescription` the
  description, `ogFallback` the share image — so the global's timestamp bounds
  when the indexable part of the URL last changed. What it does not cover is the
  hardcoded body, which moves only on a deploy; that makes it understate rather
  than overstate, which is the safe direction, and the attribute is omitted
  entirely on a fresh install where the global has never been saved. It stops
  being a bound at all once `/` becomes a CMS document (T-17/T-23).

## Flags still open

- **A `SiteSettings` save now purges `sitemap` as well as `globals`.**
  `revalidateGlobal` names the globals that feed the sitemap rather than purging
  it for every global, so `BusinessInfo` still purges `globals` alone — verified
  from the hook's own log line: `business-info` `count=1 tags=globals`,
  `site-settings` `count=2 tags=globals,sitemap`.
- **The sitemap's cache key carries a shape version (`['sitemap', 'v2']`), and it
  has to be bumped by hand.** `unstable_cache` entries survive a deployment by
  design, so adding `localeUpdatedAt` to `SitemapDocument` without changing the
  key handed the new build the old build's data under the new type. It was not
  subtle — the build failed outright on a `TypeError` in `lastModifiedFor` — but
  nothing enforces the bump, so `lastModifiedFor` reads the map optionally
  against its own type to make a missed bump degrade to `updatedAt` rather than
  500 the route. Anyone adding or removing a field on `SitemapDocument` must bump
  it.
