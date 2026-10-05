import type { ReactNode } from 'react'

import { LocaleLayout } from '../../components/layout/LocaleLayout'
import { rootMetadata } from '../../components/seo/metadata'

/** See `src/app/landing-page/layout.tsx` for why this is here and not inline. */
export const metadata = rootMetadata()

/** English root layout. See `src/app/landing-page/layout.tsx`. */
const Layout = ({ children }: { children: ReactNode }) => (
  <LocaleLayout locale="en">{children}</LocaleLayout>
)

export default Layout
