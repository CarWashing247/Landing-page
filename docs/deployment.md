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

One Next.js deploy containing both the public site and the CMS, plus two
external stores:

| Piece | Where it ends up |
| --- | --- |
| Public site, Vietnamese | `/`, `/bang-gia`, … |
| Public site, English | `/en`, `/en/pricing`, … |
| Payload admin | `/admin` |
| Payload REST API | `/api/**` |
| Content | PostgreSQL (external) |
| Images | Cloudflare R2 (external, public host) |

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

| Variable | Example | Used by |
| --- | --- | --- |
| `R2_ENDPOINT` | `https://abc123.r2.cloudflarestorage.com` | the server, to upload |
| `R2_PUBLIC_URL` | `https://media.autowash247.vn` | the browser, to display |

`R2_PUBLIC_URL` is also added to `images.remotePatterns` in
`next.config.mjs`. Without it `next/image` refuses to optimise the image and
the page renders nothing.

---

## 4. Create the Vercel project

1. Import this repository in Vercel.
2. Framework preset: **Next.js**. Root directory: the repository root.
3. Leave the build command alone — [`vercel.json`](../vercel.json) sets it to
   `npm run migrate:deploy && npm run build`, so migrations run before the
   build and a schema mismatch fails the deploy instead of reaching users.
4. Do **not** deploy yet. Set the environment variables first; without them
   the build fails by design (see step 5).

---

## 5. Environment variables

Set these in Vercel under Settings → Environment Variables. Everything in
[`.env.example`](../.env.example) is required except where noted.

| Variable | Production | Preview | Notes |
| --- | --- | --- | --- |
| `DATABASE_URI` | production DB | **preview DB** | never the same value |
| `PAYLOAD_SECRET` | unique | unique | **different per environment** |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` | the preview URL | no trailing slash |
| `REVALIDATE_SECRET` | unique | unique | T-11 webhook |
| `PREVIEW_SECRET` | unique | unique | T-12 draft preview |
| `R2_BUCKET` | same | same | |
| `R2_ACCESS_KEY_ID` | same | same | |
| `R2_SECRET_ACCESS_KEY` | same | same | |
| `R2_ENDPOINT` | same | same | S3 endpoint |
| `R2_PUBLIC_URL` | same | same | public host |
| `MEDIA_LOCAL_DISK` | **do not set** | **do not set** | development only |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | — | — | local testing only |
| `E2E_EDITOR_EMAIL` / `E2E_EDITOR_PASSWORD` | — | — | local testing only |

Generate each secret separately:

```bash
openssl rand -hex 32    # PAYLOAD_SECRET
openssl rand -hex 16    # REVALIDATE_SECRET, PREVIEW_SECRET
```

**`PAYLOAD_SECRET` must differ between environments.** It signs admin
session tokens, so a shared value means a session minted in preview is
accepted in production.

**Never set `MEDIA_LOCAL_DISK` in a deployed environment.** It makes uploads
go to the deploy's filesystem, which does not survive the next deployment —
the images silently disappear. Leaving the R2 variables unset without it
makes the app refuse to start, naming what is missing. That refusal is the
feature.

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
| Build fails: "Missing required environment variable" | `DATABASE_URI` or `PAYLOAD_SECRET` not set for that environment |
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
  design — they are secrets.
- The custom domain and DNS.
- Postgres backups and a tested restore (**T-22**).
- Search Console verification and sitemap submission (**T-21**).
- Choosing whether preview deploys may send revalidation webhooks to
  production. They should not; T-11 decides how.
