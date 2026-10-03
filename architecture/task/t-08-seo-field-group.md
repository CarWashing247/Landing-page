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
7. `npx payload generate:types`, migration, apply.

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
- [ ] No fallback or defaulting logic lives in the CMS config.

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
- `keywordFocus` is never rendered. Its only job is to stop two editors
  writing two pages against the same term (Design.md section 3).

## Flags

- The six Vietnamese labels are given verbatim in Design.md — use them as
  written. Any *additional* helper text you add is new user-facing copy:
  write `TODO(copy)` if unsure.
