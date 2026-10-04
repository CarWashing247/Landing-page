# Deployment

How to get this site from an empty Vercel account to a live deploy, and how
to verify it actually works rather than merely builds.

Written for a developer or operator doing this the first time. Follow it in
order: each step assumes the one before it.

> **Why this needs a document.** Two things in this project are not where you
> would expect. Route folders under `src/app` are plain words and the public
> URLs come from rewrites in `next.config.mjs`, so a wrong setting produces a
> green build and a 404 site. And migrations do **not** run automatically —
> the Postgres adapter has `push: false`, so a deploy that skips them starts
> with a schema that does not match the code.

---

## 0. What you are deploying

One Next.js deploy containing both the public site and the CMS, plus three
external dependencies:

| Piece | Where it ends up |
| --- | --- |
| Public site, Vietnamese | `/`, `/bang-gia`, … |
| Public site, English | `/en`, `/en/pricing`, … |
| Payload admin | `/admin` |
| Payload REST API | `/api/**` |
| Content | PostgreSQL (external) |
| Images | Cloudflare R2 (external, public host) |
| Credentials | HashiCorp Vault (external, read at process init) |

See [`architecture/architecture-diagram.md`](../architecture/architecture-diagram.md).

---

## 1. Before you start

You need:

- [ ] A GitHub account with push access to this repository.
- [ ] A Vercel account, with permission to create a project.
- [ ] A PostgreSQL provider. Vercel Postgres, Neon and Supabase all work;
      anything that gives a connection string does.
- [ ] A Cloudflare account with R2 enabled. **R2 requires a payment method
      even on the free tier.**
- [ ] An HCP Vault account with permission to create a cluster. **HCP Vault
      Dedicated is a paid, recurring cost** — confirm it before you start,
      because the app does not boot without a reachable Vault.
- [ ] `node --version` ≥ 20, and the repo installing cleanly with
      `npm install`.

You do **not** need a custom domain to deploy. You do need one before T-21
submits a sitemap, because `NEXT_PUBLIC_SITE_URL` ends up in every canonical
URL and in the sitemap.

---

## 2. Provision PostgreSQL — two databases

Create **two** databases: one for production, one for preview deployments.

```
autowash247-production
autowash247-preview
```

**They must not be the same database.** Preview deploys run against whatever
is in their environment, and an editor clicking Publish in a preview
deployment would otherwise write to live content.

Keep both connection strings. They become `DATABASE_URI` per environment.

Verify a connection string before going further:

```bash
DATABASE_URI='<paste the connection string>' node --input-type=module -e "
import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.DATABASE_URI })
await c.connect()
console.log('connected:', (await c.query('select version()')).rows[0].version.split(' (')[0])
await c.end()
"
```

Run it once per database. `pg` comes with the Payload Postgres adapter, so
`npm install` is the only prerequisite.

Expect a `PostgreSQL <version>` line. If it hangs, the provider is probably
waiting on an IP allow-list.

---

## 3. Provision Cloudflare R2

1. **Create a bucket**, e.g. `autowash247-media`.
2. **Create an API token** scoped to that bucket with *Object Read & Write*.
   Keep the access key id and secret — the secret is shown once.
3. **Note the S3 endpoint**: `https://<account-id>.r2.cloudflarestorage.com`.
   This is for the server, not the browser.
4. **Give the bucket a public URL.** Either enable the managed `r2.dev`
   subdomain or attach a custom domain. This is what browsers and crawlers
   fetch images from, and it is a *different* host from the endpoint above.

Both are needed, and confusing them is the most common mistake here:

| Variable | Example | Used by | Lives in |
| --- | --- | --- | --- |
| `R2_ENDPOINT` | `https://abc123.r2.cloudflarestorage.com` | the server, to upload | Vault |
| `R2_PUBLIC_URL` | `https://media.autowash247.vn` | the browser, to display | environment |

