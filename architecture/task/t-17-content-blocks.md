# T-17 · Content blocks

| | |
| --- | --- |
| Phase | 3 — Interface |
| Branch | `t-17-content-blocks` |
| Depends on | T-06, T-15 |
| Blocks | T-18, T-19, T-20, T-23 |
| Critical path | **yes** |

## Goal

Five blocks an editor can compose a page from in any order: `Hero`,
`Steps`, `Pricing`, `Faq`, `Cta`. Each is a Payload block definition plus a
matching Server Component. After this, a new landing page needs no
developer.

## Scope

**In scope**

| Block | Fields | Component notes |
| --- | --- | --- |
| `Hero` | `heading`, `subheading`, `image` (required), `ctaLabel`, `ctaHref` | `<h1>`; image gets `priority` |
| `Steps` | `heading`, `steps[]` (`title`, `body`, `icon`?) | the QR-scan-to-wash sequence; ordered list |
| `Pricing` | `heading`, `services[]` (relationship → Services) or `rows[]` | price from the CMS, never hardcoded |
| `Faq` | `heading`, `items[]` (`question`, `answer`) | feeds T-14's `FAQPage` — **`answer` must be plain text, see Notes** |
| `Cta` | `heading`, `body`, `ctaLabel`, `ctaHref` | |

- Block definitions in `src/blocks/` (config) and components in
  `src/components/blocks/`.
- A `RenderBlocks` dispatcher mapping `blockType` → component, typed so a
  new block without a component is a **type error**, not a blank section.
- All images via `next/image`. Hero gets `priority`; everything else lazy.
- Vietnamese labels and `admin.description` on every block field.

**Out of scope**

- `Service` detail template (T-18) and contact page (T-19).
- `FAQPage` schema emission (T-14) — this task provides the data shape and
  must keep T-14's field names stable.
- Any `'use client'`. An FAQ accordion is tempting; use `<details>` and
  stay server-rendered.

## Steps

1. Define the five blocks, each with a clear Vietnamese `labels.singular`
   so the editor's "Add block" menu is readable.
2. Add them to `Pages.layout` (and the ones that make sense on `Services`).
3. Write one Server Component per block. Exactly one `<h1>`: only `Hero`
   emits it, and the dispatcher must not allow two Heroes — enforce with
   `maxRows` on the block or validate in the collection.
4. Write `RenderBlocks.tsx` with an exhaustive switch over the generated
   union from `payload-types.ts`.
5. `Faq` uses `<details>/<summary>` for expand/collapse — zero JavaScript,
   works for crawlers and with JS off.
6. `Pricing` pulls from `Services` by relationship so a price change in one
   place updates both the pricing table and the service page.
7. `npx payload generate:types`, migration, apply.

## Files

```
src/blocks/Hero.ts  Steps.ts  Pricing.ts  Faq.ts  Cta.ts
src/components/blocks/Hero.tsx  Steps.tsx  Pricing.tsx  Faq.tsx  Cta.tsx
src/components/blocks/RenderBlocks.tsx
src/collections/Pages.ts
src/payload-types.ts            # generated
```

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] An editor can compose a page from blocks **in any order** and the
      frontend renders it, with no fixed-order assumption in the code.
- [ ] The `Faq` block's data feeds T-14's `FAQPage` schema on a page that
      uses it.
- [ ] Exactly one `<h1>` per rendered page.
- [ ] Every image goes through `next/image`; no bare `<img>`.
- [ ] Hero image has `priority`; no below-fold image does.
- [ ] No `'use client'` anywhere in this task.
- [ ] A block type with no matching component fails `npm run typecheck`.
- [ ] `Pricing` renders prices from `Services`, not from literals.
- [ ] All block fields have Vietnamese labels.

## Verification

```bash
npm run build && npm run start &
# compose a page in /admin with blocks in an unusual order, publish, then
curl -s localhost:3000/<test-slug> | grep -oE '<(section|h1|h2|details)[^>]*' | head -30
curl -s localhost:3000/<test-slug> | grep -c '<h1'          # expect 1
curl -s localhost:3000/<test-slug> | grep -c '<img '        # bare imgs: expect 0 beyond next/image output
grep -rn "'use client'" src/components/blocks || echo 'no client components in blocks'
grep -rn "<img" src/components/blocks || echo 'no bare img'
# FAQ works with JS off: <details> present in source
curl -s localhost:3000/<faq-slug> | grep -c '<details'
```

## Notes

- **T-14 already consumes this block, so the field names are fixed.**
  `src/lib/schema/faq.ts` reads `blockType: 'faq'` and `items[]` of `question`
  and `answer`, exactly as the table above specifies, and
  `src/lib/schema/faq.test.ts` pins them. Renaming either field silently stops
  `FAQPage` being emitted — silently, because a page with no FAQ schema looks
  identical to one with it. The tests are what fail instead.
- **`answer` must be a plain `textarea`, not `richText`.** Google's
  `Answer.text` takes plain text or simple HTML; a Lexical rich-text value is
  neither, and serialising one reaches Google as `[object Object]`. If rich
  answers are wanted, this task also owns converting them to HTML with the
  Lexical HTML converter and deciding which nodes survive — until then the
  schema stays honest by the field being plain.
- `heading` is page copy. `FAQPage` has no property for it, so it is rendered by
  the component and does not appear in the schema.
- `next/image` emits an `<img>` in the final HTML. The grep above is for
  bare `<img>` in **source**, which is what the rule forbids.
- Coordinate field names with T-14 before merging. Renaming
  `items[].question` after T-14 ships breaks the FAQ schema silently —
  the page still renders, the rich result just disappears.

## Flags

- All five blocks carry user-facing Vietnamese copy in their defaults and
  placeholders. Write `TODO(copy): <english gist>` rather than
  machine-translating; T-23 fills real copy.
