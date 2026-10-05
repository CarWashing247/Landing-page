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

- **`revalidateTag` takes two arguments in Next 16**, and the recommended
  `'max'` profile serves stale content for up to a year while a revalidation
  runs in the background. That is wrong here: after a slug rename the old URL
  would keep serving the moved content to the next visitor, which one of the
  criteria above forbids outright, and an editor who published and reloaded
  would still see the old page. The endpoint passes `{ expire: 0 }`, making the
  next request a blocking revalidate. The single-argument form is deprecated and
  behaves the same way, but relying on a deprecation is not a decision.
- **A tag over 256 characters is silently ignored** by Next — never assigned to
  cached data, so revalidating it does nothing and reports nothing. The endpoint
  rejects one with 400 rather than returning a success that did not happen.
- **`createLocalReq` mutates the request object it is handed**, assigning
  `req.locale` onto it (`createLocalReq.js:71`). So a hook that calls
  `payload.findByID({ locale: 'all', req })` leaves `req.locale === 'all'` for
  everything that runs afterwards on that request. Pass `req: { ...req }` — the
  copy keeps `transactionID`, so the read still joins the transaction.

  This is not a tidiness point. On a bulk write, every document after the first
  would run T-06's `storedSlugForLocale` with `locale === 'all'`, which returns
  `undefined`, and the published-slug lock would stop refusing renames.
  Reproduced: a bulk PATCH over one draft and one published page, setting a new
  slug. With the copy in place the draft is renamed and the published page is
  refused with the lock's own message; without it, the published page's lock is
  skipped because the draft's `afterChange` ran first.

  It is also where an earlier version of this note went wrong. It claimed to
  have *measured* `req.locale === 'all'` as Payload's hook contract. The
  observation was real and the conclusion was not: the probe ran after the
  `locale: 'all'` read and was reading its own side effect.
- **The purge runs after the response, through `after()` from `next/server`,
  not inside the hook.** Payload runs `afterChange` inside the write transaction
  and commits afterwards, so purging from inside it races the COMMIT — and
  `{ expire: 0 }` makes that race worse rather than better, because the next
  request blocks and re-renders immediately. A visitor arriving in that window
  re-reads the pre-publish rows, caches them, and nothing purges again: stale
  until the one-hour floor, which is the exact failure `{ expire: 0 }` was
  chosen to avoid. `after()` also takes the purge off the save path, so a slow
  webhook cannot hold a write transaction open. Outside a request — a seed
  script, a Local API test — `after()` throws and the purge runs inline.
- **`afterDelete` cannot read the per-locale slugs**, because the row is gone.
  It receives the document resolved for one locale, so purging that single slug
  under every locale's tag looks thorough and is wrong: a page stored as
  `vi: bang-gia` / `en: pricing` purges `page:en:bang-gia`, which nothing holds,
  and leaves `/en/pricing` serving a deleted page. A `beforeDelete` hook reads
  the slugs while the row still exists and stashes them on `req.context`, keyed
  by collection and id so a bulk delete does not cross documents. Verified: both
  URLs 404 immediately after one delete.
- **`doc.slug` is not always a string.** Under a `locale=all` write it is a
  per-locale object, which template-strings into a `page:vi:[object Object]`
  tag that matches nothing and reports success. Every slug goes through a
  `typeof` guard before it becomes a tag.
- **The per-locale slug read deliberately omits `draft: true`**, which is the
  opposite of what `content.ts` needs. That read renders the document an editor
  is working on; this one chooses which *cache entry* to discard, and only the
  published slug was ever cached. Measured: during a draft rename it returns the
  old still-published slug, and returns the new one only once the document is
  published — the correct sequence, because nothing was cached under the new URL
  until it went live.
- **A `globals` purge reaches pages that merely read the globals.** Verified:
  changing `SiteSettings.titleSuffix` updated `/bang-gia`'s `<title>` without
  that page's own tag being purged, because Next associates every tag consumed
  during a render with the route's cache entry. This is also why the `globals`
  tag is expensive, and why `sitemap` is *not* sent with it — neither global
  contributes a URL or a `lastModified` to the sitemap.

- If an edit does not appear live, the usual cause is a query that carries no
  tag — `revalidateTag` then has nothing to purge, and reports nothing either.
  Check the query, not the webhook. T-10 put every content read behind a tag in
  `src/lib/content.ts`; confirm the tag you are purging is the one the read
  attached, by name from `src/lib/cache-tags.ts`.
- **Purge both locales of the document, not only the one that changed.** The
  page tag is locale-scoped so an English edit does not throw away the
  Vietnamese page — but a *slug rename* is different: the Vietnamese page's
  cached render contains the English `hreflang` URL, so renaming the English
  slug leaves the Vietnamese page advertising a URL that now 404s. The hook
  knows the document id and can read every locale's slug, so purge
  `pageTag(locale, slug)` for each locale, plus `previousDoc`'s slug in the
  locale that changed. Left to the revalidate floor this self-corrects in an
  hour; left unhandled it is the one case where locale-scoped tags under-purge.
- **A miss is cached under the same tag as a hit** (T-10). Publishing a draft
  therefore takes effect through the normal purge: the negative entry for
  `page:<locale>:<slug>` is what `revalidateTag` throws away. No special case
  is needed for "the page did not exist before".
- Compare the secret with a constant-time comparison. A timing-safe check
  costs one import.

## Flags

- **The Vercel-deployments check in the criteria cannot be run locally.** The
  equivalent evidence is that no build was run between the edit and the `curl`
  that showed the new content — stated here because "no build triggered" is
  otherwise unfalsifiable from a local session.
- `REVALIDATE_SECRET` needed no new work: T-04B already had it in `SECRET_KEYS`
  and in `scripts/vault-seed.sh`, at all three paths and out of `.env.example`.
  Step 6 of this file is therefore already satisfied.