`R2_PUBLIC_URL` is also added to `images.remotePatterns` in
`next.config.mjs`. Without it `next/image` refuses to optimise the image and
the page renders nothing. That build-time read is why it is the one R2
variable that stays an environment variable rather than moving into Vault.

Keep the access key id and secret to hand — they go into Vault in section 5,
not into Vercel.

---

## 4. Create the Vercel project

1. Import this repository in Vercel.
2. Framework preset: **Next.js**. Root directory: the repository root.
3. Leave the build command alone — [`vercel.json`](../vercel.json) sets it to
   `npm run migrate:deploy && npm run build`, so migrations run before the
   build and a schema mismatch fails the deploy instead of reaching users.
4. Do **not** deploy yet. Set up Vault and the environment variables first;
   without them the build fails by design (see section 5). The build loads
   the Payload config, which reads `PAYLOAD_SECRET` from Vault, so Vault has
   to be reachable from Vercel's build container — not only at runtime.

**`migrate:deploy` is what makes an unreachable Vault fail the deploy, and
it has to stay first.** Measured, not assumed: `next build` on its own
*prints* the Vault error and still exits 0, because the pages that need
secrets are the dynamic ones (`ƒ`) and Next.js defers their failure to
request time. The deploy would be green and `/admin` would 500. `payload
migrate` loads the same config and exits 1, so the `&&` is load-bearing:
anything that reorders those two commands, or drops the migration step,
silently takes the fail-closed guarantee with it.

---

## 5. Vault, environment variables and secrets

Two sources, and which one a value comes from depends on **when it is
needed**, not on how sensitive it is. AGENT.md section 7 is the contract;
this section is how to set it up.

### 5.1 Create the Vault cluster

**HCP Vault Dedicated**, because Vercel's build containers and lambdas run
on Vercel's network: Vault has to be reachable over the public internet with
TLS. Self-hosting makes unsealing, certificate renewal and backups your
problem, and an unseal nobody notices means the site can neither build nor
cold-start.

1. Create the cluster. Note its URL — that is `VAULT_ADDR`.
2. `VAULT_NAMESPACE` is `admin` on HCP. **Set it.** Omitted, every read
   returns 403 with a message that never mentions namespaces, which is an
   hour of debugging the wrong thing.
3. Enable a KV **v2** mount at `kv/`. Version 1 silently lacks the
   `kv/data/...` path the loader reads.
4. Create three secrets:

```
kv/autowash247/production
kv/autowash247/preview
kv/autowash247/development     # each developer seeds their own locally
```

Each holds the keys in section 5.3. Generate the three signing secrets
per path, never shared:

```bash
openssl rand -hex 32    # PAYLOAD_SECRET
openssl rand -hex 16    # REVALIDATE_SECRET, PREVIEW_SECRET
```

**`PAYLOAD_SECRET` must differ between environments.** It signs admin
session tokens, so a shared value means a session minted in preview is
accepted in production.

### 5.2 Create one AppRole per environment

One role per path, each with read on its own path and nothing else, so a
leaked preview role cannot read production. Policy shape:

```hcl
path "kv/data/autowash247/production" {
  capabilities = ["read"]
}
```

Record each `role_id` and issue a `secret_id`. Those two are
`VAULT_ROLE_ID` and `VAULT_SECRET_ID`, and they are **the one credential
that cannot live in Vault** — a secret store cannot hold the key to itself.

Verify the scoping by attempting the thing it forbids, rather than by
re-reading the policy:

```bash
# log in with the preview role, then:
curl -H "x-vault-token: $TOKEN" "$VAULT_ADDR/v1/kv/data/autowash247/production"
# expect 403
```

**Before you test a wrong `secret_id` on purpose, know that Vault locks the
role.** Five failed logins against a `role_id` within 15 minutes lock that
`role_id` for 15 minutes, and the lockout then refuses the *correct*
`secret_id` with the same `permission denied`. Fixing the variable and
redeploying appears to change nothing, which is how a 15-minute wait turns
into an hour of looking at the wrong thing. Check and clear it:

