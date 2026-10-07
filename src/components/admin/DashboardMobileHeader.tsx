'use client'

import { NavToggler, useTranslation } from '@payloadcms/ui'

import { Icon } from './Logo'

/** Compact brand bar with Payload's own translated navigation toggle. */
export const DashboardMobileHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="pd-mobile-header">
      <a className="pd-brand" href="/admin">
        <Icon />
        <span>AutoWash247</span>
      </a>
      <NavToggler className="pd-mobile-header__menu">{t('general:menu')}</NavToggler>
    </div>
  )
}
