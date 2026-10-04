# T-04B · Secret loading from HashiCorp Vault

| | |
| --- | --- |
| Phase | 1 — Foundation |
| Branch | `t-04b-vault-secrets` |
| Depends on | T-02 (owns the R2 credentials this moves), T-04 (owns the deployed environments) |
| Blocks | Gate 1 |
| Critical path | no — but every later task that reads a secret reads it through this |

## Goal

Every credential this app holds comes from HashiCorp Vault, fetched once
when the process initialises. The only secret left in an environment
variable is the one that unlocks Vault itself.

The point is not that environment variables are insecure in themselves. It
is that they are **unauditable and unrotatable**: a value pasted into the
Vercel dashboard has no record of who set it, no record of who read it, and
no way to rotate it except by hand in every environment at once. Vault gives
each of those an answer, and gives one place to look when a key leaks.

## The split

Two categories, and the boundary is not "is it sensitive" — it is **when the
value is needed**.

**Stays in environment variables.** Either not a secret, or required before
Vault can be reached.

| Variable | Why it cannot come from Vault |
| --- | --- |
| `DATABASE_URI` | Decided: stays in env. `payload migrate` runs in the deploy's build step, and the connection string is per-environment infrastructure config, not a shared credential |
| `NEXT_PUBLIC_SITE_URL` | `NEXT_PUBLIC_*` is **inlined into the client bundle at build time**. A runtime fetch cannot produce it, by construction |
| `R2_PUBLIC_URL` | Read by `next.config.mjs` to build `images.remotePatterns`, which is baked into the build output. It is a public CDN hostname, not a credential |
| `MEDIA_LOCAL_DISK` | A development switch, not a credential |
| `VAULT_ADDR` · `VAULT_NAMESPACE` · `VAULT_SECRET_PATH` | Addressing, not secrets |
| `VAULT_ROLE_ID` · `VAULT_SECRET_ID` | **The bootstrap credential.** A secret store cannot hold the key to itself |
| `E2E_ADMIN_*` · `E2E_EDITOR_*` | Local test fixtures for throwaway accounts. Optional, never set in a deployed environment |

`R2_PUBLIC_URL` is a third exception beyond the two named in the request.
It is listed here rather than quietly added because it is load-bearing: move
it into Vault and `next.config.mjs` loses `images.remotePatterns`, and
`next/image` refuses every image on the site.

**Comes from Vault**, one KV v2 secret per environment:

| Key | Used by |
| --- | --- |
| `PAYLOAD_SECRET` | `payload.config.ts` — signs admin session JWTs |
| `REVALIDATE_SECRET` | `/api/revalidate` (T-11) |
| `PREVIEW_SECRET` | `/api/draft` (T-12) |
| `R2_BUCKET` | `payload.config.ts` via `resolveR2Config()` |
| `R2_ACCESS_KEY_ID` | as above |
| `R2_SECRET_ACCESS_KEY` | as above |
| `R2_ENDPOINT` | as above |

Keys are named identically to the variables they replace, so the mapping is
one-to-one and `grep` finds every consumer.

## Vault layout

**HCP Vault Dedicated**, AppRole auth. Chosen because Vercel's build
containers and lambdas run on Vercel's network: Vault has to be reachable
over the public internet with TLS, and a self-hosted instance would make
unsealing, TLS renewal and backups this project's problem — an unseal that
nobody notices means the site cannot build *or* cold-start.

```
kv/autowash247/production     ← production deploy
kv/autowash247/preview        ← preview deploys
kv/autowash247/development    ← each developer's machine
```

- One AppRole per environment, each with a policy granting `read` on its
  own path and nothing else. A leaked preview role must not read production.
- `PAYLOAD_SECRET`, `REVALIDATE_SECRET` and `PREVIEW_SECRET` differ per
  path. A shared `PAYLOAD_SECRET` means a session minted in preview is
  valid in production.
