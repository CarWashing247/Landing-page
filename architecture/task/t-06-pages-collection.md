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
- `slug` becomes read-only once `_status` is `published`, in two places,
  because neither alone is enough: field-level `access.update` for the admin
  UI and the write, **and** a `beforeValidate` guard for the error message.
  (`admin.readOnly` is typed `boolean`, not a condition function — verified in
  `node_modules/payload/dist/fields/config/types.d.ts`. Field-level
  `access.update` is the mechanism that makes the admin render a field
  read-only *and* rejects the write; a denied field is silently dropped, so
  the hook is what turns that into a 4xx an editor can read.)
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
4. Implement the published-slug lock in two places: field-level
   `access.update` for the UI and the write, and a `beforeValidate` field hook
   that rejects a change when the existing document is published. Three traps,
   all found by testing rather than reading:
   - **Compare against the slug stored for *this locale*, with the fallback
     off.** `localization.fallback` is on, so reading a page in English
     returns the Vietnamese slug where English has none; comparing against
     that makes a first English slug look like an edit, and a page published
     in Vietnamese can then never be given its English URL at all.
   - **Allow the first value in a locale.** Same cause, stated as a rule: a
     locale with no slug yet is a translation being written, not a URL being
     changed.
   - **Exempt version restore** (`req.context.isRestoringVersion`). A denied
     field is *stripped*, so refusing the slug during a restore leaves it
     empty and `required` fails the whole operation — rolling back a published
     page answers 400 naming a field the editor never touched.
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
- [ ] Drafts are not returned to an anonymous caller — by any query, including
      `draft=true` and an explicit `where[_status][equals]=draft`, and a draft
      fetched by id is a 404. (Payload's `draft` flag chooses which *version* to
      return; it does not filter by status, so the guarantee comes from the read
      access filter, not from the flag.)
- [ ] A published page can still be given its first slug in the other locale,
      and rolled back from the Versions tab.
- [ ] The same slug may exist once per locale, not twice within one.

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
- **`title`, `slug` and `layout` are localized.** This Note previously said
  the opposite — that Vietnamese/English was a future extension — and it was
  written before T-04A landed. Design.md 2.1 marks all three `L` and says
  plainly that localization is why T-04A precedes this task; 1.1a adds that
  slugs in particular are localized, because `bang-gia` and `pricing` are
  separate documents' worth of keyword value rather than translations of each
  other. Localized storage is a schema decision, so getting this wrong here is
  a migration later, not an edit.

## Flags

- **`layout` ships with a single `content` rich-text block.** T-17 owns the
  real set. An empty `blocks: []` type-checks and then hands an editor a
  content field with nothing to put in it, so neither the layout nor T-23's
  seed data could be exercised before T-17 lands. Rich text survives whatever
  T-17 decides, so it is not throwaway.
- Restoring a version created *before* a locale existed fails validation,
  because `slug` is `required` and that version has no value for the new
  locale. Correct — the old state is genuinely invalid now — but the message
  only names the field. Affects T-07 identically.
