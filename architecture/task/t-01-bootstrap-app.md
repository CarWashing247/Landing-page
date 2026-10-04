# T-01 · Bootstrap the app

| | |
| --- | --- |
| Phase | 1 — Foundation |
| Branch | `t-01-bootstrap-app` |
| Depends on | nothing |
| Blocks | T-02, T-03, T-04, T-06 |
| Critical path | **yes** |

## Goal

One Next.js App Router deploy with Payload CMS mounted in-process and
Postgres behind it. Nothing else. This task exists so that every later
task has a place to put its code and a working `/admin` to click in.

## Scope

**In scope**

- Next.js (App Router) + TypeScript `strict: true`.
- Payload mounted inside the same app — `crm/admin/segements/page.tsx`
  and `crm/api/slug/route.ts`.
- `@payloadcms/db-postgres` adapter wired to `DATABASE_URI`.
- Plain `landing-page` and `crm` folders, each with its own root layout, and
  a placeholder `landing-page/page.tsx`; `landing-page/layout.tsx` declares
  `<html lang="vi">`.
- A rewrite layer in `next.config.mjs` mapping `/`, `/admin/**` and
  `/api/**` onto those folders, with redirects so the internal paths are not
  reachable a second time (see AGENT.md section 4).
- `app/global-not-found.tsx`, so unmatched URLs still render
  `<html lang="vi">`.
- GraphQL disabled (`graphQL.disable`) — unused, and otherwise a public
  playground and a second login path.
- Tailwind CSS installed with `globals.css`.
- `Users` collection in its minimal form (email + password) so admin login
  works — roles come in T-03.
- `src/lib/payload.ts` exposing a single `getPayload()` helper.
- `.env.example` with every variable from AGENT.md section 7.1.
  **After T-04B**, credentials live in Vault (section 7.2) and must not
  appear in `.env.example` at all.
- Scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`.

**Out of scope**

- Media / R2 (T-02), roles (T-03), Vercel (T-04).
- Any content collection, any block, any SEO field.
- Styling beyond what Tailwind's install requires.

## Steps

1. Scaffold the Next.js app at the repo root, matching the layout in
   AGENT.md section 4. Do not invent extra top-level folders.
2. Install Payload + `@payloadcms/db-postgres` + `@payloadcms/next`.
3. Write `src/payload.config.ts`: Postgres adapter, `PAYLOAD_SECRET`,
   `admin.user: 'users'`, `typescript.outputFile` pointing at
   `src/payload-types.ts`.
4. Add the `crm` admin page and API route. They wrap Payload's handlers
   rather than re-export them: plain folders supply no route params, so
   `src/app/crm/admin/adminParams.ts` rebuilds `segments` (from `__p`) and
   `slug` (from the request path). Add the matching rewrites and redirects.
5. Add `landing-page/layout.tsx` with `lang="vi"` and a placeholder
   `landing-page/page.tsx`.
6. Configure Tailwind; keep `globals.css` to directives plus a reset-free
   base.
7. Run `npx payload generate:types` and commit `src/payload-types.ts`.
8. Create the initial migration with `npx payload migrate:create` and
   apply it locally.

## Files

```
package.json  tsconfig.json  next.config.mjs  .env.example
playwright.config.ts  vitest.config.ts
e2e/routing.spec.ts             # smoke test for the rewrite layer
src/payload.config.ts
src/payload-types.ts            # generated
src/collections/Users.ts
src/lib/payload.ts
src/app/landing-page/layout.tsx
src/app/landing-page/page.tsx
src/app/global-not-found.tsx
src/app/crm/layout.tsx
src/app/crm/admin/segements/page.tsx
src/app/crm/admin/segements/not-found.tsx
src/app/crm/admin/adminParams.ts
src/app/crm/admin/adminParams.test.ts
src/app/crm/admin/importMap.js  # generated
src/app/crm/api/slug/route.ts
src/app/globals.css
src/lib/env.ts                  # requireEnv(): fail at load, not at first request
src/lib/env.test.ts
src/migrations/                 # generated
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] `npm run dev` serves a frontend page at `/` and a reachable `/admin`
      login screen.
- [ ] First admin user can be created through `/admin` and can log back in.
- [ ] `npm run build` passes.
- [ ] `.env.example` lists every variable in AGENT.md section 7.1, with a
      comment per variable, and no key that section 7.2 assigns to Vault.
- [ ] `src/payload-types.ts` is committed and not hand-edited.
- [ ] `landing-page` and `crm` do not appear in any URL.

## Verification

```bash
npm run lint && npm run typecheck && npm run build
npm run dev &
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/admin
curl -s localhost:3000/ | grep -o '<html lang="vi"'
```

## Notes

- `src/payload-types.ts` is generated. Always regenerate rather than edit,
  and commit it in the same commit as the config change that produced it.
- Keep `landing-page/page.tsx` genuinely a placeholder. Real home-page
  content is T-23, and building it now means prising metadata out of it in
  T-09.

## Flags

- None expected. If Postgres is not yet provisioned locally, note it and do
  not fall back to SQLite — the adapter choice is fixed in AGENT.md.