```bash
curl -H "x-vault-token: $ROOT_TOKEN" "$VAULT_ADDR/v1/sys/locked-users"
# the alias_identifier it lists is the role_id, not the role name
curl -X POST -H "x-vault-token: $ROOT_TOKEN" \
  "$VAULT_ADDR/v1/sys/locked-users/<mount_accessor>/unlock/<role_id>"
```

The mount accessor comes from `GET /v1/sys/auth` under `approle/`.

### 5.3 What lives where

In Vault, read once at process init by `loadSecrets()`:

| Key | Production | Preview | Notes |
| --- | --- | --- | --- |
| `PAYLOAD_SECRET` | unique | unique | **must differ per environment** |
| `REVALIDATE_SECRET` | unique | unique | T-11 webhook |
| `PREVIEW_SECRET` | unique | unique | T-12 draft preview |
| `R2_BUCKET` | same | same | |
| `R2_ACCESS_KEY_ID` | same | same | |
| `R2_SECRET_ACCESS_KEY` | same | same | |
| `R2_ENDPOINT` | same | same | S3 endpoint |

In Vercel under Settings → Environment Variables. Everything in
[`.env.example`](../.env.example), and nothing else:

| Variable | Production | Preview | Notes |
| --- | --- | --- | --- |
| `DATABASE_URI` | production DB | **preview DB** | never the same value |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` | the preview URL | no trailing slash; inlined at build time, so Vault cannot supply it |
| `R2_PUBLIC_URL` | same | same | public host. Read by `next.config.mjs` at build time for `images.remotePatterns`; a CDN hostname, not a credential |
| `VAULT_ADDR` | same | same | cluster URL |
| `VAULT_NAMESPACE` | `admin` | `admin` | HCP requirement |
| `VAULT_SECRET_PATH` | `kv/autowash247/production` | `kv/autowash247/preview` | **different per environment** |
| `VAULT_ROLE_ID` | production role | preview role | **different per environment** |
| `VAULT_SECRET_ID` | production role | preview role | **different per environment** |
| `MEDIA_LOCAL_DISK` | **do not set** | **do not set** | development only |
| `LOG_LEVEL` | leave unset (`info`) | leave unset (`info`) | `debug` logs a line per internal step and Vercel bills log retention. T-04C |
| `E2E_*` | — | — | local testing only |

Access to the Vercel project is therefore access to that environment's
secrets, because it holds the bootstrap. Vault makes reads auditable,
rotation possible, and keeps preview out of production; it does not make the
Vercel dashboard untrusted. Say that plainly in the handover.

**Never set `MEDIA_LOCAL_DISK` in a deployed environment.** It makes uploads
go to the deploy's filesystem, which does not survive the next deployment —
the images silently disappear. Leaving the R2 credentials out of Vault
without it makes the app refuse to start, naming what is missing. That
refusal is the feature.

### 5.4 Rotating a secret

```bash
# 1. write the new value to the Vault path for that environment
# 2. REDEPLOY IMMEDIATELY
```

Secrets are read at process init and cached for the life of the process, so
a rotated value reaches a warm instance only on its next cold start. Between
the write and the redeploy, instances disagree: a `PAYLOAD_SECRET` rotation
leaves some sessions validating and some not, and a `REVALIDATE_SECRET`
rotation makes the webhook 401 intermittently. The redeploy is not
housekeeping — it is the second half of the rotation.

### 5.5 Local development

Same code path, same auth method, against the Vault in
`docker-compose.yml`:

```bash
docker compose up -d        # Postgres + Vault (dev mode)
./scripts/vault-seed.sh     # enables KV v2 + AppRole, seeds, prints the bootstrap
# paste the four VAULT_* lines it prints into .env
npm run dev
```

Vault dev mode is in-memory and keeps nothing, so re-run the seed script
after every `docker compose up`. It leaves existing values alone; pass
`--force` to regenerate them, which invalidates any admin session signed
with the old `PAYLOAD_SECRET`.

Local dev sets `MEDIA_LOCAL_DISK=true`, which makes the four R2 credentials
optional — the seed script does not write them. Add them to the dev path
only if you need to exercise the real R2 upload path.

---

## 6. First deploy

Push to the default branch, or click Deploy. Watch the log for, in order:

```
Reading migration files from /vercel/path0/src/migrations
Migrating:  20261003_100544_initial
Migrated:   20261003_100544_initial
...
✓ Compiled successfully
Route (app)
┌ ○ /_not-found
├ ƒ /crm/admin/segements
├ ƒ /crm/api/slug
├ ○ /landing-page
└ ○ /landing-page-en
```

Two things to check in that output:

- **The migrations ran.** No `Migrating:` lines means the build command is
  wrong and the database is empty.
- **`landing-page` and `landing-page-en` are `○`, not `ƒ`.** `○` means
  prerendered. A `ƒ` there means a page is rendering per request, which
  breaks the first project goal — crawlers that run no JavaScript need
  complete HTML from the cache (`AGENT.md` section 5.1).

The internal folder names appearing in that table is expected: the rewrites
map them to `/` and `/en`.

---

## 7. Create the first administrator

Open `https://<your-domain>/admin`. On an empty database Payload shows
*Create first user*.

