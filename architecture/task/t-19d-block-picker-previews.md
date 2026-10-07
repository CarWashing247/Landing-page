# T-19D · Block picker previews

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-19d-block-picker-previews` |
| Depends on | T-17, T-15D |
| Blocks | Nothing |

## Goal

Help editors recognize a Page block before they add it. The seven images in
`design/phase3/block-picker.html` represent the real `Pages.layout` choices:
Hero, Steps, Pricing, FAQ, CTA, Contact, and Text. They are structural
schematics, not content templates or screenshots of a particular page.

## Implementation

- Store each 480 × 320 SVG under `public/block-previews/<slug>.svg`. Keep the
  same frame, palette, corner treatment, and scale across all seven images.
- Set each block's `admin.images.thumbnail` to its root-relative SVG URL.
  `content` is inline in `Pages.ts`; the other six definitions live in
  `src/blocks/`.
- Use `{ url, alt: '' }`: Payload renders the image inside a button that already
  contains the localized block label. The image is an additional visual cue,
  not the control's sole name.
- Keep the picker native. Do not replace Payload's Blocks field, selection
  drawer, search, keyboard behavior, or localized labels.
- Do not put real or sample prices, contact data, marketing copy, or a badge
  implying a block is recommended into the SVG. A pricing thumbnail illustrates
  cards; actual prices still come from Services.
- No collection fields or stored data change. Check the generated types after
  running the required `payload generate:types`; a migration is unnecessary if
  the only config changes are admin thumbnails.

## Acceptance

- All seven `Pages.layout` block choices display distinct, correctly mapped
  3:2 images in Payload's Add block drawer.
- Every preview remains recognizable at drawer size in both light and dark
  admin themes, and at phone width.
- The visible block label and keyboard focus remain available; selection still
  adds the correct block in both content locales.
- All SVGs parse and load from public URLs; no change reaches visitor pages,
  SEO output, collection schema, or stored content.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and
`npx payload generate:types`. Inspect the contact sheet and the real Add block
drawer at desktop and phone widths in both content locales. Add each block
once in an unsaved page editor, then discard it. Confirm public routes still
serve and the SVG URLs return 200 without authentication.
