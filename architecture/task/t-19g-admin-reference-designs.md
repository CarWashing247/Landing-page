# T-19G · CMS admin reference designs

**Depends on:** T-19F, T-19D (both merged).

**Branch:** `t-19g-admin-reference-designs`.

**Scope:** Design artifacts and documentation only. No Payload schema, admin component, or public page changes.

## Intent

Extend the approved dashboard design to the remaining Payload admin views so a later enhancement task has explicit desktop and mobile references. Use UI UX Pro Max for responsive layout, hierarchy, touch targets, focus states and form/list guidance while retaining the dashboard's visual system.

## Acceptance criteria

- Standalone HTML and PNG captures at 1440px and 390px exist in `design/phase3` for Pages, Services, Media, Business information, Site settings, Users, Contact submissions, Account and Login, including relevant list/detail or editor states.
- References use the dashboard rail, top bar, color, typography and action hierarchy. Mobile pages have no horizontal overflow.
- Fields and permissions reflect current Payload configs. Placeholder content is clearly marked and no real address, phone, prices or contact submissions are invented.
- The design handoff identifies which elements remain native Payload behavior and which visual decisions are the intended next-stage enhancement.

## Verification

Render every HTML reference in Chromium at 1440×900 and 390×844. Inspect the captures, check `document.documentElement.scrollWidth <= window.innerWidth`, and exercise the mobile menu. Because this task does not change the application, build, lint and typecheck are regression checks, not image checks.

The local `npm run build` command currently fails before compilation because Turbopack cannot bind its worker port (`Operation not permitted`). `npx next build --webpack` is the diagnostic fallback for this environment; it compiled, prerendered and completed successfully on 2026-10-07. This is not a change to the repository build command.
