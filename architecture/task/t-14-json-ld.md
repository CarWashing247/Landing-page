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
- ~~`Organization` JSON-LD in the frontend root layout (AGENT.md section 4).~~
  **Not done — this line is wrong, see Notes.** Neither Design.md's T-14
  paragraph nor AGENT.md 5.4 mentions `Organization`, and emitting it site-wide
  alongside `AutoWash` would create two entity nodes for one business. The
  `AutoWash` node carries a stable `@id` that `Service.provider` references
  instead, which is what this line was reaching for.
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
3. Map opening hours: emit closed days explicitly as `00:00`–`00:00`, which is
   Google's documented form, and use schema.org's capitalised `Day` names
   (`Monday`). **Not `Mo`–`Su`** — those belong to the `openingHours` *string*
   form, not to `openingHoursSpecification`, which Design.md asks for; see Notes.
4. Emit `AutoWash` on `/` and `Service` + `Offer` on `/dich-vu/<slug>`.
5. Detect an `Faq` block in `layout` and emit `FAQPage` with its
   question/answer pairs.
6. Validate every emitted shape against Google's Rich Results Test. Zero
   errors is the bar; warnings get noted in the PR.

## Files

```
src/components/seo/JsonLd.tsx        # the only ld+json emitter; escaping lives here
src/components/seo/JsonLd.test.ts
src/lib/schema/shared.ts             # prune, the TODO(data) guard, node ids
src/lib/schema/autowash.ts
src/lib/schema/service.ts
src/lib/schema/faq.ts
src/lib/schema/*.test.ts
src/lib/content.ts                   # loadBusinessInfo, under the globals tag
src/lib/env.ts                       # siteOrigin(), shared with robots and sitemap
src/components/HomePage.tsx          # AutoWash
src/components/ServicePage.tsx       # Service + Offer
src/components/ContentPage.tsx       # FAQPage
```

The routes themselves are untouched: the schema is rendered by the shared
components both locale folders already delegate to, so the two locales cannot
drift. `src/app/landing-page/layout.tsx` is **not** in the list — see the
`Organization` note above.

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
  nice-to-have. **It has not been run — see Flags.**
- `AutoWash` is a `LocalBusiness` subtype. Keep `@type` exactly as Design.md
  specifies; do not substitute `LocalBusiness` because a validator suggests
  it.
- **Two errors in this file were found while building it**, both corrected
  above rather than followed:
  - It asked for `Organization` in the root layout. Design.md's T-14 paragraph
    and AGENT.md 5.4 both list only `AutoWash`, `Service`+`Offer` and `FAQPage`,
    and CLAUDE.md says the task file is what is wrong when they disagree. Two
    entity nodes for one business is also actively worse than one: Google has to
    guess which describes the business, and `sameAs` and the address would be
    split across them.
  - It asked for `Mo`–`Su` day tokens. Those are the `openingHours` string form
    (`"Mo-Fr 07:30-21:00"`). `openingHoursSpecification`, which Design.md names,
    takes schema.org `Day` values — `"Monday"`. Emitting `Mo` there produces a
    property Google drops without an error anywhere visible.
- **`inLanguage` is emitted on `FAQPage` only, which is a correction to
  AGENT.md 5.4.** The rule says every emitted schema carries it. Checked against
  schema.org's published vocabulary, `inLanguage` is defined on `CreativeWork`,
  `Event`, `BroadcastService`, `CommunicateAction`, `LinkRole`,
  `PronounceableText` and `WriteAction`. `FAQPage` is a `WebPage`, hence a
  `CreativeWork`, so it qualifies; `AutoWash` is a `Place`/`Organization` and
  `Service` is a bare `Thing`, and on those the property does not exist. The only
  language property valid on `AutoWash` is `knowsLanguage`, which is deliberately
  not used because it asserts which languages the business can serve customers in
  — a fact about the business that nothing in the CMS states and that does not
  follow from an English page existing. On `Service` there is no language property
  at all. Nothing is lost: the page's language is already carried by `<html lang>`,
  the reciprocal `hreflang` set and `og:locale`, all from T-09.
  `src/lib/schema/schema-org.test.ts` pins this against a vendored extract of the
  vocabulary. **AGENT.md 5.4 should be amended to say so** — see follow-up B4.
