/**
 * The AutoWash247 mark: a water droplet cut by two speed lines.
 *
 * Drawn from the generated logo brief (`ui-ux-pro-max`, Automotive industry
 * profile): geometric, symmetrical, "powerful reliable dynamic", avoiding
 * "weak delicate complex". The droplet says what the business does and the
 * speed lines say how fast — two ideas, no more, which is what keeps it legible
 * at favicon size.
 *
 * **It carries no text, deliberately.** A wordmark would bake "AutoWash247"
 * into an asset, and AGENT.md forbids hardcoding business details in a
 * component — the brand name lives in `SiteSettings.brandName`. So the header
 * composes this mark with live text, and the two together are the logo. Renaming
 * the business stays a CMS edit.
 *
 * Everything is `currentColor`, so it inherits whatever it sits on — black on
 * the green header, white on a dark panel — and never needs a second copy for a
 * different background.
 */
export const Mark = ({ className, title }: { className?: string; title?: string }) => (
  <svg
    aria-hidden={title ? undefined : 'true'}
    className={className}
    fill="none"
    role={title ? 'img' : undefined}
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
  >
    {title ? <title>{title}</title> : null}

    {/*
      The droplet. A single closed path rather than a circle plus a triangle, so
      it stays one shape when it is 16px wide and the join would otherwise show.
    */}
    <path
      d="M20 4.5c0 0-7.5 8.2-7.5 13a7.5 7.5 0 0 0 15 0c0-4.8-7.5-13-7.5-13Z"
      fill="currentColor"
    />

    {/* Speed lines: three, shortening upward, so the eye reads motion leftward. */}
    <path
      d="M2 11.5h8M2 17h6M2 22.5h4"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2.5"
    />
  </svg>
)
