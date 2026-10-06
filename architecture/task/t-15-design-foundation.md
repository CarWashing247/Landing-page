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

**Source of truth: the Canva deck "AutoWash247 UI Foundation"**
(design `DAHXI-Jb8Ig`, 7 pages). Every token below is read from pages 2
(Color Tokens), 3 (Typography) and 4 (Spacing, Shape & Surface) rather than
chosen here. Three sibling decks hold the page designs and belong to later
tasks — see Notes.

**In scope**

- ~~`tailwind.config.ts`~~ **`src/app/globals.css`**: colour tokens, type
  scale, radii, font family wiring. Semantic names, not `blue-500` aliases.
  **This project is on Tailwind v4, which has no JavaScript config** — tokens
  are CSS custom properties in `@theme`, and a `tailwind.config.ts` would be
  silently ignored. The closed PR #15 had already found this; follow-up D2
  recorded it.
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
2. Define tokens in `@theme` in `src/app/globals.css` — not in
   `tailwind.config.ts`, see Scope. The deck's palette is already small: six
   colours, each paired with the colour to use on it.
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
src/app/globals.css                          # @theme tokens + @layer base
src/lib/fonts.ts                             # Inter, latin + vietnamese
src/components/layout/LocaleLayout.tsx       # font variable on <html>
src/app/landing-page/type-specimen/page.tsx  # dev-only, noindex
```

**Not `src/app/landing-page/layout.tsx`.** That file does not render `<html>`;
`LocaleLayout` does, and the variable has to sit on the element the tokens
resolve against. Putting it there also stops the two locale folders drifting
into different fonts.

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
- **The default palette, type scale and radii are cleared, not extended.**
  `--color-*: initial`, `--text-*: initial` and `--radius-*: initial` in
  `@theme` remove Tailwind's stock values, so `bg-blue-500`, `text-sm` and
  `rounded-3xl` stop being valid classes. The acceptance criterion is that
  tokens are semantic and used by name with no raw hex in a component, and 300
  unused colours sitting beside six real ones is the standing invitation to
  break it. A genuinely missing value gets added to `@theme` deliberately.
  Tailwind's `md` radius is 6px, which is *not* a value in this design — close
  but not the same, which is worse than different.
- **Spacing is deliberately not redefined.** The deck's 4px base with steps
  4/8/12/16/24/32/48/64 is exactly Tailwind v4's default multiplier at
  `1 2 3 4 6 8 12 16`. Restating it would create a second copy to drift.
- **Base element styles exist for CMS rich text.** T-17 renders editor-authored
  prose where there is no chance to put `text-h2` on a heading the editor typed,
  and Tailwind's preflight strips heading sizes to inherit — so without the
  `@layer base` rules an editor's H2 renders at body size.
- **The sibling Canva decks are page designs, not foundation**, and belong to
  the tasks that build them:

  | Deck | Design ID | Pages | Owner |
  | --- | --- | --- | --- |
  | AutoWash247 Website UI | `DAHXNsDnbjg` | 9 | T-16, T-17 |
  | AutoWash247 Desktop Pages | `DAHXNi05PeY` | 7 | T-16, T-18, T-19 |
  | AutoWash247 Admin CMS UI | `DAHXNnCsHfc` | 8 | T-19A |

- **The deck carries real Vietnamese copy**, written by the designer rather than
  machine-translated — headings, the 24/7 badge, FAQ questions, the four process
  steps. T-15A and T-23 should take it from there instead of inventing or
  translating. Examples on page 3 alone: "Rửa xe tự động 24/7, mọi lúc.",
  "Sạch nhanh. An tâm lái.", "ĐANG HOẠT ĐỘNG 24/7".

## Flags

- ~~Brand colours: if no brand palette has been supplied, pick a defensible
  neutral set…~~ **Not needed.** A real palette was supplied in the Canva deck
  and every colour below is read from it, with the deck's own on-colour pairings
  encoded alongside. Nothing here is a placeholder.
- **Surface elevations are specified by name but not by value.** Page 4 names
  Surface 0–3 (base, Raised, Elevated, Highest) and says they use "subtle borders
  and shadows", but gives no hex and no shadow numbers. Inventing four shadows
  would be inventing the design, so they are omitted and left to whoever has the
  numbers (T-16).
- **Breakpoints and the container width are likewise unspecified.** Page 7 asks
  for a max-width container with even gutters and a single-column mobile layout
  but names no pixel values, so Tailwind's default breakpoints are left untouched
  rather than overridden with guesses. The container belongs to T-16 with real
  numbers.
- **`:focus-visible` is not in the deck.** It is added because clearing the
  palette and restyling links without it would leave keyboard users worse off
  than the browser default — a regression this task would have introduced, not a
  design decision taken for it. Worth a designer's eye.
- **The specimen route is kept, not deleted**, which is the option step 5
  offers. It is development-only (`notFound()` in production, verified 404) and
  `noindex`. It costs nothing in production and is the only cheap way to re-check
  diacritics after a font or weight change.
- **The deck says "Map and contact integrations are out of scope for this
  release" (page 7), which contradicts T-19 (Contact page).** Not resolved here —
  it is a scope decision, not a typo.
