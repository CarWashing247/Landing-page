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
6. Put `PREVIEW_SECRET` in Vault, at all three paths, with a distinct
   value each, and read it through `loadSecrets()` (AGENT.md section 7.2).
   It does **not** go in `.env.example` or Vercel.

## Files

```
src/app/api/draft/route.ts
src/app/api/draft/exit/route.ts
src/components/DraftBanner.tsx
src/collections/Pages.ts
src/collections/Services.ts
src/app/landing-page/[slug]/page.tsx
src/app/landing-page/dich-vu/[slug]/page.tsx
src/lib/secrets.ts              # add the key to the contract (T-04B)
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
- **Reading `draftMode()` in a page does *not* make the route dynamic.** It was
  the main risk in this task — `cookies()` and `headers()` both do — and the
  build output settles it: every content route is still `●` and both home pages
  `○` with `draftMode()` read in the page component and in the banner. Next
  treats it specially; the API reference says as much by noting `isEnabled` is
  readable inside a cache scope while `cookies()` is not.
- **Next already bypasses `unstable_cache` for a draft request**, in both
  directions: it neither reads an entry nor writes one, and the response goes
  out as `Cache-Control: private, no-cache, no-store, max-age=0,
  must-revalidate`. The query layer skips the wrapper anyway, because the one
  failure that would matter most here is a draft response captured under a
  public tag and then served to everyone.
- **`overrideAccess: true` on a draft read is the authorisation model, not a
  hole in it.** `publishedOrStaff` filters by `_status` for anyone who is not a
  logged-in editor, and a draft-cookie holder is not a Payload user — so access
  control alone would hide the very content preview exists to show. The cookie
  stands in for it: `/api/draft` sets it only after checking `PREVIEW_SECRET`,
  and Next signs it. The check moved earlier rather than disappearing.
- **The draft route verifies the slug before setting the cookie.** Otherwise it
  hands a cache-bypassing cookie to anyone who can guess the secret *and* get
  the slug wrong, and an editor sent to a page that does not exist ends up with
  a draft session attached to nothing.
- `GET` on the entry route and `POST` on the exit is deliberate and follows
  Next's own guide: the entry is a browser following the admin's Preview button
  in a new tab, which is a `GET`, and the shared secret is what closes it. The
  exit has no such constraint, so it is a `POST` — which also means a link
  prefetch cannot end an editor's preview session.

## Flags

- **The banner's strings are `TODO(copy)`.** T-15A owns the interface catalog
  and already lists the draft banner among the keys it converts, so they are
  placeholders rather than machine-translated Vietnamese (CLAUDE.md).
- `PREVIEW_SECRET` needed no new work: T-04B already had it in `SECRET_KEYS`
  and in `scripts/vault-seed.sh`, at all three paths and out of `.env.example`.
  Step 6 of this file was already satisfied.
- The sitemap criterion ("a draft page is excluded from `/sitemap.xml`") cannot
  be checked yet — T-13 builds the sitemap. What *is* verified here is the
  input it will use: `publishedSlugs()` from T-10 excludes drafts, and the build
  output lists no draft route.

## Found in review, not fixed

A review of this task against a running build found five things. All of them are
in `architecture/follow-ups.md`, with the measurements; they are listed here
because this is the file someone will open when preview misbehaves.

- **A3 — `safeLocalPath` passes `/\host`.** `/api/draft/exit?to=/\evil.example`
  redirects off-site, with no secret and no cookie needed. The guard rejects
  `//host` and absolute URLs but not the backslash form, which browsers read as
  an authority. One line, plus a test row beside the existing `//` ones.
- **A4 — a missing `PREVIEW_SECRET` makes `/api/draft` 500** with no `logger()`
  line at all. `/api/revalidate` answers the same condition with 503 and an
  ERROR line.
- **A5 — the banner only renders on the two content templates.** Draft mode is
  invisible and unexitable on `/` and on the 404 while the cookie stays set. It
  belongs in `LocaleLayout`; that was measured and costs no build output.
- **A6 — two rule slips**: the banner styles itself with inline `style` objects
  against AGENT.md 6, and the exit side spells `to` and `locale` as literals
  rather than through `PARAM`, which the contract module exists to prevent.
- **B2 — the commit message for this task is wrong in two places.** It says
  `/api/revalidate` was moved onto `secretMatches()` (it was not — the duplicate
  comparison is still there, and `secrets.ts` claims the same thing in prose),
  and it says the home pages read `draftMode()` (they do not).

What the review did confirm, against the built server: 401 with no secret and
with a wrong one, 400 for a missing slug, an unknown collection or an unserved
locale, 404 with no `Set-Cookie` for a slug with no document, 307 plus the cookie
on success; the draft renders for the cookie holder while an anonymous request to
the same URL 404s or keeps the published version; the draft response carries
`Cache-Control: private, no-cache, no-store` and leaves the published entry
intact; the Preview button renders a relative `/api/draft?…` URL; the exit clears
the cookie and sends an absolute or protocol-relative `to` to the locale home;
and the build still lists both content routes as `●` with only the published slug
prerendered, both home pages `○`, and both draft routes `ƒ`.
