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

> **Design source: Canva `DAHXNi05PeY` (AutoWash247 Desktop Pages).**
> Tokens (colour, type scale, radii) are already implemented from the UI
> Foundation deck by T-15 — use them by name, do not re-read hex values out of
> the deck. The UI Foundation deck's Service card (page 5) shows the package name, price, duration and the "Includes" list this template expands.

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
- **The closing band *is* T-17's `Cta`**, handed a block built from the message
  catalog. `Services` has no `layout` field, so there is no block for an editor
  to compose — and "do not write a second `Cta`" is a scope rule, so the
  component is reused with catalog strings rather than copied with different
  ones. A later change to the button or the band lands on this page for free.
- **`formatPrice` moved out of the `Pricing` block into
  `src/lib/format-currency.ts`.** Two call sites now show the same service's
  price; two implementations would eventually disagree about which side the ₫
  sits on. Vietnamese groups with dots (`150.000 ₫`), English with commas and
  the symbol in front (`₫150,000`) — both fall out of `Intl` and the locale.
- **`callHref` moved into `src/lib/routes.ts`.** The header had it and the footer
  had a second copy inline; this page would have been the third. It is three
  lines, which is exactly why it was about to be written again.
- The hero is `Band tone="primary"` with an inner grid rather than new container
  markup, so the page's max width and gutters stay in the one place T-15 put
  them.
- `sections.serviceDetails` is still unused. It reads like a heading for a
  price-and-duration table, and this template puts both numbers under the `<h1>`
  where the visitor is looking instead. Left in the catalog for the services
  index or T-19A rather than deleted.

## Flags

- Package names, prices and durations are real business data — placeholders
  until T-23.
- **`actions.tryToday` and `actions.tryTodayLead` are `TODO(copy)` in English.**
  T-15A wrote the Vietnamese from the deck and left the English unwritten, and
  this page is their first consumer — so `/en/services/<slug>` renders the
  marker. Not machine-translated here (CLAUDE.md); it is T-15A's string to
  write, and the same is already true of the skip link and the menu labels.
- **`includes` falls back to Vietnamese on an English page.** The field is
  localized (T-07) and `localization.fallback` is on, so an untranslated list
  renders the Vietnamese items under the English heading. That is the documented
  fallback working, and T-23 writes both; it becomes a defect only if T-23 fills
  one locale.
- **The CTA is a phone call, because no field holds a booking link.** The scope
  says the CTA "links out to the separate backend" and nothing in `BusinessInfo`
  or `SiteSettings` holds that URL, so inventing one would be inventing business
  data. `BusinessInfo.phone` is real CMS data and the header already uses it the
  same way. A `bookingUrl` global field is a schema change and a product
  decision — see `follow-ups.md` D3, which is where the other Admin-design
  product decisions are parked.
- A service's photo is promised to the editor as the share image and is not used
  as one — `follow-ups.md` A9, found here and not fixed here.
- Google's Rich Results Test still has not been run on the `Service` + `Offer`
  schema, for the reason A7 records: it needs a public URL or a browser session,
  and this environment has neither. The schema is checked against schema.org's
  vocabulary by `src/lib/schema/schema-org.test.ts` and was read out of the
  built HTML in both locales.