The first account becomes an **administrator** automatically. Every account
created afterwards defaults to *editor*, and only an admin can change a
role.

```bash
# or do it over the API
curl -s -X POST -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"<a real password>"}' \
  https://<your-domain>/api/users/first-register
```

Then verify you can log out and back in. Two guardrails apply from here:

- The **last administrator cannot be demoted or deleted.** Create a second
  admin before changing the first one's role, or you will be locked out of
  user management with only SQL to recover.
- Editors cannot delete anything. They unpublish instead.

---

## 8. Verify the deployment

Building is not working. Run this against the deployed URL:

```bash
./scripts/verify-deployment.sh https://<your-domain>
```

It checks every criterion in
[`architecture/task/t-04-deploy-pipeline.md`](../architecture/task/t-04-deploy-pipeline.md)
plus the locale and security properties the earlier tasks established. Fix
anything it reports before moving on.

What it cannot check, and you should look at by hand:

- [ ] Log in to `/admin` in a browser and open a collection.
- [ ] Upload an image, then confirm its URL is on `R2_PUBLIC_URL` and not
      on your own domain. If it is on your domain, the storage plugin is not
      active and uploads are going to a filesystem that will lose them.
- [ ] `NEXT_PUBLIC_SITE_URL` matches the environment you are looking at.
- [ ] No secret appears in the build log. The loader never logs a value,
      but a `console.log` added during debugging would.
- [ ] This environment's AppRole **cannot** read another environment's
      path. Attempt it and expect a 403 (section 5.2); reading the policy
      is not the same as testing it.

---

## 9. Preview deployments

Open a pull request. Vercel builds it against the **preview** environment
variables.

Confirm on the preview URL:

- [ ] The site loads and `/admin` logs in.
- [ ] `NEXT_PUBLIC_SITE_URL` is the preview URL, not production — otherwise
      canonical tags on a preview point at production.
- [ ] The database is the preview one. Editing content here must not change
      production.
- [ ] `VAULT_SECRET_PATH` is the preview path and the AppRole is the preview
      role. A preview deploy reading production secrets would mint sessions
      valid in production, which is the failure the per-environment
      `PAYLOAD_SECRET` exists to prevent.

A preview database starts empty, so it needs its own first administrator.

---

## 10. Rolling back

**Code**: redeploy the previous deployment from Vercel's Deployments list.
Instant, and it does not touch the database.

