# T-04 · Deploy pipeline

| | |
| --- | --- |
| Phase | 1 — Foundation |
| Branch | `t-04-deploy-pipeline` |
| Depends on | T-01 |
| Blocks | T-04B, T-15, and Gate 1 |
| Critical path | no — parallel with T-02, T-03 |

## Goal

`main` deploys green to Vercel, PRs get preview deployments, and migrations
run on deploy. Until this exists, "it works" means "it works on my machine",
which is not a claim this project can act on.

## Scope

**In scope**

- Vercel project linked to the repo, Node and build command set.
- Postgres instance per environment (production, preview).
- Every variable from AGENT.md section 7.1 set in Vercel, per environment.
  Credentials are **not** among them: T-04B moves them to Vault, and this
  task only has to set the Vault bootstrap alongside the rest.
- Migrations applied as part of the deploy (`payload migrate && next build`
  or equivalent in the build command).
- Preview deployments on pull requests.
- `NEXT_PUBLIC_SITE_URL` correct per environment — this feeds
  `metadataBase` in T-09, and a wrong value there breaks every Open Graph
  image URL.

**Out of scope**

- Custom domain and DNS, unless the domain is already available; if not,
  flag it and use the `.vercel.app` URL.
- Postgres backups (T-22).
- Search Console (T-21).

## Steps

1. Create the Vercel project; set the build command so migrations run
   before the build.
2. Provision Postgres for production and for preview. Preview must not
   point at the production database — an editor's draft in preview must not
   be able to overwrite live content.
3. Set environment variables per environment (AGENT.md section 7.1).
   `PAYLOAD_SECRET`, `REVALIDATE_SECRET`, `PREVIEW_SECRET` and the four R2
   credentials come from Vault instead — set them there, distinct per
   environment, and set only `VAULT_ADDR`, `VAULT_NAMESPACE`,
   `VAULT_SECRET_PATH`, `VAULT_ROLE_ID` and `VAULT_SECRET_ID` in Vercel.
   If T-04B is not merged yet, set them in Vercel for now and say so in the
   PR, so the cleanup is not forgotten.
4. Push to `main`, confirm green, open `/admin` on the deployed URL.
5. Open a throwaway PR and confirm the preview deployment builds and serves.
6. Document the variable list and which environment each value belongs to
   in the PR description, not in a committed file (no secrets in the repo).

## Files

```
vercel.json                     # buildCommand: migrations before the build
package.json                    # migrate:deploy script
scripts/verify-deployment.sh    # checks a deployed environment
docs/deployment.md              # the step-by-step procedure
.env.example                    # confirm it matches what Vercel holds
```

The build command is committed rather than set in the Vercel UI, so the
deploy step is reviewable. It stays out of `build` itself so a local build
still needs no database (T-01).

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] A push to `main` deploys green.
- [ ] `/admin` is reachable on the deployed URL and login works.
- [ ] A PR produces a working preview deployment that serves the frontend.
- [ ] Migrations are applied by the deploy, verified by checking a fresh
      database comes up with the expected tables.
- [ ] Preview and production use different databases, different secrets and
      different Vault paths and AppRoles.
- [ ] `NEXT_PUBLIC_SITE_URL` on each environment matches that environment's
      own URL.

## Verification

```bash
./scripts/verify-deployment.sh https://<deploy-url>
```

Checks both locales, the `lang` attributes, the 404, that no page is
reachable at two URLs, that the admin responds, that anonymous API reads are
refused, that GraphQL is off, and that images come from R2 rather than the
deploy. Exits non-zero on any failure, so it can gate a pipeline. Checks for
things a later task delivers (robots.txt) skip rather than fail.

Follow [`docs/deployment.md`](../../docs/deployment.md) for the steps, and
its section 8 for what the script cannot check and you must look at by hand.

## Notes

- Payload's admin bundle is large. If the build times out, that is a build
  configuration problem, not a reason to split the CMS into a second
  service — one repo, one deploy, one domain is fixed in AGENT.md section 2.

## Flags

- Production domain: if not yet registered, flag it and note that
  `NEXT_PUBLIC_SITE_URL` must be revisited before T-21 submits a sitemap.
- If the Vault cluster does not exist yet, the credentials sit in Vercel
  until T-04B. Say so explicitly in the PR — this is the state the project
  is leaving, so an unflagged "temporary" here becomes permanent.

---

> **Gate 1 — admin login works, the deploy is green, and no credential sits
> in an environment variable except the Vault bootstrap.**
> T-01 to T-04B must be merged before any Phase 2 task starts.
