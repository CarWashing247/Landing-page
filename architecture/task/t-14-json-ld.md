# T-14 · JSON-LD

| | |
| --- | --- |
| Phase | 2 — Content and SEO |
| Branch | `t-14-json-ld` |
| Depends on | T-05, T-07, T-09 |
| Blocks | T-18, Gate 2 |
| Critical path | **yes** |

## Goal

Structured data built from `BusinessInfo` and the CMS, never from hardcoded
values. This is what puts opening hours, address and price into a Google
result rather than leaving them for a crawler to guess.

## Scope

**In scope**

- `src/components/seo/JsonLd.tsx` — a Server Component rendering
  `<script type="application/ld+json">` with escaped content.
- Builders in `src/lib/schema/` (one per type), each taking typed CMS data:
  - `AutoWash` on the home page, from `BusinessInfo`: name, address,
    `geo`, `telephone`, `priceRange`, `openingHoursSpecification`,
    `sameAs` from `SiteSettings.socialLinks`.
  - `Service` + `Offer` on service pages, price from the CMS.
  - `FAQPage` where the page's `layout` contains an `Faq` block.
- `Organization` JSON-LD in the frontend root layout (AGENT.md section 4).
- Weekday mapping from the `BusinessInfo.openingHours` array to
  `openingHoursSpecification`, honouring the `closed` flag.

**Out of scope**

- The `Faq` block component itself (T-17). This task consumes the block's
  data shape; coordinate so T-17 does not rename the fields underneath it.
- `BreadcrumbList` — not in Design.md. Do not add it here.

## Steps

1. Write the schema builders as pure functions over `payload-types.ts`
   types. Pure means unit-testable, and this is data that must not drift.
2. Write `JsonLd.tsx` taking an object and serialising it safely (escape
   `<`, `>`, `&` to avoid breaking out of the script tag).
3. Map opening hours: skip closed days or emit them explicitly, and use
   `Mo`–`Su` day tokens. Be consistent with what the business actually
   publishes on Google Business Profile.
4. Emit `AutoWash` on `/` and `Service` + `Offer` on `/dich-vu/<slug>`.
5. Detect an `Faq` block in `layout` and emit `FAQPage` with its
   question/answer pairs.
6. Validate every emitted shape against Google's Rich Results Test. Zero
   errors is the bar; warnings get noted in the PR.

## Files

```
src/components/seo/JsonLd.tsx
src/lib/schema/autowash.ts
src/lib/schema/service.ts
src/lib/schema/faq.ts
src/lib/schema/*.test.ts
src/app/landing-page/layout.tsx
src/app/landing-page/page.tsx
src/app/landing-page/dich-vu/[slug]/page.tsx
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] Every emitted schema passes Google's Rich Results Test with **zero
      errors**.
- [ ] Changing opening hours in `/admin` changes the rendered
      `openingHoursSpecification` (after revalidation, no deploy).
- [ ] Name, address and phone in JSON-LD come from `BusinessInfo` and are
      byte-identical to Google Business Profile.
- [ ] Service pages emit `Service` with a nested `Offer` carrying the CMS
      price and `priceCurrency: 'VND'`.
- [ ] A page with an `Faq` block emits `FAQPage`; a page without does not.
- [ ] No business value is hardcoded in any schema builder.
- [ ] The JSON-LD is in the HTML source, visible via `curl`.

## Verification

```bash
npm run build && npm run start &
for p in / /dich-vu/<slug> /huong-dan; do
  echo "== $p"
  curl -s "localhost:3000$p" | python3 - <<'PY'
import sys, re, json
html = sys.stdin.read()
for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
    print(json.dumps(json.loads(m), indent=2, ensure_ascii=False))
PY
done
grep -rniE "hanoi|\+84|0[0-9]{9}" src/lib/schema src/components/seo || echo 'no hardcoded business data'
```

Then paste each page's URL into Google's Rich Results Test and record the
result in the PR.

## Notes

- JSON-LD that parses is not JSON-LD that validates. The Rich Results Test
  is part of the definition of done for this task (AGENT.md 5.4), not a
  nice-to-have.
- `AutoWash` is a `LocalBusiness` subtype. Keep `@type` exactly as Design.md
  specifies; do not substitute `LocalBusiness` because a validator suggests
  it.

## Flags

- Opening hours, `priceRange`, address and phone are real business data. If
  `BusinessInfo` still holds placeholders from T-05, the Rich Results check
  can pass structurally but the values are wrong — say so explicitly rather
  than reporting the task clean.

---

> **Gate 2 — `view-source:` shows complete meta tags and valid JSON-LD on
> every route type.** Verify with `curl`, not devtools. T-05 to T-14 must be
> merged before Phase 3 UI work is considered started.
