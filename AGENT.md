# AGENT.md

Instructions for any AI coding agent working in this repository.
This is the single source of truth. `CLAUDE.md` points here.

---

## 1. What this project is

**AutoWash247 landing page** — a marketing site for an automated car-wash
service in Hanoi, Vietnam.

Two goals drive every decision in this repo:

1. **Search engines and social crawlers must get complete HTML on the first
   request.** Googlebot, Facebook, Zalo and Coc Coc all read this site.
   Zalo and Coc Coc do not execute JavaScript.
2. **Non-technical staff must be able to edit SEO metadata without a
   developer and without a deploy.**

If a change you are about to make conflicts with either goal, stop and raise
it instead of working around it.

**The site ships in Vietnamese and English.** Vietnamese is the default
locale and the primary market, served unprefixed (`/bang-gia`); English is
served under `/en` (`/en/pricing`). Code, comments, commit messages,
identifiers and documentation are English.

**Never machine-translate user-facing copy, in either direction.** Leave a
`TODO(copy): <gist>` marker and say so. An English page produced by running
the Vietnamese through a translator reads as machine output to the exact
audience it is meant to win. An untranslated locale stays `noindex` rather
than shipping filler — see `Design.md` section 2.3.

---

## 2. Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router) |
| Localization | Payload `localization` (`vi` default, `en`) + a typed message catalog |
| CMS | Payload CMS, mounted inside the same Next.js app |
| SEO fields | `@payloadcms/plugin-seo` |
| Database | PostgreSQL via `@payloadcms/db-postgres` |
| Media | Cloudflare R2 (S3-compatible) via `@payloadcms/storage-s3` |
| Secrets | HashiCorp Vault (HCP Dedicated), AppRole auth, read at init |
| Styling | Tailwind CSS |
| Forms | React Hook Form + Zod |
| Hosting | Vercel |
| Language | TypeScript, `strict: true` |

One repo, one deploy, one domain. The CMS is **not** a separate service.

---

## 3. Commands

```bash
npm install
npm run dev                   # Next.js + Payload admin on :3000
npm run build                 # production build; must pass before any PR
npm run lint                  # eslint, zero warnings allowed
npm run typecheck             # tsc --noEmit
npx payload generate:types    # REQUIRED after any collection/global change
npx payload migrate:create    # REQUIRED after any schema change
npx payload migrate           # apply migrations locally
npm test                      # vitest
npm run test:e2e              # playwright

docker compose up -d          # local Postgres + Vault
./scripts/vault-seed.sh       # populate the local Vault dev path (T-04B)
```

`npx payload generate:types` writes `src/payload-types.ts`. That file is
generated — never hand-edit it, and always commit it alongside the config
change that produced it.

The Postgres adapter runs with `push: false`, so `npm run dev` does **not**
sync schema changes to the database. After a collection or global change, run
`migrate:create` then `migrate`, or the new columns will not exist. This keeps
development identical to deployed environments; with push enabled,
`payload migrate` refuses to run without a data-loss prompt because it cannot
tell what the push already applied.

**Vault must be reachable for anything that loads the Payload config** —
`dev`, `build`, `migrate` and `generate:types` all do, because the config
reads `PAYLOAD_SECRET`. Locally that means `docker compose up -d` and a
seeded dev path before the first build; see section 7.

---

## 4. Repository layout

