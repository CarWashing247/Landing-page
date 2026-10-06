# T-19 · Contact page

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-19-contact-page` |
| Depends on | T-05, T-17 |
| Blocks | T-20, T-21, T-23 |
| Critical path | no |

## Goal

`/lien-he` for someone who is about to drive over (Design.md section 3).
Address and directions come first; the form is secondary. The map must not
cost LCP — an eagerly loaded Google Maps iframe is the single easiest way
to fail Gate 3.

> **Design source: Canva `DAHXNi05PeY` (AutoWash247 Desktop Pages).**
> Tokens (colour, type scale, radii) are already implemented from the UI
> Foundation deck by T-15 — use them by name, do not re-read hex values out of
> the deck. **Note a scope conflict:** page 7 of the UI Foundation deck says "Map and contact integrations are out of scope for this release", which contradicts this task existing. Resolve before building.

## Scope

**In scope**

- Address, phone, Zalo and opening hours from `BusinessInfo`.
- **Above the fold:** a call button (`tel:`) and a directions button
  (Google Maps link built from `lat`/`lng`), both plain links, both wired
  to fire GA4 events.
- Contact form: React Hook Form + Zod, with the **same Zod schema**
  validating on the client and in the route handler.
- Lazily loaded Google Maps embed: `loading="lazy"`, below the fold, with
  an explicit `width`/`height` or aspect-ratio box so it reserves space and
  contributes no CLS.
- `src/app/api/contact/route.ts` handling the submission.
- Success and error states in Vietnamese.

**Out of scope**

- GA4 setup itself (T-21). This task adds the event calls and the data
  attributes; T-21 makes the measurement ID real and verifies DebugView.
- Booking (out of scope for the repo).
- Storing submissions in Payload unless a destination is specified — see
  Flags.

## Steps

1. Build the page as a Server Component. Only the form is a client leaf.
2. Define the Zod schema once in `src/lib/validation/contact.ts`; import it
   into both the form and the route handler. One schema, two call sites.
3. Call and directions buttons are `<a href="tel:...">` and
   `<a href="https://www.google.com/maps/dir/?api=1&destination=lat,lng">`
   — real links, so they work with JavaScript off, with an `onClick` that
   fires the GA4 event as an enhancement.
4. Put the map in an aspect-ratio container with `loading="lazy"` and a
   `title` on the iframe for accessibility. Consider rendering a static
   placeholder that swaps to the iframe on interaction if LCP is tight.
5. Route handler: validate, rate-limit lightly, return a typed result. Do
   not echo the submitted values back into the HTML.
6. Measure LCP before and after adding the map and record both in the PR.

## Files

```
src/app/landing-page/lien-he/page.tsx
src/components/ContactForm.tsx          # 'use client' — the form only
src/components/MapEmbed.tsx
src/lib/validation/contact.ts
src/app/api/contact/route.ts
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] The map iframe is `loading="lazy"` and does not affect LCP —
      LCP element is not the map, and LCP is unchanged within noise versus
      the page without it.
- [ ] Call and directions clicks appear in GA4 DebugView (verify after
      T-21; until then, verify the event call fires in the console).
- [ ] Both buttons are above the fold on a 390px-wide viewport.
- [ ] Both work as plain links with JavaScript disabled.
- [ ] The same Zod schema validates client-side and server-side; a
      handcrafted POST with invalid data is rejected by the route handler.
- [ ] Address, phone and hours come from `BusinessInfo`.
- [ ] `'use client'` appears only on the form.
- [ ] The map reserves its space — CLS contribution 0.
- [ ] Form errors and success messages are in Vietnamese.

## Verification

