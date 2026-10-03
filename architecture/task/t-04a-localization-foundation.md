# T-04A · Localization foundation

| | |
| --- | --- |
| Phase | 1 — Foundation (the gate into Phase 2) |
| Branch | `t-04a-localization-foundation` |
| Depends on | T-01 |
| Blocks | T-05 … T-14, T-15A, and therefore all of Phase 2 |
| Critical path | **yes** |

## Goal

Two locales — `vi` (default) and `en` — decided at the schema, routing,
cache and metadata layers **before** any of them is built.

This task exists because localization cannot be retrofitted. Payload stores
localized values in separate tables, so adding `localized: true` to a field
after T-06 is a migration; the locale belongs in the cache tag, so adding it
after T-10 means re-cutting every tag; `hreflang` belongs in
`buildMetadata()`, so adding it after T-09 means reopening the one function
every route delegates to. It is the Phase 2 before Phase 3 rule, one layer
down.

It also pays off a debt: T-02 and T-03 shipped Vietnamese labels and hook
messages as bare strings. Converting them is in scope here, so that no later
task has a reason to hardcode a user-facing string in one language.

## Scope

**In scope**

- Payload `localization`: `locales: ['vi', 'en']`, `defaultLocale: 'vi'`,
  `fallback: true`.
- Payload admin UI language: `i18n.supportedLanguages` for both, with
  `fallbackLanguage: 'vi'`, plus custom translation keys for this project's
  own messages.
- Convert **every** existing `label` and `admin.description` on `Media` and
  `Users` from a bare string to `{ vi, en }`.
- Convert the `APIError` messages in `Users` (the last-admin guards) to
  resolve through `req.t` against registered keys.
- Mark `alt` and `caption` on `Media` as `localized` — they are read aloud
  and indexed, so an English page needs English alt text.
- The `/en` URL prefix, carried through the rewrite table in
  `next.config.mjs` the same way `__p` already carries path depth.
- A locale resolver: one function that turns a request path into a locale,
  used by routes, `buildMetadata()` and the query layer. No duplicated
  prefix-parsing.
- `src/lib/locales.ts` — the locale list, the default, the prefix map and
  the `hreflang` codes, defined once.
- Migration for the schema change, and regenerated `payload-types.ts`.

**Out of scope**

- The interface message catalog (T-15A). This task localizes the **CMS and
  the contract**; component strings arrive with the components.
- `Pages`, `Services`, globals and the SEO group (T-05 to T-08) — they are
  built localized from birth, using what this task puts in place.
- The untranslated-locale `noindex` guard, which belongs to T-08 where the
  SEO group is defined. Specify it here, implement it there.

## Steps

1. Write `src/lib/locales.ts` first: `LOCALES`, `DEFAULT_LOCALE`,
   `localeFromPath()`, `pathForLocale()`, `HREFLANG`. Everything else
   imports from it.
2. Add `localization` to `payload.config.ts`. Mark `Media.alt` and
   `Media.caption` localized.
3. Register custom i18n translations and switch the `Users` guard messages
   to `req.t`.
4. Convert every label and description on `Media` and `Users` to
   `{ vi, en }`.
5. Add the `/en/:path*` rewrite, passing the locale alongside `__p`.
   Confirm `/en` (bare) has its own rule, as `/admin` needed one.
6. `npx payload generate:types`, `npx payload migrate:create`, apply.
7. Verify both locales over `curl`, and the admin locale switcher by hand.

## Files