```
src/
  app/
    landing-page/           # locale vi — layout passes locale="vi"
    landing-page-en/        # locale en — one thin folder per locale so the
                            # locale is a build-time constant and pages stay
                            # statically prerendered
      layout.tsx            # renders LocaleLayout; metadataBase lands in T-09
      page.tsx              # home
      [slug]/page.tsx       # CMS pages
      dich-vu/[slug]/page.tsx
      sitemap.ts
      robots.ts
      opengraph-image.tsx
    crm/
      layout.tsx            # Payload admin shell; does NOT import globals.css
      admin/segements/page.tsx
      admin/adminParams.ts  # decodes path depth from the rewrite
      admin/importMap.js    # GENERATED
      api/slug/route.ts
    global-not-found.tsx    # 404 for unmatched URLs; there is no single root layout
    api/
      revalidate/route.ts   # webhook target for Payload afterChange hooks
      draft/route.ts        # enables draftMode() for CMS preview
  collections/
    Pages.ts  Services.ts  Media.ts  Users.ts
  globals/
    BusinessInfo.ts  SiteSettings.ts
  components/
    seo/metadata.ts         # buildMetadata() — the ONLY place metadata is built
    seo/JsonLd.tsx
    blocks/                 # Hero, Pricing, Steps, Faq, Cta
    ui/
  lib/
    payload.ts  cache-tags.ts
    secrets.ts              # loadSecrets() — the ONLY place a credential is read
    env.ts                  # requireEnv() — non-secret config only
    log.ts                  # logger() — the ONLY place a log line is written
    slugify.ts              # title -> slug, Vietnamese-aware
    slug-field.ts           # the localized, published-locked slug field,
                            # shared by Pages and Services
  payload.config.ts
  payload-types.ts          # GENERATED
```

`landing-page` and `crm` are plain folders, so Next.js would normally put them
in the URL. The rewrites in `next.config.mjs` map the public paths (`/`,
`/admin/**`, `/api/**`) onto them, and redirects send the internal paths back
out so no page is reachable at two URLs.

Path depth cannot be expressed by a plain folder name: the admin reads it from
the `__p` query parameter the rewrite adds, and the REST API reads it from the
request path. Both live in `src/app/crm/admin/adminParams.ts`.

**Renaming or moving anything under `src/app/` means changing
`next.config.mjs` in the same commit.** The filesystem no longer determines
the URLs.

---

## 5. Non-negotiable rules

Violating any of these silently breaks the two project goals. They are not
style preferences.

### 5.1 Rendering

- Every public page is statically generated. Any dynamic route **must**
  export `generateStaticParams()` returning slugs from the CMS.
- Do not add `export const dynamic = 'force-dynamic'` to a public page.
- Do not fetch page content in a client component or in `useEffect`.
  Content must be in the server-rendered HTML.
- `'use client'` is allowed only for genuine interactivity (menu toggle,
  form state, carousel). Keep it at the leaves of the tree.

### 5.2 Metadata

- Every route with content exports `generateMetadata()`.
- `generateMetadata()` **always** delegates to `buildMetadata()` in
  `src/components/seo/metadata.ts`. Never assemble a `Metadata` object
  inline in a page file.
- `metadataBase` is declared once, in the frontend root layout. Without it,
  Open Graph image URLs are relative and Facebook/Zalo silently fail to
  pull the image.
- Exactly one `<h1>` per page.
- `openGraph.locale` matches the rendered locale: `vi_VN` or `en_US`.
- Every content route emits `alternates.languages` for both locales plus
  `x-default` pointing at Vietnamese. A page that exists in one locale and
  not the other must not advertise a `hreflang` to a URL that 404s.

### 5.3 Caching and revalidation

- Every Payload query that feeds a page is cached under a tag and a
  revalidate floor. Tag strings come from `src/lib/cache-tags.ts` — never
  inline a tag literal.
- **Page and service tags include the locale** (`page:<locale>:<slug>`).
  Publishing an English edit must not purge the cached Vietnamese page.
- The `revalidate: 3600` floor is a safety net for a failed webhook.
  Do not remove it.
- `afterChange` hooks send both `doc.slug` and `previousDoc?.slug` so a
  renamed page purges its old URL too.
- `/api/revalidate` verifies `REVALIDATE_SECRET` before doing anything and
  returns 401 otherwise.

### 5.4 Structured data

- JSON-LD is built from the `BusinessInfo` global, never from hardcoded
  values. Name, address and phone must be byte-identical to what is in
  Google Business Profile, and are therefore **not** localized — a
  translated street address is wrong in both languages.
