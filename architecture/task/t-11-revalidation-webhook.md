# T-11 · Revalidation webhook

| | |
| --- | --- |
| Phase | 2 — Content and SEO |
| Branch | `t-11-revalidation-webhook` |
| Depends on | T-10 |
| Blocks | T-12 |
| Critical path | **yes** |

## Goal

Publishing in `/admin` changes the live page in seconds, with no build.
This is the write path from Design.md 1.2, and it is the reason a
non-developer can change a meta description without a developer.

## Scope

**In scope**

- `src/app/api/revalidate/route.ts`: verifies `REVALIDATE_SECRET`
  **before doing anything**, returns 401 otherwise, then calls
  `revalidateTag()` for each tag in the request.
- `afterChange` hooks on `Pages`, `Services`, `BusinessInfo`,
  `SiteSettings`.
- Page/Service hooks send **both** `doc.slug` and `previousDoc?.slug`, plus
  the `sitemap` tag.
- Globals hooks send the `globals` tag, plus `sitemap` where relevant.
- `afterDelete` on `Pages` and `Services` too — an unpublished or deleted
  page must stop serving.
- Hook failures are logged and must not fail the editor's save. A failed
  purge degrades to the `revalidate: 3600` floor from T-10.

**Out of scope**

- Draft preview (T-12).
- Anything that makes the webhook a general-purpose endpoint. It takes tags
  and purges them; it does not accept paths or arbitrary commands.

## Steps

1. Write the route handler. Order matters: read the secret, compare in
   constant time, 401 and return — then parse the body.
2. Accept a validated payload shape: `{ tags: string[] }`, rejecting
   anything else with 400. Do not purge on a malformed body.
3. Write a shared `revalidateHook` factory in `src/lib/` taking a tag
   builder, so `Pages` and `Services` share it rather than copying it.
4. In the hook, collect `pageTag(doc.slug)`, `pageTag(previousDoc.slug)`
   when the slug changed, and `SITEMAP_TAG`.
5. Wrap the POST in try/catch; log on failure, never throw into the save.
   Log through `logger()` (T-04C, AGENT.md section 5.8) — and log the
   successful purge too, with the tag, because a webhook that only speaks
   up when it breaks cannot be shown to have ever worked. Log the rejection
   reason and the caller's IP on a 401, never the secret it got wrong.
6. Put `REVALIDATE_SECRET` in Vault, at all three paths, with a distinct
   value each, and read it through `loadSecrets()` rather than
   `process.env` (AGENT.md section 7.2). It does **not** go in
   `.env.example` or Vercel.

## Files

```
src/app/api/revalidate/route.ts
src/lib/revalidate.ts
src/collections/Pages.ts
src/collections/Services.ts
src/globals/BusinessInfo.ts
src/globals/SiteSettings.ts
src/lib/secrets.ts              # add the key to the contract (T-04B)
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] Publishing an edit in `/admin` changes the live page within ~10s,
      with **no build triggered** (check the Vercel deployments list — it
      must be unchanged).
- [ ] A request to `/api/revalidate` without the secret returns 401 and
      purges nothing.
- [ ] A request with a malformed body returns 400.
- [ ] Renaming a slug purges the old URL as well — the old URL stops
      serving the moved content.
- [ ] Changing `BusinessInfo` updates the footer/JSON-LD everywhere.
- [ ] A deliberately broken webhook URL does not block the editor's save.

## Verification

```bash
# 401 path
curl -s -o /dev/null -w 'no secret: %{http_code}\n' -X POST \
  -H 'content-type: application/json' -d '{"tags":["sitemap"]}' \
  localhost:3000/api/revalidate
# 400 path
curl -s -o /dev/null -w 'bad body: %{http_code}\n' -X POST \
  -H "content-type: application/json" -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -d '{"nope":true}' localhost:3000/api/revalidate
# happy path
curl -s -o /dev/null -w 'ok: %{http_code}\n' -X POST \
  -H "content-type: application/json" -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -d '{"tags":["sitemap"]}' localhost:3000/api/revalidate

# end to end: edit meta.description in /admin, publish, then
curl -s localhost:3000/bang-gia | grep -o 'name="description" content="[^"]*"'
```

Expect `401, 400, 200`, and the new description without a deploy.

## Notes

- If an edit does not appear live, the usual cause is a query missing its
  `next.tags` — `revalidateTag` then has nothing to purge. Check the query,
  not the webhook.
- Compare the secret with a constant-time comparison. A timing-safe check
  costs one import.

## Flags

- None expected.
