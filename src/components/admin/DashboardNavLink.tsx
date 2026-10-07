'use client'

import { useNav, useTranslation } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { adminTranslations } from '../../i18n/admin-translations'

/** Keep the desktop rail visible; Payload still owns mobile drawer behavior. */
export const DashboardNavLink = () => {
  const pathname = usePathname()
  const { navOpen, setNavOpen } = useNav()
  const { i18n, t } = useTranslation()
  const isDashboard = pathname === '/admin' || pathname === '/admin/'
  const workspace = i18n.language === 'vi'
    ? adminTranslations.vi.custom.dashboardWorkspace
    : adminTranslations.en.custom.dashboardWorkspace

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 701px)')
    const openOnDesktop = () => {
      if (desktop.matches) setNavOpen(true)
    }

    openOnDesktop()
    desktop.addEventListener('change', openOnDesktop)
    return () => desktop.removeEventListener('change', openOnDesktop)
  }, [navOpen, setNavOpen])

  return (
    <div className="pd-nav-dashboard-group">
      <span className="pd-nav-caption">{workspace}</span>
      <a
        aria-current={isDashboard ? 'page' : undefined}
        className={`pd-nav-dashboard${isDashboard ? ' pd-nav-dashboard--active' : ''}`}
        href="/admin"
      >
        {t('general:dashboard')}
      </a>
    </div>
  )
}