- Every emitted schema carries `inLanguage` for the rendered locale.
- Home page emits `AutoWash`. Service pages add `Service` + `Offer`.
  Pages with an FAQ block add `FAQPage`.
- After changing any JSON-LD shape, validate against Google's Rich Results
  Test before considering the task done.

### 5.5 Images and performance

- All images go through `next/image`. No bare `<img>`.
- The hero image on each page gets `priority`; everything below the fold
  is lazy.
- `alt` is a required field on the `Media` collection. Do not make it
  optional "for now".
- Fonts load through `next/font` with `display: 'swap'` and the
  `vietnamese` subset.
- Target: mobile Lighthouse performance and SEO both at 90 or above.
  Check before marking a UI task done.

### 5.6 CMS authoring experience

- Every field has a `label` and, where the purpose is not obvious, an
  `admin.description` — each a `{ vi, en }` pair, never a bare string. The
  audience cannot read `canonical` and infer what it does.
- A hook that refuses an operation resolves its message through `req.t`
  against the registered translations, and throws
  `APIError(message, 400, null, true)`. A bare `throw new Error` surfaces as
  a 500 `"Something went wrong."` and the reason never reaches the editor.
- Which fields are `localized` is a schema decision, not a preference:
  Payload stores localized values separately, so changing it later is a
  migration. `Design.md` section 2.1 is the list.
- SEO fields live in their own tab, separate from the content tab.
- Prefer a guardrail in the config over a line in a handover document:
  `required`, `maxLength`, `readOnly`, `admin.condition`, access control.
- `editor` role has read and update on `Pages`, `Services` and `Media`.
  No delete, no user management.
- `slug` becomes `readOnly` once `_status` is `published`. Changing a
  published slug breaks indexed URLs.

### 5.7 Secrets

- **Every credential is read from Vault, once, at process init** — through
  `loadSecrets()` in `src/lib/secrets.ts` and nowhere else. A credential
  read with `process.env` is a bug even when it works.
- The env side holds only what Vault cannot: `DATABASE_URI`,
  `NEXT_PUBLIC_SITE_URL`, `R2_PUBLIC_URL`, `MEDIA_LOCAL_DISK` and the Vault
  bootstrap itself. Section 7 is the list, and it is exhaustive.
- A `NEXT_PUBLIC_*` variable can **never** come from Vault. It is inlined
  into the client bundle at build time, which also means nothing secret may
  ever be given a `NEXT_PUBLIC_` name.
- Missing or unreachable Vault **fails the boot**. Never fall back to a
  default, a placeholder or `process.env` — an app that boots with a
  guessable `PAYLOAD_SECRET` issues valid-looking sessions and says nothing.
- Never log a secret, and never put one in an error message or a thrown
  error's context. Report the *key name* that is missing, never its value.
- Rotation takes effect on the next cold start, not immediately.
  **Redeploy straight after rotating** or instances disagree about what a
  valid session is.

### 5.8 Logging

Every log line goes through `logger()` in `src/lib/log.ts` and has exactly
this shape. `console.log` and bare `console.error` in application code are a
bug, because they bypass the format, the level filter and the redaction.

```
[2026-10-04T12:45:13.482Z] [203.0.113.7] [INFO] [POST /api/revalidate] purged tag=page:vi:bang-gia
[2026-10-04T12:45:13.901Z] [-]           [INFO] [vault:login] connected addr=https://…hashicorp.cloud:8200
[2026-10-04T12:45:14.112Z] [-]           [ERROR] [vault:login] refused status=403 hint=namespace
```

| Field | Rule |
| --- | --- |
| timestamp | ISO 8601, UTC, milliseconds. Never local time — the deploy, the database and Vault are in three different zones |
| source IP | First hop of `x-forwarded-for`. **`-` when there is no request**: module init, `next build`, `payload migrate`, a cron |
| level | `DEBUG`, `INFO` or `ERROR`, upper case |
| action | `METHOD /path` for anything serving a request, `module:operation` otherwise (`vault:login`, `r2:upload`) |
| content | One short clause, then `key=value` pairs. Values are scalars, never an object or a request body |

