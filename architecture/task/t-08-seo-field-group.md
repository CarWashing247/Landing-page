# T-08 · SEO field group

| | |
| --- | --- |
| Phase | 2 — Content and SEO |
| Branch | `t-08-seo-field-group` |
| Depends on | T-06, T-07 |
| Blocks | T-09 |
| Critical path | **yes** |

## Goal

The SEO tab a non-technical editor will actually use: Vietnamese labels, a
live Google-style preview, and character counters that warn before the
title gets truncated in results. This is the task that delivers project
goal 2 — editing SEO without a developer and without a deploy.

## Scope

**In scope**

- Install and configure `@payloadcms/plugin-seo` on `Pages` and `Services`.
- The field group per Design.md section 2.3:

| Field | Type | Vietnamese label |
| --- | --- | --- |
| `meta.title` | text, max 70 | Tiêu đề trên Google — 50 đến 60 ký tự |
| `meta.description` | textarea, max 180 | Mô tả dưới tiêu đề — 140 đến 160 ký tự |
| `meta.image` | upload | Ảnh khi chia sẻ lên Facebook/Zalo — 1200×630 |
| `meta.canonical` | text | Để trống nếu không biết — hệ thống tự điền |
| `meta.noindex` | checkbox | Ẩn trang này khỏi Google |
| `meta.keywordFocus` | text | Từ khoá chính — chỉ để ghi nhớ, không ảnh hưởng thứ hạng |

- The three custom fields beyond what the plugin ships: `canonical`,
  `noindex`, `keywordFocus`.
- The whole group moved into its own **tab**, visually separate from the
  content tab (AGENT.md 5.6).
- Character counters that warn past 60 (title) and 160 (description), while
  the hard `maxLength` stays at 70 / 180.

**Out of scope**

- Consuming any of these fields (T-09). Fallback logic belongs in
  `buildMetadata()`, **not** in the CMS — a blank field must stay blank
  here so the builder can decide.

## Steps

1. Install `@payloadcms/plugin-seo`; enable `generateTitle`,
   `generateDescription` and the preview for both collections.
2. Convert `Pages` and `Services` to a `tabs` layout: `Nội dung` (content)
   and `SEO`.
3. Add the three custom fields into the plugin's group.
4. Write the Vietnamese `label` and `admin.description` for each field
   exactly as tabled above — the wording is the deliverable, not decoration.
5. Set `maxLength` 70 / 180 and configure the plugin's counters to warn at
   60 / 160.
6. Give `meta.canonical` an `admin.description` making clear that blank is
   the normal case.
7. `npm run generate:importmap` — **not optional.** The plugin's fields are
   custom client components, and without an import-map entry they render as
   plain inputs: no counters, no preview, and the task silently unmet. Found by
   checking the served edit screen rather than trusting the config.
8. `npx payload generate:types`, migration, apply.

## Files

```
src/collections/Pages.ts
src/collections/Services.ts
src/fields/seo.ts               # the shared group, defined once
src/payload.config.ts
src/payload-types.ts            # generated
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] An editor sees a live Google-style preview of title + description.
- [ ] The counter warns past 60 characters on title and past 160 on
      description, and hard-stops at 70 / 180.
- [ ] The SEO tab is a separate tab from the content tab on both
      collections.
- [ ] All six fields carry the Vietnamese labels above.
- [ ] `meta.image` accepts only Media, and the og size is available.
- [ ] The group is defined **once** and imported by both collections — no
      duplicated field array.
- [ ] No fallback or defaulting logic lives in the CMS config. The one write
      the CMS does perform is the `noindex` guardrail below, which stores a real
      value rather than defaulting a rendered one.
- [ ] An untranslated non-default locale is forced to `noindex`, and filling in
      its SEO title or description makes it indexable again. A Vietnamese page
      with an empty SEO tab is **not** touched.

## Verification

```bash
npx payload generate:types && npm run typecheck
grep -n "meta" src/payload-types.ts | head -20
# then, by hand in /admin:
#  - open a Page, confirm two tabs
#  - type 65 chars into meta.title, confirm the warning
#  - confirm the preview updates as you type
```

## Notes

- Counters warn, `maxLength` blocks. Warning at 60 while allowing 70 is
  deliberate: Google truncates around 60 but a slightly longer title is a
  judgement call, not an error.
- **Those are two numbers from one field, and the plugin couples them.** Its
  counter takes its green band straight from the field's own
  `minLength`/`maxLength` (`MetaTitleComponent.js` reads `field.maxLength`),
  and Payload enforces that same `maxLength` as a hard limit. So `maxLength` is
  set to the *counter's* number (60 / 160) and the real limit (70 / 180) is
  enforced by `validate`, relying on a supplied `validate` replacing Payload's
  default field validation. The consequence to know: **`maxLength` on these two
  fields does not block.** Deleting the `validate` tightens the limit to the
  counter's number rather than removing it, which is the safe direction for a
  mistake to fall.
- `keywordFocus` is never rendered. Its only job is to stop two editors
  writing two pages against the same term (Design.md section 3).
- **Two Payload behaviours shape the `noindex` guardrail, and both are
  invisible from the config.**
  - `data.meta` in a `beforeChange` hook is the **whole merged group**, not the
    editor's delta: Payload folds the stored document into it first, so every
    key is always present and `'noindex' in data.meta` says nothing about what
    was touched. Logic built on key presence reads a stored value as a fresh
    decision — which is how a first attempt at this guardrail left the auto-flag
    permanently on. Compare against a separate read of the stored row instead.
  - Overriding a plugin field's `admin` **replaces** `admin.components`, which
    silently unmounts the plugin's own React component. `MetaImageComponent`
    vanished from the import map that way. Merge `admin` and carry `components`
    across.
- **Overriding a plugin field needs the import map regenerated**, and the
  generated file is the only place the omission is visible — the config still
  looks right.

## Flags

- The six Vietnamese labels are given verbatim in Design.md — use them as
  written. Any *additional* helper text you add is new user-facing copy:
  write `TODO(copy)` if unsure.
- **The `noindex` guardrail from Design.md 2.3 is scoped to non-default
  locales, which Design.md does not say.** Read literally — "forces
  `meta.noindex` on for a locale whose `meta.title` and `meta.description` are
  both empty" — it fires on every Vietnamese page too, because an empty SEO tab
  is the normal state there: Design.md 2.3 itself says a page must ship fine
  with the editor never opening it, and `buildMetadata()` fills the gap.
  Unscoped, it would de-index the entire site one page at a time. The default
  locale is therefore exempt.
- This task file's scope omitted the guardrail entirely; Design.md 2.3 owns it
  and T-13 depends on it, so it is delivered here. It is not a *fallback* — it
  writes a stored value rather than deciding a rendered one — so it does not
  contradict the out-of-scope rule above it.
- `src/fields/seo.ts` establishes `src/fields/`. `src/lib/slug-field.ts` (T-07)
  is the same kind of thing and arguably belongs beside it; left where it is
  rather than moved as a drive-by.
