# T-15A · Interface message catalog

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-15a-message-catalog` |
| Depends on | T-04A, T-15 |
| Blocks | T-16, T-17, T-19 |
| Critical path | no — runs alongside Phase 2 |

## Goal

Every string the interface renders itself, in both locales, resolved on the
server.

The catalog has to exist before the first component that renders a string.
Built afterwards, the job becomes finding Vietnamese literals scattered
across finished components and extracting them — which is the same mistake
as retrofitting metadata, at a smaller scale.

## Scope

**In scope**

- `src/i18n/messages/vi.ts` and `en.ts`, with `vi` as the source of truth
  for the key set.
- A typed `t()` resolved per request from the locale that T-04A's resolver
  returns. **Server-side only.**
- Keys for what exists or is about to: navigation, call and directions
  buttons, the mobile menu toggle's accessible label, form labels and
  validation messages (T-19), block CTAs (T-17), the draft banner (T-12),
  and `global-not-found.tsx`, which already carries two `TODO(copy)`
  markers.
- Typing such that a missing or misspelled key fails `npm run typecheck`.
  `en` is `Record<keyof typeof vi, string>`, so an untranslated key cannot
  compile.

**Out of scope**

- CMS content and the admin UI (T-04A).
- The components themselves. This task provides the catalog and converts
  only what already exists.
- Pluralisation and date or number formatting. Add them when something needs
  them; `Intl` is already available.

## Steps

1. Write `vi.ts` with the keys the existing code needs, then `en.ts` typed
   against it.
2. Write `t()` taking a locale and returning a lookup. Keep it a plain
   function — no context provider, no client component.
3. Convert `global-not-found.tsx` and anything else already holding a
   literal.
4. Add a check to the lint step or a test that fails on a user-facing
   literal in `src/components`.

## Files

```
src/i18n/messages/vi.ts
src/i18n/messages/en.ts
src/i18n/t.ts
src/i18n/t.test.ts
src/app/global-not-found.tsx
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] No user-facing literal in any component — a check proves it, rather
      than a reviewer noticing.
- [ ] A key present in `vi` and missing from `en` is a **type error**.
- [ ] A missing key never renders a blank or the key name.
- [ ] Switching locale changes every interface string on the page, not only
      the CMS content.
- [ ] No `'use client'` is added, and no i18n dependency.
- [ ] The two `TODO(copy)` markers in `global-not-found.tsx` are resolved.

## Verification

```bash
npm run typecheck    # a missing en key must fail this
npm run build && npm run start &
curl -s localhost:3000/khong-ton-tai | grep -i '404\|không tìm thấy'
curl -s localhost:3000/en/not-a-page | grep -i '404\|not found'
grep -rnE "[\"'][A-ZĐ][a-zàáâãèéêìíòóôõùúăđĩũơư ]{6,}[\"']" src/components || echo 'no literals'
```

## Notes

- Keep the key names about meaning, not location: `cta.callNow`, not
  `header.button2`. The second kind stops being true the first time
  something moves.

## Flags

- **All of it is user-facing copy in two languages.** Vietnamese that is not
  already written down and English that is not mechanical both get
  `TODO(copy)` and a note in the PR. Do not machine-translate either
  direction (AGENT.md section 1).
