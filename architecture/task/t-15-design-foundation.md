# T-15 · Design foundation

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-15-design-foundation` |
| Depends on | T-04 |
| Blocks | T-16, T-17 |
| Critical path | no |

## Goal

Tokens and fonts, so that every Phase 3 component is built against the same
scale instead of inventing one. Vietnamese is a diacritic-heavy script —
fonts that look fine in English break here, and that must be caught now
rather than on a finished page.

## Scope

**In scope**

- `tailwind.config.ts`: colour tokens, spacing scale, breakpoints, font
  family wiring. Semantic names (`brand`, `surface`, `muted`), not
  `blue-500` aliases.
- `next/font` with `display: 'swap'` and the **`vietnamese` subset**
  (AGENT.md 5.5), applied via a CSS variable on `<html>`.
- Base typography in `globals.css`: heading scale, body line-height, link
  styles. Vietnamese needs a slightly looser line-height than English
  because of stacked diacritics.
- `size-adjust` / fallback font metrics so swapping does not shift layout.

**Out of scope**

- Any page or block (T-16, T-17).
- A component library. AGENT.md section 9 forbids a UI kit that ships its
  own CSS reset.
- Dark mode — not in Design.md. Do not add it speculatively.

## Steps

1. Choose a font with genuine Vietnamese coverage and load it through
   `next/font/google` (or local) with `subsets: ['vietnamese', 'latin']`
   and `display: 'swap'`.
2. Define tokens in `tailwind.config.ts`. Keep the palette small; a
   marketing page needs a brand colour, a neutral ramp and one accent.
3. Set `adjustFontFallback` (or explicit fallback metrics) so the swap does
   not move text.
4. Write base element styles in `globals.css` using `@layer base`. No
   `@apply` beyond this file (AGENT.md section 6).
5. Build a throwaway specimen route (or a Storybook-free static page) that
   renders every weight at several sizes with full Vietnamese diacritics,
   check it, then **remove it** before the PR — or keep it behind a
   `noindex` dev-only route and say which in the PR.

## Files

```
tailwind.config.ts
src/app/globals.css
src/app/landing-page/layout.tsx   # font variable on <html>
src/lib/fonts.ts
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] No layout shift attributable to font loading — CLS contribution from
      the font is 0.
- [ ] Vietnamese diacritics render correctly at every weight used: check
      `ờ ẵ ụ ệ Đ ữ ạ ỉ ỡ` at each weight, including the stacked
      tone-plus-vowel marks.
- [ ] `display: 'swap'` and the `vietnamese` subset are both set.
- [ ] Tokens are semantic and used by name; no raw hex in a component.
- [ ] No `@apply` outside `globals.css`; no CSS-in-JS.
- [ ] No new `'use client'`.

## Verification

```bash
npm run build && npm run start &
# font is self-hosted by next/font, not fetched from a third party at runtime
curl -s localhost:3000/ | grep -oE '<link[^>]*font[^>]*>'
curl -s localhost:3000/ | grep -c 'fonts.googleapis.com'   # expect 0
# measure CLS on the home page
npx lighthouse http://localhost:3000/ --only-categories=performance \
  --form-factor=mobile --output=json --output-path=/tmp/lh.json --quiet
python3 -c "import json;d=json.load(open('/tmp/lh.json'));print('CLS', d['audits']['cumulative-layout-shift']['displayValue'])"
grep -rn "#[0-9a-fA-F]\{3,6\}" src/components 2>/dev/null || echo 'no raw hex in components'
```

Diacritic rendering is a visual check. Screenshot the specimen at each
weight and say in the PR that you looked at it.

## Notes

- `next/font` self-hosts; a `fonts.googleapis.com` request in the HTML
  means it was wired up as a plain stylesheet link and the no-layout-shift
  guarantee is gone.

## Flags

- Brand colours: if no brand palette has been supplied, pick a defensible
  neutral set, flag it as a placeholder, and note that changing tokens
  later is cheap only while no component hardcodes a colour.
