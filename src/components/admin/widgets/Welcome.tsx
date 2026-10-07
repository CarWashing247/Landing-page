/**
 * The dashboard's opening block, from `design/phase3/dashboard.html`: what this
 * workspace is for, and the one action an editor most often wants.
 *
 * It is a widget rather than a replaced view because Payload's own dashboard
 * shell owns the page around it — the same boundary the rest of this screen
 * keeps. The prototype draws this as a page header; a full-width widget in the
 * first layout slot is where that lands without taking over the view.
 */
export const WelcomeWidget = () => (
  <div className="pd-welcome">
    <div>
      <span className="pd-welcome__eyebrow">Content workspace</span>
      <h1 className="pd-welcome__title">Manage your site.</h1>
      <p className="pd-welcome__lead">
        Publish pages, maintain services, and review the content visitors see.
      </p>
    </div>

    {/*
      Payload's own create route, not a custom one — the button is a shortcut to
      the view the navigation already reaches.
    */}
    <a className="pd-welcome__action" href="/admin/collections/pages/create">
      Create page
    </a>
  </div>
)
