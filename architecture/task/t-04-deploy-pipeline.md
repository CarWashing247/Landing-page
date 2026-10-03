# T-04 · Deploy pipeline

| | |
| --- | --- |
| Phase | 1 — Foundation |
| Branch | `t-04-deploy-pipeline` |
| Depends on | T-01 |
| Blocks | T-15, and Gate 1 |
| Critical path | no — parallel with T-02, T-03 |

## Goal

`main` deploys green to Vercel, PRs get preview deployments, and migrations
run on deploy. Until this exists, "it works" means "it works on my machine",
which is not a claim this project can act on.

## Scope

**In scope**

- Vercel project linked to the repo, Node and build command set.
- Postgres instance per environment (production, preview).
- Every variable from AGENT.md section 7 set in Vercel, per environment.
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
3. Set environment variables per environment, including distinct
   `PAYLOAD_SECRET`, `REVALIDATE_SECRET` and `PREVIEW_SECRET` values.
4. Push to `main`, confirm green, open `/admin` on the deployed URL.
5. Open a throwaway PR and confirm the preview deployment builds and serves.
6. Document the variable list and which environment each value belongs to
   in the PR description, not in a committed file (no secrets in the repo).

## Files

```
vercel.json                     # only if a setting cannot be set in the UI
.env.example                    # confirm it matches what Vercel holds
package.json                    # build command, if changed
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] A push to `main` deploys green.
- [ ] `/admin` is reachable on the deployed URL and login works.
- [ ] A PR produces a working preview deployment that serves the frontend.
- [ ] Migrations are applied by the deploy, verified by checking a fresh
      database comes up with the expected tables.
- [ ] Preview and production use different databases and different secrets.
- [ ] `NEXT_PUBLIC_SITE_URL` on each environment matches that environment's
      own URL.

## Verification

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<deploy-url>/
curl -s -o /dev/null -w '%{http_code}\n' https://<deploy-url>/admin
# confirm the deploy's own site URL is what the app believes it is
curl -s https://<deploy-url>/ | grep -o 'content="https://[^"]*"' | head
```

## Notes

- Payload's admin bundle is large. If the build times out, that is a build
  configuration problem, not a reason to split the CMS into a second
  service — one repo, one deploy, one domain is fixed in AGENT.md section 2.

## Flags

- Production domain: if not yet registered, flag it and note that
  `NEXT_PUBLIC_SITE_URL` must be revisited before T-21 submits a sitemap.

---

> **Gate 1 — admin login works and the deploy is green.**
> T-01 to T-04 must be merged before any Phase 2 task starts.
