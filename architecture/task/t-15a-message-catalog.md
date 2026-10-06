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

> **Design source: Canva `DAHXI-Jb8Ig` (UI Foundation) and the three page decks.**
> Tokens (colour, type scale, radii) are already implemented from the UI
> Foundation deck by T-15 — use them by name, do not re-read hex values out of
> the deck. **The decks carry real Vietnamese copy written by the designer**, not machine translation — headings, the 24/7 badge ("ĐANG HOẠT ĐỘNG 24/7"), FAQ questions, the four process steps. Take the catalog's Vietnamese from there rather than translating or inventing it (CLAUDE.md).

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
- **Most of the Vietnamese is taken verbatim from the Canva designs**
  (`DAHXNsDnbjg`, "AutoWash247 Website UI"), which carry copy the designer
  wrote. CLAUDE.md's rule against machine-translating Vietnamese assumes nobody
  has written the copy; where it exists, a `TODO(copy)` marker would be wrong
  twice over, because it hides copy that is already there.
- **Read the designs' strings from the rendered pages, not from the text
  extraction.** Canva's text dump is OCR-damaged in places — it produced "Bằng
  giả" for "Bảng giá", "Địch vụ" for "Dịch vụ", "Honline" for "Hotline" and "Hồ
  trợ" for "Hỗ trợ". Copying those into the catalog ships typos to every visitor.
  Every string used here was confirmed against a page thumbnail.
- **`t()` is property access, not a key lookup.** `t(locale)` returns the
  catalog object and components read `copy.nav.home`. That is what makes "a
  missing key never renders a blank or the key name" true by construction rather
  than by a runtime fallback: there is no lookup to miss, and `copy.nav.hoem`
  fails `npm run typecheck`.
- **No provider and no i18n dependency.** Every component rendering a string here
  is a Server Component and the locale is already a build-time constant from the
  locale folder; a provider would put a client component at the root of every
  statically prerendered page to deliver strings known at build time.
- Casing is natural, not display casing. The designs shout several buttons
  (GỬI TIN NHẮN); that is `text-transform` and belongs to the component.
- The `placeholder.*` section exists only so no component holds a literal while
  the real bodies are still to come. **T-17, T-18 and T-23 delete it.**

## Flags

- **Strings with no written copy anywhere are `TODO(copy)`, as this task's own
  flag requires.** Thirteen in Vietnamese, two in English:

  | Key | Why it is unwritten |
  | --- | --- |
  | `nav.primaryLabel`, `nav.openMenu`, `nav.closeMenu`, `language.switchLabel` | accessible labels; no deck shows them |
  | `contact.required`, `contact.invalidEmail`, `contact.sent`, `contact.sendFailed` | validation and status messages; no deck shows an error state |
  | `draft.message`, `draft.exit` | editor-facing preview state; no deck shows it |
  | `placeholder.homeBody`, `placeholder.pageBody`, `placeholder.serviceBody` | deleted by T-17/T-18/T-23 |
  | `actions.tryToday`, `actions.tryTodayLead` (English only) | marketing lines; the designs give the Vietnamese only, and English marketing copy is not mechanical |

  Everything else is written, in both languages.

- **The designs contain sample business data that must not be copied.** Page 8
  shows a hotline of `1900 0000`, `info@autowash247.vn`, an address on Đường Lê
  Duẩn and hours of `Thứ 2 - Thứ 7: 08:00 - 18:00`. They are design placeholders.
  None of them is in the catalog — business data belongs in `BusinessInfo`, where
  it is still `TODO(data):`. Taking them from the deck would put an invented
  address into JSON-LD and into Google Business Profile, which is the outcome
  CLAUDE.md names explicitly. **They look real enough to be copied by accident.**

- **The 404's rendering could not be verified, because of follow-up A1.** The
  literals are out of `global-not-found.tsx` and the markers are resolved, which
  is what this task owns. But T-09's catch-all rewrite means no public URL is
  ever truly unmatched, so the page never renders: `/khong-ton-tai` returns a 404
  whose body is empty, with `<html id="__next_error__">` and no `lang`. Measured
  again here. The copy is wired and will appear the moment T-16 fixes the shell.

- **"Switching locale changes every interface string" is only partly
  demonstrable yet**, because almost nothing renders interface strings before
  T-16 builds the header and footer. What was verified end to end is the draft
  banner, the one component that renders locale-varying catalog strings today:
  under `vi` it renders the `TODO(copy)` markers and under `en` the written
  English, through a real draft preview on a running server.

- **All of it is user-facing copy in two languages.** Vietnamese that is not
  already written down and English that is not mechanical both get
  `TODO(copy)` and a note in the PR. Do not machine-translate either
  direction (AGENT.md section 1). Honoured as described above — the designs
  supplied most of the Vietnamese, and only genuinely unwritten strings are
  marked.