- **The business is one node, referenced rather than copied.** `AutoWash` is
  emitted on the home page with `@id` = `<origin>/#business`, and a service page
  says `provider: { '@id': … }` instead of restating the name and address. A
  second copy is a second thing to drift out of step with Google Business
  Profile, which is the whole point of AGENT.md 5.4. The reference is omitted
  when the business node is not emitted, because a bare `@id` that no page
  defines asserts a relationship Google cannot resolve.
- **`absoluteUrl()` exists because of a real mismatch, not tidiness.** The home
  page's canonical is `<origin>` with no trailing slash — Next normalises the
  root path away — while `<origin>` + `pathForHome('vi')` is `<origin>/`.
  Measured on the built server before the fix: the schema said
  `http://localhost:3000/` and the canonical said `http://localhost:3000`. To
  Google those are two URLs, which undercuts the node's claim about which page it
  describes.
- **Closed days are stated, not skipped.** An omitted day reads as "no
  information" rather than "closed"; `00:00`–`00:00` is Google's documented way
  to say closed. `BusinessInfo` fixes the array at seven rows so the week is
  always complete, and dropping the closed ones here would throw that away at
  the last step.
- Days are **not** grouped into one entry with a `dayOfWeek` array. Seven
  single-day entries cannot express a wrong grouping, and the saving is a few
  hundred bytes.
- `durationMinutes` is not in the schema. schema.org has no duration property on
  `Service` or `Offer` that means "how long the wash takes", and inventing one
  would be padding. It is template content (T-18).
- `includes` is likewise absent from the `Offer`, which T-07's own comment on the
  field already called for: an `Offer` carries price and availability, and a list
  of inclusions is page copy.

## Flags

- **`BusinessInfo` still holds `TODO(data):` placeholders, so no `AutoWash` is
  emitted at all.** This is the flag the task file predicted, and it is handled
  rather than merely reported: `autoWashSchema` returns `null` when the name or
  address is a placeholder, so the home page ships no business schema until T-23
  fills them in. Publishing `telephone: "TODO(data): phone number"` would
  contradict Google Business Profile, and AGENT.md 5.4 requires those three
  fields to be byte-identical to it — a name-address-phone mismatch is the one
  structured-data fault that costs local ranking outright rather than merely
  failing to earn anything. The same shape as T-08's `noindex` guardrail: the CMS
  withholds what it cannot yet state correctly and releases it by itself. Verified
  in both directions against the running server — synthetic values in, schema
  appears; placeholders restored, schema gone, no deploy either way.
- **The Rich Results Test has not been run.** It takes a public URL and this site
  is not deployed; its code-paste mode needs a browser, and this environment has
  no browser tool — `WebFetch` cannot reach `localhost` and cannot drive a
  JavaScript application. So the acceptance criterion "zero errors in the Rich
  Results Test" is **not met**, and nothing here should be read as claiming it.
  Run it on the first deployed URL, before T-21 submits anything to Search
  Console. Tracked as follow-up A7.

  What was done instead, and what it is worth: every emitted node is validated
  against schema.org's own published vocabulary in
  `src/lib/schema/schema-org.test.ts` — every `@type` must be a real class and
  every property must be defined on that type or one of its ancestors — plus the
  properties Google documents as required per type. That check found a real
  error this task had shipped (`inLanguage` on two types that do not define it),
  which is the argument for it existing. It is **not** a substitute: it checks
  schema.org's vocabulary, not Google's rich-result eligibility, and only Google's
  test covers the latter.
- **No `FAQPage` can be emitted yet**, because the `Faq` block is T-17 and
  `Pages.layout` accepts only `content` today. The builder, its tests and the
  block's field contract are in place, and the contract is recorded in
  `task/t-17-content-blocks.md` so T-17 cannot rename `items[].question` out from
  under it. What *is* verified is the other half of the criterion: a published
  page with no FAQ block emits no JSON-LD at all.
- Opening hours currently read 07:30–21:00 every day including Sunday. Those are
  the field defaults from T-05, not a statement about the business, and they
  **will** be published as fact once the name and address are filled in — the
  guardrail covers the identity fields, not the hours. T-23 must set the real
  week, and `priceRange`, `lat`/`lng` and `socialLinks` are all still empty.

---

> **Gate 2 — `view-source:` shows complete meta tags and valid JSON-LD on
> every route type.** Verify with `curl`, not devtools. T-05 to T-14 must be
> merged before Phase 3 UI work is considered started.
