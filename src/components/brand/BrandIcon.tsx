import type { SVGProps } from 'react'

/** Car entering an A-shaped automatic wash gantry. Shared by the public and CMS marks. */
export const BrandIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    fill="none"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="32" height="32" rx="7" fill="#c62929" />
    <path
      d="M3.7 27 9.8 5h12.4l6.1 22h-4.2l-4.9-18h-6.4L7.9 27H3.7Z"
      fill="#fff"
    />
    <path d="M13 13v3m6-3v3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    <path
      d="m10 22 1.8-3.3c.3-.5.9-.8 1.5-.8h5.4c.6 0 1.2.3 1.5.8L22 22v4H10v-4Z"
      fill="#fff"
    />
    <path d="m12.7 21 1-1.7h4.6l1 1.7h-6.6Z" fill="#c62929" />
    <path d="M11.8 24h2m4.4 0h2" stroke="#c62929" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)
