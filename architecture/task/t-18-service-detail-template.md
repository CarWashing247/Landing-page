# T-18 · Service detail template

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-18-service-detail-template` |
| Depends on | T-07, T-17 |
| Blocks | T-20, T-23 |
| Critical path | no |

## Goal

`/dich-vu/<slug>` as a real page: price, duration, what the package
includes, and a clear next step. This is the route for a visitor who
already knows what they want (Design.md section 3), so the page should
answer "how much, how long, what do I get" above the fold.

## Scope

**In scope**

- `src/app/landing-page/dich-vu/[slug]/page.tsx` rendering a `Services`
  document: `name` as `<h1>`, `price` formatted as VND, `durationMinutes`,
  `includes[]`, `image` as the hero with `priority`.
- `generateStaticParams()` from published services (already added in T-10 —
  confirm it covers every published slug).
- `generateMetadata()` delegating to `buildMetadata()` (T-09).
- `Service` + `Offer` JSON-LD from T-14, price from the CMS.
- Reuse of T-17 blocks where the layout matches — do not write a second
  `Cta`.
- A VND currency formatter in `src/lib/` used by both this page and the
  `Pricing` block.

**Out of scope**

- Booking or payment. Out of scope for the whole repo (AGENT.md section 9);
  the CTA links out to the separate backend.
- New blocks.

## Steps

1. Read `src/components/blocks/` and `src/lib/` before writing anything.
   The CTA, the hero treatment and the price formatter should already
   exist; reuse them.
2. Write the route: fetch by slug with the `service:<slug>` tag,
   `notFound()` when missing or unpublished.
3. Format price with `Intl.NumberFormat('vi-VN', { style: 'currency',
   currency: 'VND' })` in a shared helper. Do not hand-roll thousand
   separators.
4. Render `includes[]` as a list — it is the "what do I get" answer.
5. Emit `Service` + `Offer` via the T-14 builder.
6. Confirm the route is statically prerendered in the build output.

## Files

```
src/app/landing-page/dich-vu/[slug]/page.tsx
src/lib/format-currency.ts
src/components/blocks/Cta.tsx   # reused, not rewritten
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] The page is statically generated — `○`/`●` in the build output for
      `/dich-vu/[slug]`, not `ƒ`.
- [ ] It emits `Service` + `Offer` schema with the price from the CMS, and
      passes the Rich Results Test with zero errors.
- [ ] Price, duration and `includes` all come from the CMS.
- [ ] `<h1>` is the service name, and there is exactly one.
- [ ] The hero image uses `next/image` with `priority`.
- [ ] An unpublished or unknown slug returns 404.
- [ ] Changing the price in `/admin` updates both the page text and the
      `Offer` schema after revalidation.
- [ ] No duplicated CTA or formatter component.

## Verification

```bash
npm run build | grep 'dich-vu'
npm run start &
curl -s localhost:3000/dich-vu/<slug> | grep -iE '<title|<h1|name="description"'
curl -s localhost:3000/dich-vu/<slug> \
  | grep -o '<script type="application/ld+json">.*</script>' \
  | python3 -c "import sys,re,json;[print(json.dumps(json.loads(m),indent=2,ensure_ascii=False)) for m in re.findall(r'>(.*?)<',sys.stdin.read(),re.S) if m.strip().startswith('{')]"
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/dich-vu/khong-ton-tai   # 404
```

## Notes

- The `Offer` price and the price shown on the page must come from the same
  field read once. Reading it twice is how they end up disagreeing after a
  future refactor.

## Flags

- Package names, prices and durations are real business data — placeholders
  until T-23.
