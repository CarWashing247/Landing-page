import type { ReactNode } from 'react'

import { LocaleLayout } from '../../components/layout/LocaleLayout'

/** English root layout. See `src/app/landing-page/layout.tsx`. */
const Layout = ({ children }: { children: ReactNode }) => (
  <LocaleLayout locale="en">{children}</LocaleLayout>
)

export default Layout
