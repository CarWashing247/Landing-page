# T-16 · Layout shell

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-16-layout-shell` |
| Depends on | T-05, T-15 |
| Blocks | T-20 |
| Critical path | no |

## Goal

Header and footer on every page, with every business detail read from
`BusinessInfo`. The footer is where address, phone and hours are most
likely to be quietly hardcoded, and where that mistake is hardest to spot
later.

> **Design source: Canva `DAHXNsDnbjg` (AutoWash247 Website UI) and `DAHXNi05PeY` (Desktop Pages).**
> Tokens (colour, type scale, radii) are already implemented from the UI
> Foundation deck by T-15 — use them by name, do not re-read hex values out of
> the deck. Header, footer and the responsive container. Page 7 of the UI Foundation deck states the rules in words — max-width container with even gutters, header condensing to a mobile menu, single-column mobile cards, full-width primary actions — but gives **no pixel values**, so the container width and breakpoints are this task's to decide from the page designs. The UI Foundation deck also names Surface 0-3 (base, Raised, Elevated, Highest) without hex or shadow values; T-15 left them out rather than invent them.

## Scope

**In scope**

- `Header`: brand (from `SiteSettings.brandName`), navigation to the five
  routes in Design.md section 3, a phone/Zalo call-to-action.
- Mobile navigation: a toggle. `'use client'` is permitted **only** on the
  toggle component, at the leaf (AGENT.md 5.1).
- `Footer`: legal name, street address, locality, phone, Zalo, and opening
  hours per weekday — all from `BusinessInfo`.
- Both rendered in `landing-page/layout.tsx`, fetching globals once per
  request with the `globals` cache tag.
- Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`) and a skip
  link.

**In scope, added after T-09**

- **A working 404 page.** T-09's catch-all rewrite made every URL match a
  route, so `app/global-not-found.tsx` no longer renders for public paths and an
  unknown slug returns a 404 with the right status and `noindex` but an **empty
  body**. The shell is this task's subject, and a 404 that renders the header
  and footer is the natural fix. Note that `not-found.tsx` per locale does
  nothing while `experimental.globalNotFound` is on, and turning that flag off
  leaves the same empty shell — both were measured in T-09. See that task file.

**In scope, added after T-12**

- **The draft banner belongs in this shell.** T-12 renders `<DraftBanner>` inside
  `ContentPage` and `ServicePage`, so draft mode is invisible and unexitable
  everywhere else — including `/` and the 404 — while the cookie stays set
  site-wide. Next's draft-mode guide says to render the indicator from the root
  layout. Moving it into `LocaleLayout` was measured during the T-12 review and
  changes no build output (content routes still `●`, home pages still `○`);
  remove the per-page copies in the same change or two banners render. Its
  strings are also T-15A's to catalogue, and its inline styles are yours to
  replace with tokens. See `follow-ups.md` A5 and A6.

**Out of scope**

- The pages themselves (T-17, T-18, T-19).
- The contact form and map (T-19).
- GA4 events on the header call button (T-21) — leave the element in place
  and let T-21 attach the event.

## Steps

1. Build `Header` and `Footer` as Server Components in
   `src/components/layout/`.
2. Extract the mobile menu toggle into its own client leaf. The nav links
   themselves stay server-rendered inside it as children, so the markup is
   in the HTML even before hydration.
3. Render opening hours from the array, grouping consecutive identical days
   if that reads better in Vietnamese — but keep the data shape untouched.
4. Fetch `BusinessInfo` and `SiteSettings` in the layout via the tagged
   query layer from T-10.
5. Add the skip link and check heading order is sane with the shell alone.

## Files

```
src/components/layout/Header.tsx
src/components/layout/Footer.tsx
src/components/layout/MobileMenuToggle.tsx   # the only 'use client'
src/app/landing-page/layout.tsx
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] No business detail is hardcoded anywhere in the shell — address,
      phone, hours, Zalo and brand name all come from globals.
- [ ] `'use client'` appears **only** on the mobile menu toggle.
- [ ] Navigation links are present in the HTML source with JavaScript
      disabled, including on mobile width.
- [ ] Opening hours in the footer match `BusinessInfo` and update after an
      edit + revalidation, with no deploy.
- [ ] Exactly one `<h1>` per page is still true (the shell must not add
      one).
- [ ] Keyboard navigation reaches the menu toggle and the skip link.

## Verification

```bash
npm run build && npm run start &
curl -s localhost:3000/ | grep -oE '<nav.*</nav>' | head -c 800     # links in the HTML
curl -s localhost:3000/ | grep -c '<h1'                              # expect 1
grep -rln "'use client'" src/components/layout                       # expect only the toggle
grep -rniE "hanoi|hà nội|\+84|0[0-9]{9}|[0-9]{1,2}:[0-9]{2}" src/components/layout \
  || echo 'no hardcoded business data'
