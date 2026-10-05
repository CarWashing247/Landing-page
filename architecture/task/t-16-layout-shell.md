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
  `Hướng dẫn`, `Liên hệ`); anything else gets `TODO(copy)`.