- `VAULT_NAMESPACE` is `admin` on HCP. Omitting it returns 403 on every
  read, with a message that does not mention namespaces.

## Scope

**In scope**

- `src/lib/secrets.ts` — the single loader. AppRole login, one KV v2 read,
  validated, cached at module scope, frozen.
- `payload.config.ts` and `src/lib/r2.ts` read secrets through it instead of
  `process.env`.
- `src/lib/env.ts` — `requireEnv` narrowed to non-secret config, with a
  guard that refuses to return any key in the Vault set.
- `docker-compose.yml` Vault service for local development, plus
  `scripts/vault-seed.sh` to populate `kv/autowash247/development`.
- `.env.example` rewritten around the new split.
- `docs/deployment.md` sections 5 and 9 rewritten; a new section on Vault
  setup, AppRole creation and rotation.
- A unit test that a missing Vault key fails at load with the key named.

**Out of scope**

- Dynamic database credentials from Vault's database secrets engine.
  `DATABASE_URI` stays static; revisit only if credential rotation becomes
  a requirement.
- Vault audit-log shipping and alerting (operational, not application).
- Rotating the AppRole `secret_id` automatically. Documented as a manual
  procedure with a calendar reminder; T-22 owns hardening.

## Steps

1. Create the HCP Vault cluster, the `kv/` KV v2 mount and the three paths.
2. Create one policy and one AppRole per environment. Record each
   `role_id`; generate a `secret_id` per consumer.
3. Write `src/lib/secrets.ts`. It must:
   - authenticate with AppRole, read the one secret at
     `VAULT_SECRET_PATH`, and **discard the Vault token immediately** —
     the process caches the values, not the session, so there is no token
     renewal to get wrong;
   - validate that every key in the contract is present and non-empty, and
     throw naming the missing keys, in the style of `requireEnv`;
   - cache at module scope so a warm lambda pays the round trip once;
   - never log a value, and never attach one to an error message.
4. Point `payload.config.ts` and `resolveR2Config()` at it.
5. Add the local Vault service and seed script; document the one-command
   local setup.
6. Set the env variables in Vercel for production and preview; remove the
   seven variables that Vault now owns.
7. Deploy, confirm green, and confirm `/admin` login still works — a
   `PAYLOAD_SECRET` that changed value will have invalidated sessions.

## The async config question — settled

`payload.config.ts` reads `PAYLOAD_SECRET` at module load and Vault is
asynchronous, and that module is loaded by `next dev`, `next build`,
`payload migrate`, `payload generate:types` and every cold start, each
through a different loader. This looked like the risk in the task.

There was nothing to retrofit. **`buildConfig` already returns
`Promise<SanitizedConfig>`** (`payload/dist/config/build.d.ts`), so the
default export has always been a promise, and every consumer already awaits
it:

- `getPayload({ config })` does `const config = await options.config`
- the `@payloadcms/next` route handlers take the export as `configPromise`
- Payload's CLI does `config = await config.default`
  (`payload/dist/bin/index.js`)

So the config is assembled inside an `async` function and the module exports
the promise it returns. No top-level `await`, no new loader requirement, and
the export's shape is unchanged. Verified against `build`, `migrate`,
`generate:types` and a running server with a live admin login.

## Consequences to accept knowingly

**Vault becomes a build-time dependency.** `npm run build` and
`payload migrate` both load the Payload config. Vault down means no deploy
and no migration — the same blast radius Postgres already has, now with a
second cause.

**Rotation is not instant.** Secrets are read at process init, so a rotated
value reaches a warm lambda only on its next cold start. Mixed values across
instances is the worst case: rotating `PAYLOAD_SECRET` with warm instances
running means some sessions validate and some do not. **Always redeploy
immediately after rotating**, and say so in the runbook.

