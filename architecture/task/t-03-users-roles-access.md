# T-03 · Users, roles and access control

| | |
| --- | --- |
| Phase | 1 — Foundation |
| Branch | `t-03-users-roles-access` |
| Depends on | T-01 |
| Blocks | T-22 |
| Critical path | no — parallel with T-02, T-04 |

## Goal

Two roles, `admin` and `editor`, enforced in the Payload config rather than
in a handover document. The editor persona in this project is a
non-technical staff member; the access rules are what make it safe to hand
them a login.

## Scope

**In scope**

- `Users.role` select field: `admin` | `editor`, `required`, default
  `editor`, Vietnamese labels.
- Access control functions in `src/lib/access/` (or colocated), reused
  across collections rather than copy-pasted.
- `editor`: `read` + `update` on `Pages`, `Services`, `Media`, and **no
  `delete`** — exactly as AGENT.md 5.6 and Design.md state.
- `create` for `editor` is **not specified** in either document. Implement
  `read` + `update` + no `delete` as written, and raise `create` as an open
  question in the PR (see Flags) rather than deciding it silently.
- `editor`: no read, create, update or delete on `Users`; the collection is
  hidden from their admin sidebar via `admin.hidden`.
- Only an `admin` may change a user's `role` (field-level access).

**Out of scope**

- Login rate limiting and 2FA (T-22).
- `Pages` / `Services` collections themselves (T-06, T-07) — wire the
  access functions into them in those tasks, or here if they are already
  merged. Say which in the PR.

## Steps

1. Add `role` to `src/collections/Users.ts` with Vietnamese option labels
   (`Quản trị viên`, `Biên tập viên`).
2. Write reusable access helpers: `isAdmin`, `isAdminOrEditor`,
   `isAdminFieldLevel`.
3. Apply to `Users`: `admin` only for every operation,
   `admin.hidden: ({ user }) => user?.role !== 'admin'`, and
   `access` on the `role` field so an editor cannot escalate itself.
4. Apply `delete: isAdmin` and `update: isAdminOrEditor` to `Media`, and to
   `Pages` / `Services` if merged.
5. `npx payload generate:types`, migration, apply.
6. Create one `editor` and one `admin` test account for the verification
   below. Do not commit credentials.

## Files

```
src/collections/Users.ts
src/lib/access/*.ts
src/collections/Media.ts        # access wiring
src/payload-types.ts            # generated
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] An `editor` test account does not see the Users collection in the
      admin sidebar and gets 403 from `/api/users`.
- [ ] An `editor` cannot delete a page or a media item — the delete control
      is absent, and the REST delete returns 403.
- [ ] An `editor` cannot change its own `role`, including via a direct API
      call.
- [ ] An `admin` can do all of the above.
- [ ] Role option labels are Vietnamese.

## Verification

```bash
# log in as each test account, keep the cookie, then:
curl -s -o /dev/null -w 'editor users: %{http_code}\n'  -b editor.cookie  localhost:3000/api/users
curl -s -o /dev/null -w 'admin  users: %{http_code}\n'  -b admin.cookie   localhost:3000/api/users
curl -s -o /dev/null -w 'editor delete: %{http_code}\n' -b editor.cookie -X DELETE localhost:3000/api/media/<id>
curl -s -o /dev/null -w 'editor escalate: %{http_code}\n' -b editor.cookie \
  -X PATCH -H 'content-type: application/json' -d '{"role":"admin"}' localhost:3000/api/users/<editor-id>
```

Expect `403, 200, 403, 403`.

## Notes

- Hiding a collection with `admin.hidden` is cosmetic on its own. The
  `access` functions are the control; the hide is so the editor is not
  confronted with a door that 403s.
- Test the API directly, not just the UI. A control that is only missing
  from the sidebar is not access control.

## Flags

- **`create` for `editor` is unspecified, and it matters for `Media`
  only.** A Payload upload is a `create` on `Media`, so an editor with
  `update` on `Pages` but no `create` on `Media` can change a page's text
  and not its images — which makes goal 2 half-true. Withholding `create`
  on `Pages` and `Services` is deliberate and should stay: a new route is a
  keyword-map decision (Design.md section 3), not a content edit.
  Implement the documented permissions, grant `create` on `Media` only, and
  note the asymmetry in the PR. Do not change `Design.md` or `AGENT.md`
  here.
- `delete` stays `admin`-only, and that costs an editor nothing: drafts are
  enabled, so unpublishing is an `update` on `_status` they already have,
  and T-13 drops unpublished documents from the sitemap. Point editors at
  unpublish rather than asking for delete.
