# T-19J · 404 page

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-19j-not-found-page` |
| Depends on | T-16 (merged), T-15A (merged), T-19I (#46) — all merged |

## Goal

Give the site a designed 404 that matches
[`design/phase3/not-found.html`](../../design/phase3/not-found.html) and its
1440px/390px captures. Render it inside the real locale shell, keep the 404
status and `noindex`, and work in both locales. This is the visible half of
follow-up A1, which has been open since T-09.

## Design

`design/phase3/not-found.html` reuses the landing hero's two-column grid. The
copy sits on the left: the eyebrow carries `404`, the `<h1>` is the catalog's
`notFound.message`, then a lead, one primary action back home, and three
suggested pages with the T-19I pictograms. On the right is the hero's slate
panel with the car removed, an empty wash bay under a large `404`. On a phone
the panel becomes a 210px strip above the copy. The annotations in the
reference are not product UI.

## The rendering constraint, measured

**A page-level `notFound()` never reaches the server HTML in Next 16.**
Next's error recovery (`app-render.js`, `getErrorRSCPayload`) answers with an
`<html id="__next_error__">` shell with an empty `<body>`. The not-found
boundary exists only in the RSC payload, because Fizz does not run the client
`HTTPAccessFallbackErrorBoundary`. This is framework behaviour, not a defect
in this repo. Measured on this branch:

| Approach | Status | Server HTML | Painted with JS |
| --- | --- | --- | --- |
| `not-found.tsx` per locale (shipped) | 404, `noindex` | empty shell | full design, header and footer |
| 404 body in the page, `notFound()` inside `<Suspense>` | **200**, ISR-cached for 1h | full design | full design |
| unmatched URL → `global-not-found.tsx` | 404, `noindex` | full design | full design |

The Suspense variant was rejected because it is a soft 404, and it caches one
page per mistyped URL. Two other approaches are fully server-rendered:
`dynamicParams = false`, which breaks project goal 2, and a `proxy.ts` slug
lookup on every request. The user chose the native boundary. A crawler gets
the right status and `noindex`, and a 404 body is never indexed.

**Cost on every page.** A `not-found.tsx` sits in the layout's tree, so its
element ships in every public page's RSC payload, not only on 404s. Measured on
`/gioi-thieu`: 3,453 bytes, or 1,162 gzipped on its own, in a 28.7 KB document.
T-20 should weigh this against its budget. The empty-bay panel is inline SVG
and CSS for that reason; there is no image to add to it.

## In scope

- `src/components/NotFoundPage.tsx`: the 404 body, built from the existing
  `Wrap`, `Eyebrow`, `Action` and `SiteIcon`.
- `src/app/landing-page/not-found.tsx` and `src/app/landing-page-en/not-found.tsx`:
  one boundary per locale, with the locale as a literal.
- `src/app/global-not-found.tsx`: the same body inside `LocaleLayout`, so an
  unmatched URL looks identical and is fully server-rendered.
- `src/app/landing-page-en/[slug]/[...rest]/page.tsx`: it calls `notFound()` for
  English URLs two or more segments deep, so they render the English 404
  instead of the Vietnamese global one (A19).
- `contentPageMetadata()` and `servicePageMetadata()` return
  `notFoundMetadata()` for a missing slug, so the tab has a title (A18).
- New catalog keys `notFound.lead`, `notFound.suggestionsHeading` and
  `notFound.suggestionsLabel`. English is written; Vietnamese is `TODO(copy)`.

## Out of scope

- Fixing Next's empty shell for page-level `notFound()`. See the table above.
- `/dich-vu` (A10). The suggestions leave Services out until it has a document.

## Acceptance criteria

- [x] Unknown slugs in both locales (`/khong-ton-tai`, `/en/nope`,
      `/dich-vu/khong-co`) return 404 with `noindex`.
- [x] With JavaScript, those pages paint the design in the right locale, with
      `lang` set, exactly one `<h1>` and one `<main>`.
- [x] Unmatched URLs (`/a/b/c`) return 404 with `noindex` and the full design in
      the server HTML, header and footer included.
- [x] No horizontal scroll at 390px or 1440px.
- [x] `/en/a/b/c` and `/en/services/<slug>/extra` render the English 404 with
      `lang="en"`; real English routes still return 200 (A19).
- [x] Slug 404s have the brand as their document title after hydration (A18).
- [x] No new `'use client'`; no user-facing literal in the component.
- [x] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass.

## Verification

```bash
npm run build && npm run start
for u in /khong-ton-tai /en/nope /dich-vu/khong-co /a/b/c; do
  curl -s -o /tmp/r.html -w "$u %{http_code}\n" localhost:3000$u
  grep -o '<meta name="robots" content="[^"]*"' /tmp/r.html
done
curl -s localhost:3000/a/b/c | grep -c 'Không tìm thấy trang này'
```

The painted result needs a browser. Playwright's Chromium at 1440px and
390px, reading `lang`, `h1`, `main` and `scrollWidth`.
