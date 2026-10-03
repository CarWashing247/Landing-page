# T-20 · Performance pass

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-20-performance-pass` |
| Depends on | T-16, T-17, T-18, T-19 |
| Blocks | Gate 3 |
| Critical path | **yes** |

## Goal

Mobile Lighthouse performance **and** SEO at 90 or above on the home page,
a service page and the contact page. This task is an audit with fixes, not
a redesign — findings that need a design decision get reported, not
improvised.

## Scope

**In scope**

- Audit every image: all through `next/image`, correct `sizes`, modern
  format, `priority` on each page's hero and nothing else.
- Verify no client component sits above the fold on any route.
- Trim unused CSS and JavaScript: check the bundle for anything pulled in
  by a leaf that did not need to be a leaf.
- Confirm fonts still load with `swap` and the `vietnamese` subset and
  contribute no CLS.
- Fix render-blocking resources and oversized hero images.
- Re-check the SEO category too — it is half of the acceptance bar and
  regressions here (missing alt, bad heading order, uncrawlable links) are
  cheap to fix at this point.

**Out of scope**

- Adding a new tracking script or a CDN layer.
- Rewriting a block because a measurement is 3 points short. Report it.
- Anything requiring a new dependency, unless it strictly removes more than
  it adds — say so in the PR with numbers.

## Steps

1. Measure first, on all three routes, mobile form factor, and record the
   baseline in the PR. No fix lands without a before number.
2. Walk the image audit: `grep` for bare `<img>`, check each `next/image`
   has a sensible `sizes`, confirm exactly one `priority` per page.
3. Check the client-component boundary: list every `'use client'` file and
   justify each in the PR. Expected set is the mobile menu toggle and the
   contact form.
4. Inspect the JS bundle per route; chase anything surprising to its import.
5. Re-measure, record after numbers, and list anything still short of 90
   with the reason.

## Files

Audit-wide. Expect small edits across `src/components/` and
`src/app/landing-page/`. **Do not reformat files you did not otherwise
change** (AGENT.md / CLAUDE.md).

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] Mobile Lighthouse **performance ≥ 90** on `/`, a `/dich-vu/<slug>`
      page, and `/lien-he`.
- [ ] Mobile Lighthouse **SEO ≥ 90** on the same three routes.
- [ ] Every image goes through `next/image`; no bare `<img>` in source.
- [ ] Exactly one `priority` image per page, and it is the hero.
- [ ] No client component above the fold on any route.
- [ ] Every `'use client'` file is listed and justified in the PR.
- [ ] Before and after numbers for all three routes are in the PR.
- [ ] No new dependency added for a marginal gain.

## Verification

```bash
npm run build && npm run start &
for p in / /dich-vu/<slug> /lien-he; do
  out=/tmp/lh$(echo "$p" | tr '/' '_').json
  npx lighthouse "http://localhost:3000$p" --form-factor=mobile --throttling-method=simulate \
    --only-categories=performance,seo --output=json --output-path="$out" --quiet
  python3 -c "
import json,sys; d=json.load(open('$out'))
c=d['categories']; a=d['audits']
print('$p', 'perf', round(c['performance']['score']*100), 'seo', round(c['seo']['score']*100),
      '| LCP', a['largest-contentful-paint']['displayValue'], 'CLS', a['cumulative-layout-shift']['displayValue'])"
done
grep -rn "<img" src/components src/app || echo 'no bare img'
grep -rln "'use client'" src
grep -rn "priority" src/components src/app
npm run build | sed -n '/Route (app)/,/^$/p'    # first-load JS per route
```

## Notes

- Measure against the production build (`npm run build && npm run start`).
  A dev-server Lighthouse number is meaningless.
- Run each route two or three times; simulated throttling moves a few
  points between runs. Report the median, not the best.

## Flags

- If a score is short of 90 because of the Google Maps embed or a
  third-party asset, report the finding with the measured cost and a
  recommendation rather than removing a feature unilaterally.

---

> **Gate 3 — mobile Lighthouse at 90 or above.**
