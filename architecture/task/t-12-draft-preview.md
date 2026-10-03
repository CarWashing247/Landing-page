# T-12 · Draft preview

| | |
| --- | --- |
| Phase | 2 — Content and SEO |
| Branch | `t-12-draft-preview` |
| Depends on | T-11 |
| Blocks | T-24 |
| Critical path | no |

## Goal

An editor can see an unpublished page as it will look, from a Preview
button in `/admin`, and nobody else can. Without this, the only way to
check a draft is to publish it.

## Scope

**In scope**

- `src/app/api/draft/route.ts`: validates `PREVIEW_SECRET` and the target
  slug, enables `draftMode()`, redirects to the page.
- `admin.preview` on `Pages` and `Services`, building the draft URL with
  the secret.
- Content routes read `draftMode()` and pass `draft: true` to the Payload
  query when it is enabled.
- A visible "viewing a draft" indicator, and an exit-preview route or link.
- Draft responses must not be cached: when `draftMode()` is on, the query
  skips the tag cache.

**Out of scope**

- Changing the published read path. Static generation from T-10 must be
  unaffected — a draft request is the exception, not a new default.

## Steps

1. Write the draft route: verify the secret, verify the slug resolves to a
   real document, then `draftMode().enable()` and redirect.
2. Add `admin.preview` to both collections returning the draft URL for the
   document, including `collection` and `slug` parameters.
3. In each content route, branch on `draftMode().isEnabled` to pass
   `draft: true` and to bypass the cache tags.
4. Add an exit-preview route that disables draft mode and redirects.
5. Render a small fixed banner when draft mode is on. Keep it a Server
   Component — it needs no interactivity beyond a link.
6. Add `PREVIEW_SECRET` to `.env.example` and Vercel.

## Files

```
src/app/api/draft/route.ts
src/app/api/draft/exit/route.ts
src/components/DraftBanner.tsx
src/collections/Pages.ts
src/collections/Services.ts
src/app/landing-page/[slug]/page.tsx
src/app/landing-page/dich-vu/[slug]/page.tsx
.env.example
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] The Preview button in `/admin` renders unpublished content.
- [ ] The same URL in a logged-out browser (no draft cookie) does **not**
      show the draft — it shows the published version or 404.
- [ ] `/api/draft` without the correct secret returns 401.
- [ ] A draft page is never served from the static cache, and never
      populates it.
- [ ] A draft page is excluded from `/sitemap.xml` (confirm after T-13).
- [ ] The draft banner is visible and leads to an exit.
- [ ] Published pages are still statically prerendered in the build output.

## Verification

```bash
curl -s -o /dev/null -w 'no secret: %{http_code}\n' 'localhost:3000/api/draft?slug=bang-gia'
# with secret, keep the cookie jar
curl -s -c draft.cookie -o /dev/null -w 'with secret: %{http_code}\n' \
  "localhost:3000/api/draft?slug=<draft-slug>&secret=$PREVIEW_SECRET"
curl -s -b draft.cookie localhost:3000/<draft-slug> | grep -o '<h1[^>]*>[^<]*'   # draft content
curl -s           localhost:3000/<draft-slug> -o /dev/null -w 'anon: %{http_code}\n'  # 404
npm run build | sed -n '/Route (app)/,/^$/p'          # still ○/●
```

## Notes

- `draftMode()` opts the request out of the full route cache. That is
  intended and scoped to the cookie holder; it must not leak into the
  published path.

## Flags

- None expected.
