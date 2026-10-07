import type { WidgetServerProps } from 'payload'

import { adminMessage } from '../../../i18n/admin-translations'

/**
 * The dashboard's opening block, from `design/phase3/dashboard.html`: what this
 * workspace is for, and the one action an editor most often wants.
 *
 * It is a widget rather than a replaced view because Payload's own dashboard
 * shell owns the page around it — the same boundary the rest of this screen
 * keeps. The prototype draws this as a page header; a full-width widget in the
 * first layout slot is where that lands without taking over the view.
 */
export const WelcomeWidget = ({ req }: WidgetServerProps) => (
  <div className="pd-welcome">
    <div>
      <span className="pd-welcome__eyebrow">{adminMessage(req, 'dashboardEyebrow')}</span>
      <h1 className="pd-welcome__title">{adminMessage(req, 'dashboardTitle')}</h1>
      <p className="pd-welcome__lead">{adminMessage(req, 'dashboardLead')}</p>
    </div>

    {/*
      Payload's own create route, not a custom one — the button is a shortcut to
      the view the navigation already reaches.
    */}
    <a className="pd-welcome__action" href="/admin/collections/pages/create">
      {adminMessage(req, 'dashboardCreatePage')}
    </a>
  </div>
)