# edit opening hours in /admin, publish, then
curl -s localhost:3000/ | grep -A3 -i 'gio mo\|giờ mở'
```

## Notes

- Grouping "Mon–Fri 08:00–20:00" in the footer is presentation. The JSON-LD
  in T-14 reads the same data independently, so a presentational grouping
  here must not change the stored shape.

## Flags

- Navigation label copy is user-facing Vietnamese. Use the route names from
  Design.md section 3 where they are self-evident (`Bảng giá`, `Dịch vụ`,
  `Hướng dẫn`, `Liên hệ`); anything else gets `TODO(copy)`. Done — the labels
  come from the T-15A catalog, and `nav.guide` was added to it here.

- **The designs' navigation and Design.md section 3 disagree, and the plan
  won.** The Canva header shows six items: Trang chủ, Dịch vụ, Bảng giá, **Về
  chúng tôi**, **Tin tức**, Liên hệ. "Về chúng tôi" and "Tin tức" correspond to
  no route, no keyword cluster and no task anywhere in the plan, so linking them
  would ship a header whose items 404; the designs also omit `/huong-dan`, which
  section 3 lists as a keyword-cluster page in both locales. `src/lib/routes.ts`
  therefore builds the nav from section 3 — five items — and
  `src/lib/routes.test.ts` pins the divergence so it cannot be undone by
  accident. **This is a decision someone should confirm**: either the two pages
  get routes, content and tasks, or the designs drop them.

- **The language switch goes to the other locale's home page, not to this page's
  translation.** Switching in place needs the current document's slug in the
  target locale — per-page data that `loadPage`/`loadService` already return as
  `paths` for the `hreflang` set, and that a layout does not have. Reading the
  path from `headers()` instead would turn every route dynamic and undo T-10.
  Per-page switching belongs where the page knows its own translations.

- **The 404 is still not fixed, and it was not for want of trying.** Two more
  combinations were measured here, on top of T-09's two; all four produce a
  correct 404 status with an empty `<body>`, the markup present only in the RSC
  payload. The suspected cause is the catch-all rewrite rather than the
  not-found boundary, which is the one variable none of the four tests changed.
  See follow-up A1, which now carries the table. The shell the 404 should render
  inside is built, so the page is the only piece still missing.

- **There is no client component in the shell at all**, where the task file
  asked for one. T-20's criterion is that no client component sits above the
  fold, and a header is the most above-the-fold thing on the page, so the mobile
  menu is a native `<details>`. Verified in Chrome with JavaScript disabled: the
  menu opens and all five links are reachable — which the React toggle this task
  specified could not have done, since its links would be present but inert.

  Note that the task's own verification line, `grep -rln "'use client'"
  src/components/layout`, now matches only prose if a comment quotes the
  directive. The comments were reworded so the check stays truthful.

- **`<details>` cannot be forced open with CSS**, which cost one wrong
  implementation. The first version put a single list inside the disclosure and
  revealed it at desktop width with `md:block` on the panel; measured in Chrome,
  the desktop links were invisible, because a closed `<details>` hides its
  content through the user agent stylesheet and a `display` rule on the child
  does not override it. The navigation is now rendered at each width from the
  same `NAV` array — five extra anchors, and no way for the two to drift.

- **The footer omits placeholder business data rather than printing it.**
  `BusinessInfo` still holds `TODO(data):` for the name, address and phone, and
  `publishable()` — the guard T-14 already uses — drops them, so the contact
  block is empty until T-23. Verified: zero occurrences of `TODO(data)` in the
  rendered page.

- **The footer tagline renders `SiteSettings.defaultDescription`**, which is
  currently the seeded `TODO(copy)` placeholder and so appears on the page. That
  is CMS content rather than a code defect — the same value already feeds every
  meta description — but it will look like a bug until someone writes it.

- Opening-hours grouping is presentation only, as the Notes require: T-14 reads
  the same array independently and still emits one entry per weekday. A test
  asserts the source array is neither mutated nor reordered.
