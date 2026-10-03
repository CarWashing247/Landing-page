# T-02 · Media storage and the Media collection

| | |
| --- | --- |
| Phase | 1 — Foundation |
| Branch | `t-02-media-storage` |
| Depends on | T-01 |
| Blocks | T-05, T-17 (hero images), T-23 |
| Critical path | no — parallel with T-03, T-04 |

## Goal

Uploads leave the deploy and land in Cloudflare R2, and every image carries
an `alt` before it can be saved. `alt` being required is the only thing
stopping a hundred unlabelled images from accumulating in the library.

## Scope

**In scope**

- `@payloadcms/storage-s3` configured against R2 (`R2_ENDPOINT`,
  `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`), plus
  `R2_PUBLIC_URL` — the S3 API endpoint is not the host browsers fetch from,
  and `images.remotePatterns` needs that host.
- `MEDIA_LOCAL_DISK=true` as an explicit development-only opt-out. A deployed
  environment missing its R2 variables must fail at startup, not accept
  uploads onto a filesystem that does not survive the next deployment.
- `sharp` passed to `buildConfig`; without it no `imageSizes` are generated.
- Public `read` access on `Media`. Payload's default denies anonymous reads,
  which 403s every image for visitors and crawlers. Write rules stay in T-03.
- `Media` collection: `alt` (**required**, Vietnamese label),
  `caption`, upload enabled.
- Generated sizes: `thumbnail`, `card`, `hero`, `og` (1200×630).
- `next.config` `images.remotePatterns` allowing the R2 public host.

**Out of scope**

- Using images in components (T-17 onwards).
- `SiteSettings.ogFallback` — that field belongs to T-05; this task only
  makes the `og` size exist.

## Steps

1. Install and register `@payloadcms/storage-s3` in `payload.config.ts`,
   scoped to the `media` collection.
2. Write `src/collections/Media.ts` with `upload.imageSizes` for the four
   sizes. `og` is 1200×630 with `fit: 'cover'` so social previews are never
   letterboxed.
3. Mark `alt` `required: true` with label `Mô tả ảnh (cho SEO và trình đọc
   màn hình)` and an `admin.description` explaining it is read aloud and
   indexed.
4. Add the R2 host to `next.config` `images.remotePatterns`.
5. `npx payload generate:types`, `npx payload migrate:create`, apply.
6. Add the four R2 variables to `.env.example`.

## Files

```
src/collections/Media.ts
src/payload.config.ts
next.config.ts
.env.example
src/payload-types.ts            # generated
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] An upload from `/admin` lands in the R2 bucket, not on the deploy's
      filesystem.
- [ ] All four generated sizes resolve over public URLs (HTTP 200).
- [ ] Saving an upload with an empty `alt` is rejected by the admin UI with
      a Vietnamese validation message.
- [ ] `og` size is exactly 1200×630.
- [ ] `.env.example` lists all five R2 variables plus `MEDIA_LOCAL_DISK`.
- [ ] `alt` is `NOT NULL` in the database, not merely required in the UI.
- [ ] An anonymous request for every generated size returns 200 and an
      `image/*` content type.

## Verification

```bash
# after uploading one image through /admin, take its URLs from the API
curl -s 'localhost:3000/api/media?limit=1' | python3 -m json.tool | grep -E '"url"|"width"|"height"'
# then, for each size URL
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' '<r2-public-url>'
```

## Notes

- R2 is S3-compatible but needs `forcePathStyle` and a region of `auto`.
  If uploads 403, check the endpoint form before suspecting the keys.
- Do not make `alt` optional "until the seed data is in". T-23 fills real
  Vietnamese `alt` text; a nullable column now means a migration later.

## Flags

- R2 bucket name and public hostname are infrastructure values. If they are
  not supplied, use an obvious placeholder in `.env.example` and flag it —
  do not guess a plausible-looking endpoint.
