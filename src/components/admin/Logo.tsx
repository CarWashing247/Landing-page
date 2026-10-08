import { BrandIcon } from '../brand/BrandIcon'

/**
 * The brand mark on the admin login screen.
 *
 * Design source: `design/phase3/login.html` (T-19G) — the mark and the product
 * name in a row, white on the slate band across the top of the login card.
 * Payload's slot for this is `admin.components.graphics.Logo`, and `.Icon`
 * (next door) is the small mark in the navigation.
 *
 * **Styled from `admin.css` (`.pd-logo`), not inline.** The band's colour is
 * scoped to Payload's light theme there, and an inline colour could not follow
 * it.
 *
 * **It is a server component with no `'use client'`.** Payload renders both
 * graphics on the server, and neither has any behaviour; the admin is not
 * covered by AGENT.md 5.1, but there is no reason to ship JavaScript for a
 * wordmark either.
 *
 * **The name is a literal here, and that is the one place it is allowed.**
 * AGENT.md 6 forbids user-facing string literals in components because
 * interface text belongs in the message catalog and content belongs in the CMS.
 * This is neither: it is the product's own name on its own login screen, it is
 * not translated in either locale, and reading it from `SiteSettings` would
 * mean a database round trip before an unauthenticated visitor can see a login
 * form — and a blank screen if that read failed.
 */
export const Logo = () => (
  <div className="pd-logo">
    <Icon />
    <span className="pd-logo__name">AutoWash247</span>
  </div>
)

/**
 * The mark in the navigation, and inside the logo above.
 *
 * Drawn inline rather than loaded from `Media`: the navigation renders on every
 * admin screen, an uploaded file would be one more request before the panel is
 * usable, and the mark is two shapes.
 *
 * It shares the public site's vector mark, so the CMS and website use the same
 * car and wash gantry at every size. The wordmark remains live text beside it.
 */
export const Icon = () => (
  <BrandIcon
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    style={{ maxHeight: '32px', maxWidth: '32px' }}
    width="100%"
  />
)