**Where it is mandatory.** Not everywhere — a rule that says "every
function" produces noise that buries the one line that mattered:

- Every route handler, at entry and at outcome.
- Every Payload hook that changes data or authenticates.
- **Every reach outside this process, on success as well as failure** — the
  Vault round trip, and the resolved target of anything that stores data
  (database host, media backend). A dependency that only logs when it breaks
  cannot tell you whether it ever worked.
  Log what this code can actually observe: `loadSecrets()` performs the Vault
  request itself and logs it, whereas Postgres is connected by Payload's
  adapter, so what is observable here is the configuration it was handed, not
  a socket.
- Every rejected request: a 401, a 403, a refused login.

Everywhere else `log.debug()` is optional and silent unless
`LOG_LEVEL=debug`. Pure functions — `FOLDER_FOR()`, `buildMetadata()`,
`pageTag()` — log nothing at all.

`resolveR2Config()` is the exception that proves the boundary rule rather
than the purity one: it opens no connection, but it decides whether uploads
go to R2 or to a filesystem that does not survive a deployment, and that
decision silently taken is the failure T-04B exists to prevent. It logs the
decision, once.

**Never from a page or a layout.** Reading the source IP needs `headers()`,
and that makes the route `ƒ`, which breaks 5.1. Logging lives in route
handlers, hooks and library code, never in a rendered component.

**Never log a credential, a session token, a password or a full request
body**, and that includes inside an `Error` passed to `log.error()`. Section
5.7 is the rule; this is where it is most easily broken, because the
convenient thing to log is the object that holds the secret. A source IP is
personal data under Decree 13/2023 — it earns its place in the line because
it is what makes an abusive caller identifiable, but it is a reason not to
log more than the format calls for.

---

## 6. Conventions

- TypeScript strict. No `any`. Use generated types from `payload-types.ts`.
- Named exports except for Next.js files that require a default export
  (pages, layouts, route handlers).
- Server Components by default.
- Tailwind utility classes only. No `@apply` beyond `globals.css`, no
  runtime CSS-in-JS.
- Slugs are localized, unaccented, lowercase and hyphenated: `bang-gia` and
  `pricing`, `dich-vu/rua-xe-nhanh` and `services/quick-wash`.
- No user-facing string literal in a component. Interface text comes from
  the message catalog; content comes from the CMS. A missing catalog key is
  a type error, not a blank on the page.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`.
- Secrets come from Vault, via `loadSecrets()` — never `process.env`, and
  never committed. Non-secret config comes from the environment via
  `requireEnv()`. Section 5.7 and section 7 are the contract.

---

## 7. Configuration and secrets

Two sources, and which one a value comes from depends on **when it is
needed**, not on how sensitive it is.

### 7.1 Environment variables

Everything here is either not a credential, or is required before Vault can
be reached. This list is exhaustive: a new variable that is a credential
belongs in Vault, not here.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URI` | Postgres connection string. Per-environment infrastructure config; also needed by `payload migrate` in the deploy's build step |
| `NEXT_PUBLIC_SITE_URL` | `metadataBase`, canonical URLs, sitemap. `NEXT_PUBLIC_*` is inlined at build time, so Vault cannot supply it |
| `R2_PUBLIC_URL` | Public base URL images are served from; feeds `images.remotePatterns` in `next.config.mjs` at build time. A CDN hostname, not a credential |
| `MEDIA_LOCAL_DISK` | Development only: store uploads on disk instead of R2 |
| `LOG_LEVEL` | `debug`, `info` or `error`. Optional; defaults to `info`. `debug` is for a local machine, not a deployed environment |
| `VAULT_ADDR` | Vault cluster URL |
| `VAULT_NAMESPACE` | `admin` on HCP Vault. Omitting it 403s every read, with a message that does not mention namespaces |
| `VAULT_SECRET_PATH` | KV v2 path for this environment, e.g. `kv/autowash247/production` |
| `VAULT_ROLE_ID` / `VAULT_SECRET_ID` | AppRole bootstrap credential. **The one secret that cannot live in Vault** — a secret store cannot hold the key to itself |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | Optional: a local admin account for the login specs in `e2e/` |
| `E2E_EDITOR_EMAIL` / `E2E_EDITOR_PASSWORD` | Optional: a local editor account for the access-control specs |

