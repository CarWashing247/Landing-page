# T-23 · Content seed

| | |
| --- | --- |
| Phase | 4 — Launch |
| Branch | `t-23-content-seed` |
| Depends on | T-17, T-18, T-19 |
| Blocks | T-24, Gate 4 |
| Critical path | **yes** |

## Goal

The five routes from Design.md section 3, each with real copy, real images
and a filled SEO tab carrying the correct `keywordFocus`. One page per
keyword cluster — two pages chasing the same term compete, and Google picks
one, usually not the intended one.

> **Design source: Canva all four Canva decks.**
> Tokens (colour, type scale, radii) are already implemented from the UI
> Foundation deck by T-15 — use them by name, do not re-read hex values out of
> the deck. **Real Vietnamese copy exists in the decks** — designer-written, not machine-translated. Seed from it. Examples: "Rửa xe tự động 24/7, mọi lúc.", "Sạch nhanh. An tâm lái.", "Công nghệ cảm biến thông minh, hoạt động 24/7, mang lại trải nghiệm rửa xe nhanh, sạch và an toàn." Business data (address, phone, hours) is **not** in the decks and remains `TODO(data):` in `BusinessInfo`.

## Scope

**In scope** — the keyword map, one page per cluster:

| Route | `keywordFocus` | Intent to serve |
| --- | --- | --- |
| `/` | rửa xe tự động + area name | finding a location: where and what |
| `/bang-gia` | giá rửa xe tự động | comparing prices, close to deciding |
| `/dich-vu/<slug>` | the specific wash package name | knows what they want |
| `/huong-dan` | rửa xe tự động có xước sơn không | sceptical, needs reassurance |
| `/lien-he` | rửa xe tự động gần đây | about to drive over: address, directions |

- Real `BusinessInfo` and `SiteSettings` values.
- One `Services` document per actual wash package.
- Images uploaded to Media with meaningful Vietnamese `alt`.
- SEO tab filled on every page and service: `meta.title`,
  `meta.description`, `meta.image`, `keywordFocus`.
- Keyword placement where it matters (Design.md section 3): `<h1>`, the
  front of `meta.title`, the opening paragraph, the hero image `alt`, and
  the slug. Nothing beyond that — repetition does not help ranking and
  makes the copy read like it was generated.

**Out of scope**

- New blocks or components. If the content needs a shape that does not
  exist, **report it**; do not add a block in this PR.
- Changing any field schema.

## Steps

1. Create the five routes with the slugs from Design.md:
   `/` (home), `bang-gia`, `huong-dan`, `lien-he`, plus one
   `dich-vu/<slug>` per package.
2. Upload images; write a real Vietnamese `alt` for each — descriptive, not
   keyword-stuffed.
3. Fill the SEO tab on each: title at 50–60 characters, description at
   140–160, OG image 1200×630.
4. Set `keywordFocus` per the table. Then check for collisions — this is
   the acceptance criterion most easily missed.
5. Fill `BusinessInfo` and `SiteSettings` with real values.
6. Publish everything and re-verify the full Gate 2 checks on real content:
   meta tags, JSON-LD, sitemap.

## Files

Mostly CMS data, not code. If a seed script is used, put it in
`scripts/seed.ts` and make it idempotent. Do not commit real credentials.

## Acceptance criteria

Inherits AGENT.md section 8. In addition:

- [ ] **No two pages share a `keywordFocus`.**
- [ ] Every image has a meaningful Vietnamese `alt` — not a filename, not
      the keyword repeated.
- [ ] **No placeholder text remains** anywhere: no `TODO(copy)`, no
      `TODO(data)`, no lorem ipsum, on any published document.
- [ ] All five routes are published and appear in `/sitemap.xml`.
- [ ] Each `meta.title` is 50–60 characters and each `meta.description`
      140–160, with the keyword near the front of the title.
- [ ] `BusinessInfo` holds real name, address, phone and opening hours,
      byte-identical to Google Business Profile.
- [ ] Exactly one `<h1>` per page, containing the page's cluster term.
- [ ] JSON-LD on every route still validates with real data.

## Verification

```bash
npm run build && npm run start &
# keywordFocus collisions
curl -s 'localhost:3000/api/pages?limit=100&depth=0' \
  | python3 -c "
import sys,json,collections
docs=json.load(sys.stdin)['docs']
ks=[ (d.get('meta') or {}).get('keywordFocus') for d in docs ]
dupes=[k for k,n in collections.Counter(ks).items() if k and n>1]
print('duplicate keywordFocus:', dupes or 'none')
print('missing keywordFocus:', [d['slug'] for d in docs if not (d.get('meta') or {}).get('keywordFocus')] or 'none')"
# title/description lengths
curl -s 'localhost:3000/api/pages?limit=100&depth=0' \
  | python3 -c "
import sys,json
for d in json.load(sys.stdin)['docs']:
    m=d.get('meta') or {}
    print(d['slug'], 'title', len(m.get('title') or ''), 'desc', len(m.get('description') or ''))"
# alt text present on every media item
curl -s 'localhost:3000/api/media?limit=200&depth=0' \
  | python3 -c "
import sys,json
print([m['filename'] for m in json.load(sys.stdin)['docs'] if not (m.get('alt') or '').strip()] or 'all have alt')"
# no placeholders left
for p in / /bang-gia /huong-dan /lien-he /dich-vu/<slug>; do
  curl -s "localhost:3000$p" | grep -niE 'TODO\(|lorem ipsum|placeholder' && echo "PLACEHOLDER in $p"
done
curl -s localhost:3000/sitemap.xml | grep -c '<loc>'
```

## Notes

- Title and description length limits are 70/180 in the CMS but the target
  is 50–60/140–160. The gap is deliberate: the hard limit prevents damage,
  the target is the craft.

## Flags

- **This task cannot be completed without real business content**: address,
  phone, opening hours, package names, prices, and Vietnamese marketing
  copy. None of it may be machine-translated or invented (AGENT.md section 1,
  CLAUDE.md). If any is missing, seed what you have, list precisely what is
  outstanding, and **do not publish** a page carrying invented data — a
  fabricated address propagates into JSON-LD and into Google Business
  Profile.