**Schema**: migrations are not rolled back by a code rollback. If the bad
deploy added one, roll it back explicitly:

```bash
DATABASE_URI='<production connection string>' npx payload migrate:down
```

This runs the `down()` of the most recent migration. Every migration in this
repo has a working `down()` that preserves data — the localization migration
moves localized values back into their original columns rather than dropping
them — but **take a backup first anyway**. T-22 schedules backups and tests a
restore.

Order matters: roll the schema back *before* the code if the old code cannot
read the new schema, and *after* if the new schema is a superset.

---

## 11. Troubleshooting

| Symptom | Cause to check first |
| --- | --- |
| Build fails: "Media storage is not configured" | An R2 variable is missing. This is deliberate — see step 5 |
| Build fails: "Missing required environment variable" | `DATABASE_URI` not set for that environment |
| Build fails: "Could not reach Vault" | `VAULT_ADDR` wrong, or the cluster is unreachable from Vercel's network. The build loads the Payload config, so it needs secrets too |
| Every Vault read returns 403 | `VAULT_NAMESPACE` unset — HCP requires `admin` and its error does not say so |
| Build fails: "invalid role or secret ID" | `VAULT_ROLE_ID`/`VAULT_SECRET_ID` mismatched, or a `secret_id` that has expired or exhausted its uses |
| A 403 on login that survives fixing `VAULT_SECRET_ID` | Vault locked the `role_id` after 5 failed logins and refuses the correct one identically for 15 minutes. `GET /v1/sys/locked-users`, then unlock — section 5.2 |
| Deploy is green but `/admin` 500s with a Vault error | The build command no longer runs `npm run migrate:deploy` first. `next build` alone exits 0 on a Vault failure — section 4 |
| Vault returns 404 for the secret path | KV v1 mount instead of v2, or `VAULT_SECRET_PATH` missing its mount prefix (`kv/autowash247/production`, not `autowash247/production`) |
| All admin sessions suddenly invalid | `PAYLOAD_SECRET` rotated. Expected — redeploy to finish the rotation |
| Sessions valid on some requests and not others | A rotation without a redeploy; warm instances still hold the old value |
| Site builds but every page is 404 | A rewrite rule is missing from `next.config.mjs` — folder names do not create URLs here |
| `/` works, `/en` is 404 | The `/en` rewrites are missing or out of order |
| Pages show `ƒ` instead of `○` | Something reads `headers()` or `searchParams` at the top of a route |
| Images do not render | `R2_PUBLIC_URL` missing from `images.remotePatterns`, or the bucket has no public host |
| Images 403 | Bucket is not public, or `Media` lost its public `read` access |
| Uploads vanish after a deploy | `MEDIA_LOCAL_DISK` is set in a deployed environment |
| `/admin` is a 500 | Database unreachable, or migrations never ran |
| Admin shows "Create first user" on a live site | Pointing at the wrong (empty) database |
| Editor cannot change their own password | Regression in `Users` access control; `read`/`update` must be self-scoped |
| Nobody can manage users | Zero administrators. Recover with SQL: `UPDATE users SET role='admin' WHERE email='…'` |

---

## 12. Not automated

Honest list of what remains manual after this document:

- Creating the Vercel project, the databases and the R2 bucket.
- Setting environment variables. There is no committed source for them, by
  design. The credentials are in Vault, which gives them an auditable home;
  the AppRole bootstrap pair stays manual, because a secret store cannot
  hold the key to itself.
- Creating the HCP Vault cluster, its KV v2 mount and one AppRole per
  environment. Section 5.
- Rotating secrets, and the redeploy that has to follow each rotation
  (section 5.4). T-22 owns writing the schedule down.
- The custom domain and DNS.
- Postgres backups and a tested restore (**T-22**).
- Search Console verification and sitemap submission (**T-21**).
- Choosing whether preview deploys may send revalidation webhooks to
  production. They should not; T-11 decides how.