Add any new variable to `.env.example` in the same commit.

### 7.2 Vault

One KV v2 secret per environment, read once at process init by
`loadSecrets()` in `src/lib/secrets.ts`. Keys are named identically to the
variables they replaced, so `grep` still finds every consumer.

| Key | Used by |
| --- | --- |
| `PAYLOAD_SECRET` | `payload.config.ts` — signs admin session JWTs |
| `REVALIDATE_SECRET` | `/api/revalidate` (T-11) |
| `PREVIEW_SECRET` | `/api/draft` (T-12) |
| `R2_BUCKET` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ENDPOINT` | Media storage, via `resolveR2Config()` |

```
kv/autowash247/production     kv/autowash247/preview     kv/autowash247/development
```

One AppRole per path, each with read on its own path and nothing else — a
leaked preview role must not read production. `PAYLOAD_SECRET`,
`REVALIDATE_SECRET` and `PREVIEW_SECRET` differ per environment: a shared
`PAYLOAD_SECRET` means a session minted in preview is valid in production.

Adding a credential means adding it to the table above, to the loader's
validation, and to all three Vault paths — **not** to `.env.example`.

Local development uses the same code path, against the Vault in
`docker-compose.yml`:

```bash
docker compose up -d && ./scripts/vault-seed.sh
```

See [`architecture/task/t-04b-vault-secrets.md`](./architecture/task/t-04b-vault-secrets.md)
for the layout, the rotation procedure and the consequences.

## 8. Definition of done

A task is complete when all of these hold:

- [ ] `npm run lint`, `npm run typecheck` and `npm run build` pass
- [ ] `npx payload generate:types` run and `payload-types.ts` committed,
      if the Payload config changed
- [ ] A migration exists, if the schema changed
- [ ] Page source (`view-source:`, not devtools) shows the expected
      `<title>`, `<meta name="description">`, `og:*` tags, `hreflang`
      alternates and JSON-LD — checked in **both locales** for any route the
      change touches
- [ ] The new or changed page appears in `/sitemap.xml`, unless it is
      `noindex` or draft
- [ ] No new `'use client'` above a leaf component
- [ ] `.env.example` updated, if a non-secret variable was added
- [ ] A new credential was added to Vault in all three environments and to
      the loader's validation — and **not** to `.env.example`
- [ ] No secret appears in a log line, an error message or the client
      bundle
- [ ] Every route handler, hook and external connection the change touches
      logs through `logger()` in the section 5.8 format — connections on
      success as well as failure

---

## 9. Do not

- Do not install a second CMS, headless UI kit or state manager.
- Do not add a UI library that ships its own CSS reset.
- Do not use `localStorage` or `sessionStorage` for anything that affects
  rendered content — including the chosen locale. The locale is in the URL,
  so a crawler and a visitor see the same page.
- Do not add a client-side i18n runtime (`next-intl`, `react-i18next`, …).
  Interface strings resolve on the server, because Zalo and Coc Coc do not
  execute JavaScript.
- Do not hardcode business details (address, phone, opening hours, prices)
  anywhere in components — they belong in `BusinessInfo` or `Services`.
- Do not add a `keywords` meta tag. Search engines ignore it.
- Do not build booking, payment, customer accounts or PLC integration in
  this repo. That is a separate backend; this site links out to it.
- Do not add tracking scripts beyond GA4 without raising it first — each
  one costs LCP.
- Do not read a credential from `process.env`, add one to `.env.example`,
  or give one a `NEXT_PUBLIC_` name. Section 5.7.
- Do not add a fallback for an unreachable Vault. Failing to boot is the
  correct behaviour.
