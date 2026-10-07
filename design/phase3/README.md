# Phase 3 CMS admin references

The merged dashboard remains the visual source for the admin shell: [dashboard.html](dashboard.html), [desktop](autowash-dashboard-desktop.png), and [mobile](autowash-dashboard-mobile.png). The references below extend that shell to the other Payload views. They are static, English-first design artifacts for a later implementation task; the existing CMS continues to own navigation, forms, permissions, authentication, uploads, previews, and data.

All new pages use [admin-reference.css](admin-reference.css) and [tokens.css](tokens.css). Open an HTML file directly in a browser. Each has matching `-desktop.png` (1440px) and `-mobile.png` (390px) captures. The pale yellow annotation strip and blue implementation notes explain the mockup; they are not product UI.

| View | HTML reference | Key behavior for implementation |
| --- | --- | --- |
| Pages list | [pages-list.html](pages-list.html) | Search, status, locale, title, slug, updated time; card rows on phones |
| Page editor | [page-editor.html](page-editor.html) | Content/SEO/versions, localized fields, native block picker, preview and publish |
| Services list | [services-list.html](services-list.html) | Compare price, duration and status without opening each package |
| Service editor | [services-editor.html](services-editor.html) | VND price, whole-minute duration, ordered inclusions, required shared photo |
| Media library | [media-library.html](media-library.html) | Image grid, search, upload, required localized alternative text |
| Media detail | [media-detail.html](media-detail.html) | Asset preview and localized alternative text |
| Business information | [business-info.html](business-info.html) | Admin-only, verified contact values and seven fixed opening-hours rows |
| Site settings | [site-settings.html](site-settings.html) | Admin-only Brand, SEO defaults and Analytics tabs |
| Users | [users.html](users.html) | Admin-only list and role visibility |
| User editor | [user-editor.html](user-editor.html) | Admin-only role assignment; preserve the last-admin guard |
| Contact submissions | [contact-submissions.html](contact-submissions.html) | Admin-only list of read-only submissions |
| Contact detail | [contact-detail.html](contact-detail.html) | View submitted data; Payload allows admin deletion, no editing |
| Account | [account.html](account.html) | Personal account settings, separate from content locale |
| Login | [login.html](login.html) | Payload authentication, validation, recovery, password-manager support |

## How to implement later

- Keep the 244px slate desktop rail, 90px mobile brand bar, 72px white top bar, red selected item and CTA, card radius, and spacing already established by the dashboard. Existing `admin.html` is an older page-editor concept; use `page-editor.html` for the next pass.
- Use Payload's native form, upload, account, login, access and localization systems. Keep native list mechanics for Pages, Services, Users and Contact submissions. The Media grid is a proposed visual enhancement inside Payload and needs its own later implementation decision. The HTML controls are visual examples, not replacements. Do not add a second admin router or client-side data source.
- Use the actual collection and global configuration as the field and permission contract. In particular, editors cannot access Users, Globals or Contact submissions; Contact submissions have no create/update access, while admins can delete them.
- Replace every `TODO(copy)` with approved localized editorial copy and every `TODO(data)` with verified records. Dates, contact details, prices, names and images in the references are intentionally schematic.
- Implement and verify the actual mobile drawer, keyboard focus, save feedback, list filtering and error states with Payload. The static prototypes only expose the layout.

These references were generated with the UI UX Pro Max workflow, then checked in Chromium at desktop and mobile widths. The design preserves the repository's existing Inter/Inter Tight and red/slate identity instead of adopting a generic palette suggested by the skill.
