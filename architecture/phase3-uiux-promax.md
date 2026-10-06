# AutoWash247 Phase 3 interface direction

This is the design source for the next Phase 3 implementation pass. It was
generated from the repository's product, content model, and UI UX Pro Max's
automotive, landing-page, accessibility, and Next.js guidance. The standalone
previews in `design/phase3/` show the landing page, Payload editor, and CMS
dashboard at desktop and phone widths. PNG captures sit beside the HTML files.
They are design artifacts, not application routes or approved business copy.

## Product constraints

- Visitors need to understand the QR-to-wash flow, compare real CMS prices, and
  reach a station or contact method quickly on a phone.
- Crawlers receive all page content, navigation, metadata, and JSON-LD in the
  first HTML response. Motion never hides content before hydration.
- Editors use Payload's collection, global, draft, version, SEO, and preview
  features. The admin design configures Payload; it does not replace its list
  or edit views.
- Vietnamese is the default and English lives under `/en`. A locale switch is
  a real link. Both interfaces must accommodate longer labels and diacritics.
- Prices, address, phone, opening hours, testimonials, station counts, and
  photos are content, not decoration. Show them only when backed by CMS data.

## Visual system

The feel is precise, bright, and dependable. The marketing site uses generous
space and a strong grid. The admin uses the same identity with denser spacing
and calmer surfaces. Animation is limited to hover, focus, and menu transitions;
the information hierarchy works with motion disabled.

| Role | Value | Use |
| --- | --- | --- |
| Ink | `#0F172A` | Main text and dark navigation |
| Slate | `#1E293B` | Hero and admin rail |
| Action | `#C62929` | Primary action, with white text |
| Action hover | `#A91F24` | Primary action hover |
| Paper | `#F8FAFC` | Page background |
| Surface | `#FFFFFF` | Cards and editor canvas |
| Mist | `#E9EDF1` | Soft panels |
| Border | `#D8E1E8` | Dividers and input outlines |
| Secondary text | `#475569` | Descriptions and metadata |
| Success | `#116B52` | Published state, paired with a text label |
| Focus | `#0369A1` | Visible keyboard outline |

Use **Inter Tight** for display headings and **Inter** for body and controls;
both have Vietnamese glyph coverage. Load them through `next/font` with
`display: 'swap'` and the `vietnamese` subset. Body copy is at least 16px with
1.55 line height. Keep paragraph measures under roughly 68 characters. Use a
4px spacing base, 12px control radius, and 20px card radius. Layout widths are
1120px for marketing content and fluid within Payload's work area. The mobile
gutters are 20px; they expand to 32px from tablet width.

## Landing page

| Order | Region | Source and behavior |
| --- | --- | --- |
| 1 | Compact header | Brand name from `SiteSettings`, server-rendered nav, locale links, one primary action; mobile toggle is the only client leaf. |
| 2 | Hero | One H1 and concise promise from the CMS `Hero` block; image through `next/image` with priority. A service or station CTA uses a real configured URL. |
| 3 | How it works | `Steps` block in numbered cards; preserve editor order. QR, select, wash are content, not hardcoded labels. |
| 4 | Services | `Pricing` block reads actual Services; card emphasis is based on content, never a made-up “best” badge. Price and duration stay readable together. |
| 5 | Questions | `Faq` block uses native `details` and `summary`; answers and FAQ schema share the same data. |
| 6 | Closing action | `Cta` block with a single clear destination. The footer reads `BusinessInfo`. |

Desktop: a two-column hero with copy on the left and media on the right. A
sliver of the next section remains visible at 768px high. Services are a
three-column grid when three items fit, otherwise two or one. Mobile: one
column in document order, full-width primary buttons, no horizontal scrolling,
and touch targets at least 44px high. The visual preview uses abstract wash
lines; production hero media comes from the CMS.

The home page should be a `Pages` document with reserved slug `home`, served at
`/` and `/en`. This is the user-selected T-17A decision. Its blocks and SEO
metadata remain editable without a deploy. `/home` and `/en/home` must 404;
the sitemap must contain exactly one entry per published, indexable locale.

Service and contact pages inherit the same shell and cards. The service page
keeps its CMS price, duration, included items, and `Service`/`Offer` schema.
The contact page keeps call and directions above the fold, field-level errors,
and the lazy map. No invented business details enter either layout.

## Payload admin

The admin is a focused editorial workspace. A dark slate navigation rail marks
the current section clearly; the list and editor canvases are light. The main
action is red, while published state is green with a visible text label. Error
and warning states are never color-only.

| View | Composition | Payload implementation boundary |
| --- | --- | --- |
| Dashboard | Welcome, quick links to Pages, Services, Media, then recent content if available | Configure Payload dashboard components; no second CMS or separate data store. |
| List | Search and filters above a readable table; title, slug, status, modified date | Collection `defaultColumns` and Payload list styling. |
| Editor | Title and locale at top, content/SEO tabs, save controls visible, live preview on the right at wide widths | Native edit view plus `admin.livePreview`; on narrow screens the preview is a tab or below the form. |
| Globals | Clear grouped fields with help text | Native global edit view and existing permissions. |

Keep the admin's existing role-aware navigation: editors see content they may
edit; admins also see Globals and Users. Never imply a permission through a
decorative control. The language of admin chrome is independent from the
content locale. Allow keyboard access to every action and avoid placing the
sticky action bar over focused fields.

## Design QA and implementation sequence

1. Verify the prototypes at 375, 768, 1024, and 1440px. Check text reflow,
   visible focus, 4.5:1 normal-text contrast, and reduced motion.
2. Implement the shared tokens and typography, then shell and blocks, then
   home, service, and contact compositions, then Payload theme and dashboard.
3. Verify `lint`, `typecheck`, production build, source HTML in both locales,
   the sitemap, and desktop/mobile screenshots. Admin checks require editor
   and admin accounts with seeded documents.

## Content flags

- `TODO(copy): Vietnamese marketing headlines, descriptions, and action labels`
  wherever new wording is needed beyond the current message catalog and CMS.
- `TODO(data): verified business identity, location, phone, hours, prices, and
  station imagery`. Prototypes deliberately omit these values.
