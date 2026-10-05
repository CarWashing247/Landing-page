import type { ReactNode } from 'react'

import { LocaleLayout } from '../../components/layout/LocaleLayout'
import { rootMetadata } from '../../components/seo/metadata'

/**
 * `metadataBase`, so every relative URL below this layout — the canonical, the
 * `hreflang` set, `og:image` — resolves to an absolute one. Without it Facebook
 * and Zalo get a relative `og:image` and silently show no preview, which is the
 * single most common way this stack breaks sharing.
 *
 * Evaluated at module load, so a missing `NEXT_PUBLIC_SITE_URL` fails the build
 * rather than shipping a site whose share cards are all quietly broken. It is
 * built by `rootMetadata()` rather than written here so the two locale layouts
 * cannot drift and so no `Metadata` object is assembled outside
 * `src/components/seo/metadata.ts` (AGENT.md 5.2).
 */
export const metadata = rootMetadata()

/**
 * Vietnamese root layout. The locale is a literal, not a lookup — see
 * `src/lib/locales.ts` FOLDER_FOR for why.
 */
const Layout = ({ children }: { children: ReactNode }) => (
  <LocaleLayout locale="vi">{children}</LocaleLayout>
)

export default Layout