```bash
npm run build && npm run start &
curl -s localhost:3000/lien-he | grep -oE '<iframe[^>]*'           # loading="lazy", title, dimensions
curl -s localhost:3000/lien-he | grep -oE 'href="tel:[^"]*"|href="https://www.google.com/maps[^"]*"'
grep -rln "'use client'" src/components | grep -v ContactForm       # expect only earlier leaves
# server-side validation must stand alone
curl -s -o /dev/null -w 'invalid post: %{http_code}\n' -X POST \
  -H 'content-type: application/json' -d '{"name":"","phone":"x"}' localhost:3000/api/contact
npx lighthouse http://localhost:3000/lien-he --only-categories=performance \
  --form-factor=mobile --output=json --output-path=/tmp/lh-contact.json --quiet
python3 -c "import json;d=json.load(open('/tmp/lh-contact.json'));a=d['audits'];print('LCP',a['largest-contentful-paint']['displayValue'],'CLS',a['cumulative-layout-shift']['displayValue']);print('LCP el',a['largest-contentful-paint-element']['details']['items'][0]['items'][0]['node']['snippet'][:120])"
```

Expect the invalid POST to be 400 and the LCP element not to be the iframe.

## Notes

- Client-side Zod validation is a convenience. The route handler is the
  control; test it with `curl`, bypassing the form entirely.

## Flags

- **Where do form submissions go?** Email, a Payload collection, or a
  third-party endpoint — this is not specified in Design.md. Pick the
  lowest-risk default (store in a Payload collection, `admin`-read-only),
  flag it, and ask before wiring an external service.
- Google Maps embed may need an API key depending on the embed form used.
  If so, add it to `.env.example` in the same commit and flag it.
- Form field labels, validation messages and the success message are
  user-facing Vietnamese: `TODO(copy)` unless supplied.

---

## As built

Written during implementation, because three decisions here are not recoverable
from the diff and the code comments point at this section for them.

### The map conflict, resolved in favour of the decks

The Goal above flags it: this task and Design.md section 4 both make a lazy
Google Maps embed the headline deliverable, while the Desktop Pages deck
(`DAHXNi05PeY`, page 6) shows no map and the UI Foundation deck's layout rules
say "Map and contact integrations are out of scope for this release".

**Resolved for the decks, and confirmed on 2026-10-06: the map is temporarily
bypassed in the UI and will be added as a later enhancement.** Phase 3's
standing rule is that the UI is what the decks show, and a map is a visible page
element, not an implementation detail.
`src/components/MapEmbed.tsx` is built, documented, keyless and ready — it does
everything the acceptance criteria ask (`loading="lazy"`, aspect-ratio box,
`title`, `referrerPolicy`) — and **nothing imports it.**

Consequences, stated rather than left to be discovered:

- The two map acceptance criteria are **vacuous as shipped, not met.** There is
  no iframe on the page to measure. They are left unticked.
- `MapEmbed.tsx` is unexercised code. Whoever turns it on runs the LCP
  measurement in the Verification block above rather than trusting its comment.
- T-20 measures this page without a map. The map is the heaviest thing that can
  be added to it, so enabling it needs its own measurement, not T-20's.

Recorded as **B5** in `architecture/follow-ups.md`, which is where the
enhancement picks it up.

### Where submissions go, and why the page is a block

- **Destination: a Payload collection**, `src/collections/ContactSubmissions.ts`
  — the lowest-risk default the Flags section asks for. `create` is denied to
  **everyone**, so the `/api/:path*` rewrite cannot be used to post rows
  straight at Payload; `/api/contact` validates with the shared schema and
  writes through the Local API. `read` is `isAdmin`, not `isAdminOrEditor`:
  these rows are personal data under Decree 13/2023. `update` is denied — a
  record that can be edited is not a record. The source IP is logged, never
  stored. **No external service was wired**, per the flag.
- **No `src/app/landing-page/lien-he/page.tsx`.** The Files list above names
  one; it would have shadowed `[slug]` for the slug the header already points
  at, and taken the page's SEO tab out of an editor's hands. Instead this is a
  sixth block (`src/blocks/Contact.ts`), so `/lien-he` is a `Pages` document
  like every other page: T-23 seeds it, T-13 lists it, T-08 gives it an SEO tab.
  Only the heading and lead paragraph are editable — phone, address and hours
  come from `BusinessInfo` (AGENT.md 5.4), form labels from the T-15A catalog.
- **No API key, so no `.env.example` change.** The directions link is Google's
  documented keyless `dir/?api=1` form. `MapEmbed` uses the keyless
  `/maps?q=…&output=embed` URL; switching to the documented Embed API
  (`/maps/embed/v1/place`) does need a key, and that is the commit that adds it.
