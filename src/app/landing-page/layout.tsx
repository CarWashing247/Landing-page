import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import '../globals.css'

/**
 * Landing-page root layout.
 *
 * `metadataBase` lands here in T-09 and nowhere else — without it, Open
 * Graph image URLs are relative and Facebook/Zalo silently fail to pull the
 * image (AGENT.md section 5.2). Fonts are T-15.
 */
export const metadata: Metadata = {
  title: 'AutoWash247',
}

const LandingPageLayout = ({ children }: { children: ReactNode }) => (
  <html lang="vi">
    <body>{children}</body>
  </html>
)

export default LandingPageLayout