**Cold starts pay a round trip.** Public pages are statically generated and
edge-cached, so they do not reach a lambda at all and the Lighthouse target
in AGENT.md 5.5 is unaffected. The cost lands on `/admin`, `/api/**`,
`/api/revalidate` and `/api/draft`. Measure it; if an admin cold start
becomes unpleasant, that is a reason to revisit, not to add a cache layer
with its own staleness rules.

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] `grep -rn 'process\.env\.' src/` shows no secret from the Vault
      table — only the env-side variables listed above.
- [ ] A deployed environment with a wrong `VAULT_SECRET_ID` fails at boot
      with a message naming Vault, not a 500 on first request.
- [ ] A Vault path missing one key fails at load naming that key.
- [ ] No secret value appears in any log line, error message or stack
      trace, including on the failure paths above.
- [ ] The production and preview AppRoles cannot read each other's path —
      verified by attempting it, not by reading the policy.
- [ ] `PAYLOAD_SECRET`, `REVALIDATE_SECRET` and `PREVIEW_SECRET` differ
      between production and preview.
- [ ] A fresh clone runs locally with `docker compose up -d`, the seed
      script and `npm run dev`, and no hand-edited `.env` secrets.
- [ ] `.env.example` contains no key that Vault owns.
- [ ] Vault is unreachable → the app fails to start and says why. It must
      **not** boot with a guessable default.

## Verification

Against a real Vault (the `docker-compose.yml` dev server), not a mock:

```bash
docker compose up -d && ./scripts/vault-seed.sh      # prints the bootstrap
npm test                                             # loader unit tests
npm run build && npm run migrate:deploy              # both load the config
npm run start && ./scripts/verify-deployment.sh http://localhost:3000
```

Then the four checks a green build does not cover:

```bash
# 1. fails closed, naming Vault, rather than 500-ing on first request
#    Run the deploy's whole build command, not `next build` alone: measured,
#    `next build` prints the Vault error and still exits 0, because only the
#    dynamic routes need secrets and Next defers their failure to request
#    time. `payload migrate` is what exits 1, so the order in vercel.json is
#    load-bearing.
VAULT_SECRET_ID=00000000-0000-0000-0000-000000000000 \
  bash -c 'npm run migrate:deploy && npm run build'   # expect exit 1
VAULT_ADDR=http://127.0.0.1:9999 \
  bash -c 'npm run migrate:deploy && npm run build'   # expect exit 1

#    Repeating the wrong-secret_id case more than four times locks the
#    role_id for 15 minutes and every later login — including the correct
#    one — then fails identically. Clear it before concluding anything:
#      curl -H "x-vault-token: dev-root-token" $VAULT_ADDR/v1/sys/locked-users
#      curl -X POST -H "x-vault-token: dev-root-token" \
#        "$VAULT_ADDR/v1/sys/locked-users/<accessor>/unlock/<role_id>"

# 2. no secret in the build output at all — they are fetched at runtime
#    (grep each value from Vault against .next/)

# 3. the AppRole cannot read another environment's path — expect 403
curl -H "x-vault-token: $APPROLE_TOKEN" \
  "$VAULT_ADDR/v1/kv/data/autowash247/production"

# 4. rotation reaches a process only on its next start
#    log in, ./scripts/vault-seed.sh --force, confirm the token still works,
#    restart, confirm it no longer does
```

Check 4 is the one worth repeating after any change to this module: it is
what the "redeploy immediately after rotating" rule in AGENT.md 5.7 rests
on, and it is silent when it breaks.

## Flags

- HCP Vault Dedicated is a paid, recurring cost. Confirm before creating
  the cluster.
- The `secret_id` for each AppRole is held in Vercel's environment
  variables, so Vercel project access is equivalent to read access on that
  environment's secrets. That is the residual trust, and it is unavoidable
  with a bootstrap credential — state it in the handover rather than
  implying Vault removes it.

---

> **Gate 1 — admin login works, the deploy is green, both locales resolve,
> and no secret sits in an environment variable except the Vault
> bootstrap.**
