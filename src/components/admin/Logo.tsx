/**
 * The brand mark on the admin login screen.
 *
 * Design source: the Canva deck "AutoWash247 CMS Admin UI" (`DAHXOjaoczk`),
 * page 1 — the login card sits on a dark surface with the product name above
 * the form. Payload's slot for this is `admin.components.graphics.Logo`, and
 * `.Icon` (next door) is the small mark in the navigation.
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
  <div
    style={{
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}
  >
    <Icon />
    <span
      style={{
        color: 'var(--theme-text)',
        fontSize: '1.5rem',
        fontWeight: 700,
        letterSpacing: '-0.01em',
      }}
    >
      AutoWash247
    </span>
  </div>
)

/**
 * The mark in the navigation, and inside the logo above.
 *
 * Drawn inline rather than loaded from `Media`: the navigation renders on every
 * admin screen, an uploaded file would be one more request before the panel is
 * usable, and the mark is two shapes.
 *
 * **The two colours are literals, which is correct here and nowhere else.** The
 * admin follows Payload's own design now (T-19B), so it does not participate in
 * the public site's token system — there is no `@theme` in this document to read
 * from, and `src/app/brand.css` was deleted with the bespoke theme it existed to
 * feed. These are the same values as `src/app/icon.svg`, from
 * `design/phase3/tokens.css`: the action colour, and the white it is
 * paired with. A logo is also the one thing that should *not* follow the
 * surrounding theme — it is the same mark whether the panel is light or dark.
 */
export const Icon = () => (
  /*
   * Sized by its container, not by itself. Payload's header slot is shorter
   * than it is wide, and a fixed 32x32 was cropped to a sliver of the rounded
   * square — `preserveAspectRatio` plus a 100% box lets it scale to whichever
   * slot it lands in (the header mark and the login graphic are different
   * sizes).
   */
  <svg
    aria-hidden="true"
    fill="none"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    style={{ maxHeight: '32px', maxWidth: '32px' }}
    viewBox="0 0 32 32"
    width="100%"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#059669" height="32" rx="8" width="32" />
    {/* A water droplet, in the colour the accent is paired with. */}
    <path
      d="M16 7c3.6 4.2 6 7.4 6 10.2a6 6 0 0 1-12 0C10 14.4 12.4 11.2 16 7Z"
      fill="#ffffff"
    />
  </svg>
)
