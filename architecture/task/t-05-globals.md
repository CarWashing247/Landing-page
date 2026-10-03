# T-05 · Globals

| | |
| --- | --- |
| Phase | 2 — Content and SEO |
| Branch | `t-05-globals` |
| Depends on | T-02 |
| Blocks | T-14, T-16, T-19, T-21 |
| Critical path | no |

## Goal

`BusinessInfo` and `SiteSettings` as the single source for every business
detail and every site-wide default. After this task, a hardcoded phone
number anywhere in the repo is a bug.

## Scope

**In scope — `BusinessInfo`** (Design.md section 2.2)

| Field | Type | Notes |
| --- | --- | --- |
| `legalName` | text, required | name as registered |
| `streetAddress` | text, required | |
| `locality` | text, required | district / city |
| `postalCode` | text | |
| `lat` / `lng` | number | feeds JSON-LD `geo` and the T-19 map |
| `phone` | text, required | |
| `zalo` | text | |
| `openingHours` | array | one row per weekday: `day` select, `opens`, `closes`, `closed` checkbox |
| `priceRange` | text | e.g. `50.000₫ - 200.000₫` |

**In scope — `SiteSettings`**

| Field | Type | Notes |
| --- | --- | --- |
| `brandName` | text, required | used in the `meta.title` fallback |
| `titleSuffix` | text | default suffix appended to the title, e.g. `\| AutoWash247` |
| `defaultDescription` | textarea, max 180 | |
| `ogFallback` | upload → Media | used when `meta.image` is blank |
| `favicon` | upload → Media | |
| `ga4MeasurementId` | text | consumed in T-21 |
| `socialLinks` | array | `platform` select + `url` |

Every non-obvious field gets a Vietnamese `label` **and** a Vietnamese
`admin.description`. The audience cannot read `priceRange` or `lat` and
infer what they are for.

**Out of scope**

- Rendering any of this (T-16 footer, T-14 JSON-LD, T-19 contact page).
- Cache invalidation on change (T-11).

## Steps

1. Write `src/globals/BusinessInfo.ts` and `src/globals/SiteSettings.ts`,
   register both in `payload.config.ts`.
2. Model opening hours as an array keyed by weekday with a `closed`
   checkbox, and `admin.condition` hiding `opens`/`closes` when `closed` is
   checked. A guardrail in the config beats a note in a document.
3. Put `lat`/`lng` behind an `admin.description` that says where to get
   them (right-click a pin in Google Maps → copy coordinates).
4. Group the SEO-ish `SiteSettings` fields (`titleSuffix`,
   `defaultDescription`, `ogFallback`) into a tab of their own.
5. `npx payload generate:types`, migration, apply.

## Files

```
src/globals/BusinessInfo.ts
src/globals/SiteSettings.ts
src/payload.config.ts
src/payload-types.ts            # generated
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] Both globals are editable in `/admin` and typed in
      `payload-types.ts` (`BusinessInfo`, `SiteSetting`).
- [ ] Every field has a Vietnamese label; every non-obvious field has a
      Vietnamese `admin.description`.
- [ ] Opening hours cover all seven weekdays, and a day marked closed hides
      its time inputs.
- [ ] `required` is set on the fields JSON-LD cannot omit: `legalName`,
      `streetAddress`, `locality`, `phone`, `brandName`.
- [ ] Saving each global round-trips through the REST API.

## Verification

```bash
npx payload generate:types && npm run typecheck
curl -s localhost:3000/api/globals/business-info | python3 -m json.tool
curl -s localhost:3000/api/globals/site-settings  | python3 -m json.tool
grep -rn "0[0-9]\{8,10\}" src/components src/app || echo 'no hardcoded phone'
```

## Notes

- Name, address and phone must end up byte-identical to Google Business
  Profile (AGENT.md 5.4). This task creates the fields; T-23 fills them and
  T-24 provides the sync checklist.

## Flags

- **Real business data is required here and must not be invented.** Use
  obvious placeholders (`TODO(data): street address`) and flag them. A
  plausible-looking Hanoi address entered now ends up in JSON-LD and in
  Google Business Profile.
- Vietnamese field labels: write them; they are CMS chrome, not user-facing
  marketing copy. If unsure of a term, use `TODO(copy)` with the English
  gist.