```
src/lib/locales.ts
src/lib/locales.test.ts
src/payload.config.ts
src/collections/Media.ts
src/collections/Users.ts
src/i18n/admin-translations.ts
next.config.mjs
src/payload-types.ts            # generated
src/migrations/                 # generated
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] `/` serves Vietnamese and `/en` serves English; neither 404s.
- [ ] `/admin` offers a locale switcher for content, and its own UI language
      setting, and both work.
- [ ] No bare-string `label` or `admin.description` remains in any
      collection — `grep` proves it.
- [ ] The last-admin guard messages come from `req.t`, and still arrive as
      400 with a readable message in the active admin language.
- [ ] `payload-types.ts` shows `alt` and `caption` as localized.
- [ ] A migration exists and applies to a database built only from
      migrations.
- [ ] `localeFromPath()` is the only place a URL prefix is parsed.
- [ ] Unit tests cover the resolver, including the bare `/en` case and a
      path that merely starts with `en` (`/english-lessons`).

## Verification

```bash
npm run build && npm run start &
curl -s localhost:3000/     | grep -o '<html lang="[^"]*"'    # vi
curl -s localhost:3000/en   | grep -o '<html lang="[^"]*"'    # en
curl -s -o /dev/null -w 'bare /en: %{http_code}\n' localhost:3000/en

# the alt text really is per locale
curl -s 'localhost:3000/api/media?limit=1&locale=vi' | python3 -m json.tool | grep '"alt"'
curl -s 'localhost:3000/api/media?limit=1&locale=en' | python3 -m json.tool | grep '"alt"'

# no bare-string labels left
grep -rnE "label: '|label: \"" src/collections src/globals || echo 'all labels are {vi,en}'

# the guard message still reaches the caller
curl -s -b admin.cookie -X PATCH -H 'content-type: application/json' \
  -d '{"role":"editor"}' localhost:3000/api/users/<sole-admin-id> | python3 -m json.tool
```

## Notes

- `fallback: true` is for **fields**, so a half-translated document still
  renders. It is not permission to publish an untranslated page: the
  `noindex` guard in T-08 is what keeps those out of the index.
- Do not reach for `next-intl` or similar. The locale is in the URL and the
  strings resolve on the server (AGENT.md section 9).

## Found while building

**Static rendering forced a design decision.** Resolving the locale at
request time — from a header set by a proxy, or from `searchParams` — makes
every page render per request. Measured: the home page went from `○` to `ƒ`
the moment the layout called `headers()`, which breaks AGENT.md 5.1. The
answer is one thin plain-word folder per locale, so the locale is a
**build-time constant**: `landing-page/` renders `LocaleLayout locale="vi"`,
`landing-page-en/` renders `locale="en"`, and both are `○` again. This
resolves the open question in `Design.md` section 5a.

The cost is one folder per locale per route, re-exporting a shared
implementation — 5 routes becomes 10 folders by T-23. Every route added from
here needs its folder and its rewrite rule in both locales.

**Payload resolves the API language to `en` regardless of configuration.**
`getRequestLanguage` documents cookie → `Accept-Language` →
`i18n.fallbackLanguage`, but a REST request reports `req.i18n.language ===
'en'` with a `payload-lng=vi` cookie, with `Accept-Language: vi`, and with
neither, even with `fallbackLanguage: 'vi'` and
`supportedLanguages: { en, vi }` set. Measured by instrumenting
`adminMessage`.

Consequences, neither of them a correctness problem:
- Collection labels still work — the panel renders the `en` half of each
  `{ vi, en }` pair, which is the pair mechanism doing its job.
- Hook messages reach the caller in English rather than Vietnamese. The
  strings are no longer hardcoded, so this becomes right as soon as the
  language resolves; nothing needs rewriting.
- The e2e specs accept either translation rather than asserting a language
  that cannot currently be selected.

**Unresolved**, and worth a look before T-24 writes the handover: whether the
admin UI in a real browser resolves Vietnamese (it sends `Accept-Language:
vi-VN` and the panel sets its own cookie), or whether the panel is English
for everyone. Only a browser can answer it.

## Flags

- **English copy for the admin labels is new user-facing text.** The
  Vietnamese already exists and is quoted in `Design.md` section 2.3; write
  the English yourself where it is mechanical (`Vai trò` → `Role`), and use
  `TODO(copy)` for anything that is a judgement call.
- **Static generation is unresolved** and this task makes it sharper: see
  `Design.md` section 5a. Raise it before T-09 rather than inside T-10.