- **GA4:** both links carry `data-ga-event` (`call`, `directions`) rather than
  an `onClick`, which would have put `'use client'` above the form. T-21 attaches
  one delegated listener keyed on that attribute.

### Flagged for a human

- `TODO(copy)` in `vi`: `required`, `invalid`, `invalidEmail`, `invalidPhone`,
  `tooLong`, `sending`, `sent`, `sendFailed` — no deck contains a validation or
  status message. Also `addressNote`, where the deck's text extracts as "Tìm
  dường đến của rửa gần bạn"; the diacritic damage is recoverable for two words
  and the noun after them is not, and guessing it would be writing copy rather
  than taking it.
- `--color-danger` is the one colour in `globals.css` that is not from the deck.
  Follow-up **D4**.
- The two decks word three contact strings differently; none was changed, and
  `subjectLabel`/`subjectPlaceholder` are now unused. Follow-up **D5**.

### A defect the verification found, and the fix

**The form did not degrade without JavaScript — it was guaranteed to fail.**
The `<form>` carries a real `action="/api/contact"` and `method="post"` so it
works with the script off, which is the point of giving it one. But the route
handler parsed the body with `request.json()` only, and a browser without
JavaScript posts `application/x-www-form-urlencoded`. **Every no-JS submission
came back a 400 and the lead was lost.** Found by posting form-encoded fields
with `curl` — exactly what the browser sends — not by reading the code, which
described the behaviour it intended rather than the one it had.

Fixed in `readBody()` in the route handler: it now accepts JSON and
form-encoded bodies, validated by the same schema, since every field arrives as
a string either way. A `File` entry from a `multipart` post is dropped rather
than stringified into a row.

`ContactForm` also gained a hidden `locale` input. Without JavaScript nothing
else told the handler which language the visitor was reading, and its default is
`vi`, so an English visitor's enquiry would have been filed as Vietnamese and
called back in the wrong language.

### Verification actually run

Against `npm run build && npm run start`, with a temporary `lien-he` document
and placeholder `BusinessInfo` seeded into the local dev database and **removed
again afterwards** — the globals are back to their `TODO(data):` values, and no
page, submission or placeholder address survives. Seeding was necessary because
the cards render through `publishable()`, which correctly suppresses a
`TODO(data):` value, so with the real database state there is nothing to look at.

| Check | Result |
| --- | --- |
| `lint`, `typecheck`, `build` | pass |
| `npm test` | 316 pass, 25 files (33 new, `src/lib/validation/contact.test.ts`) |
| Invalid POST, the task's own body | 400 `{"error":"invalid","fields":[…]}` |
| Wrong-typed POST, unparseable body | 400 |
| Oversized body (20 KB) | 413, refused before parsing |
| Form-encoded POST, valid | 200, row stored, `locale=en` from the hidden input |
| 4th POST in a minute | 429 |
| `POST /api/contact-submissions` (Payload REST) | **403** — the collection is closed |
| Rendered `href="tel:…"`, `maps/dir/?api=1&destination=…` | both present, server-rendered |
| `data-ga-event` | `call` and `directions` present |
| `<iframe>` on the page | **0** — see the map resolution above |
| `'use client'` directive | `ContactForm.tsx` only |
| Mobile Lighthouse performance | **0.94**, CLS **0**, LCP 2.9 s, FCP 1.5 s, TBT 120 ms |
| Both buttons above the fold at 390×844 | confirmed by screenshot |
| Submitted values in log lines | none; `fields=name,phone,message`, never values |

Two notes for whoever re-runs this:

- **The Verification block's `'use client'` grep gives a false positive.**
  `src/components/blocks/Contact.tsx` contains the string inside a comment
  explaining why it is *not* a client component. Check line 1, not the file.
- **The page has no image and no iframe at all**, so "the LCP element is not the
  map" holds trivially and the LCP number above is a text node. It is not
  evidence about a page that has a map in it.
- The eight `TODO(copy)` validation and status strings appear in the page source
  even when no error is shown, because they are props to a client component and
  are serialized into the RSC payload. Expected, and a reason to write the real
  copy before launch rather than after.
