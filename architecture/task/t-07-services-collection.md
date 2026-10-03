# T-07 · Services collection

| | |
| --- | --- |
| Phase | 2 — Content and SEO |
| Branch | `t-07-services-collection` |
| Depends on | T-06 (reuses the same SEO field-group shape) |
| Blocks | T-08, T-14, T-18 |
| Critical path | no |

## Goal

One document per wash package, each becoming `/dich-vu/<slug>`. Price lives
here with an explicit currency unit, because it is rendered on the page
*and* emitted as a JSON-LD `Offer` — two consumers that must not disagree
about whether `150000` means dong or thousands of dong.

## Scope

**In scope**

- `Services`: `name` (required), `slug` (required, unique, indexed),
  `price` (number, required), `currency` (select, default `VND`,
  `readOnly` unless a second currency is ever needed),
  `durationMinutes` (number, required), `includes` (array of text —
  what the package covers), `image` (upload → Media),
  `_status` via `versions: { drafts: true }`.
- Same slug behaviour as T-06: generated from `name`, unaccented, locked
  once published. Reuse the T-06 helper and hook — do not reimplement.
- Access control from T-03.

**Out of scope**

- The SEO tab (T-08).
- `/dich-vu/<slug>` route and template (T-18).
- `Service` + `Offer` JSON-LD (T-14).

## Steps

1. Write `src/collections/Services.ts`, reusing `slugify` and the
   published-slug guard from T-06.
2. Store price as an integer in dong with an `admin.description` that says
   so in Vietnamese (`Nhập số tiền bằng VND, ví dụ 150000`). Do not store a
   formatted string — formatting belongs in the component.
3. `durationMinutes` with a `min: 1` and a Vietnamese label.
4. `includes` as an array of `{ item: text }` so an editor can reorder.
5. `image` is a required-ish decision: make it required if every service
   page must have a hero. Default to **required**, and say so in the PR.
6. `npx payload generate:types`, migration, apply.

## Files

```
src/collections/Services.ts
src/payload.config.ts
src/payload-types.ts            # generated
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] Services are listable in `/admin` with useful default columns.
- [ ] Each service has a unique slug; a duplicate is rejected.
- [ ] `price` carries an explicit currency unit, visible to the editor.
- [ ] `durationMinutes` rejects zero and negatives.
- [ ] Drafts and version rollback work as on `Pages`.
- [ ] A published service's slug is not editable.

## Verification

```bash
npm run build && npm run typecheck
curl -s 'localhost:3000/api/services?limit=50' | python3 -m json.tool | grep -E '"slug"|"price"|"currency"'
# duplicate slug must fail
curl -s -o /dev/null -w 'dup slug: %{http_code}\n' -b admin.cookie -X POST \
  -H 'content-type: application/json' -d '{"name":"X","slug":"<existing>","price":1,"durationMinutes":1}' \
  localhost:3000/api/services
```

## Notes

- Prices are business data. Do not seed real-looking numbers here; T-23
  fills them.
- `includes[]` feeds both the page body and nothing else — it is
  deliberately not part of the `Offer` schema, which carries price and
  availability only.

## Flags

- **Price values and package names are real business data.** Use
  placeholders and flag them.
