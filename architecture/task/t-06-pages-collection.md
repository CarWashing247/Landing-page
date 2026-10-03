# T-06 · Pages collection

| | |
| --- | --- |
| Phase | 2 — Content and SEO |
| Branch | `t-06-pages-collection` |
| Depends on | T-01 |
| Blocks | T-07, T-08, T-17, T-23 |
| Critical path | **yes** |

## Goal

`Pages` with a blocks-based layout, drafts and version history, and a slug
that locks once published. The slug lock is the point: changing a published
slug breaks indexed URLs, and the CMS should make that hard rather than
recoverable.

## Scope

**In scope**

- `Pages`: `title` (required), `slug` (required, unique, indexed),
  `layout` (blocks field), `_status` via `versions: { drafts: true }`.
- Slug auto-generated from `title` on create, with an unaccented
  lowercase-hyphen transform (`Bảng giá` → `bang-gia`).
- `slug` becomes `readOnly` once `_status` is `published`
  (`admin.readOnly` by condition **and** a `beforeValidate` guard, since an
  admin-only `readOnly` is bypassable via the API).
- Version history with rollback enabled.
- `layout` registered with an empty-for-now block list, or placeholder
  blocks — real blocks are T-17.
- Access control from T-03 wired in, if merged.

**Out of scope**

- The SEO tab (T-08) — leave room for it, do not stub fields that T-08 will
  replace.
- Block components (T-17), routing and `generateStaticParams` (T-09, T-10).

## Steps

1. Write `src/collections/Pages.ts`.
2. Add a `slugify` helper in `src/lib/` that strips Vietnamese diacritics.
   Check `src/lib/` first — do not add a second one.
3. Enable `versions: { drafts: true }` and confirm the Versions tab appears.
4. Implement the published-slug lock in two places: `admin.readOnly` for
   the UI and a `beforeValidate` field hook that rejects a change when the
   existing document is published.
5. Use `admin.useAsTitle: 'title'` and a `defaultColumns` list that is
   useful to an editor (`title`, `slug`, `_status`, `updatedAt`).
6. `npx payload generate:types`, migration, apply.

## Files

```
src/collections/Pages.ts
src/lib/slugify.ts
src/payload.config.ts
src/payload-types.ts            # generated
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] A page can be drafted, published, edited and rolled back from the
      Versions tab.
- [ ] A published page's `slug` field is not editable in the admin UI.
- [ ] A direct REST `PATCH` changing a published page's slug is rejected.
- [ ] Slug generated from a Vietnamese title is unaccented lowercase with
      hyphens.
- [ ] `slug` is unique — a second page with the same slug is rejected.
- [ ] Drafts are not returned by a `draft: false` query.

## Verification

```bash
npm run build
curl -s -o /dev/null -w 'slug change on published: %{http_code}\n' -b admin.cookie \
  -X PATCH -H 'content-type: application/json' -d '{"slug":"doi-slug"}' \
  localhost:3000/api/pages/<published-id>
curl -s 'localhost:3000/api/pages?where[_status][equals]=published' | python3 -m json.tool | grep '"slug"'
```

Expect the PATCH to fail (4xx), and only published slugs in the query.

## Notes

- Version history is what makes the slug lock acceptable to an editor: they
  can undo a content mistake, so they do not need to undo a URL mistake.
- Do not add `localization` here. Vietnamese/English is listed as a future
  extension in Design.md section 6 and changes every query shape.

## Flags

- None expected.
