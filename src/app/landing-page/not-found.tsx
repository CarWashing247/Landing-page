import { NotFoundPage } from '../../components/NotFoundPage'

/**
 * The 404 for an unknown Vietnamese slug: `[slug]/page.tsx` and
 * `dich-vu/[slug]/page.tsx` call `notFound()`, and this boundary renders inside
 * this folder's layout, so the header and footer are the real ones.
 *
 * The catch-all rewrite means a public URL always matches a route here, which is
 * why `global-not-found.tsx` does not cover these. Next sends the 404 status and
 * `noindex` with an empty HTML shell and paints this after hydration — see
 * `NotFoundPage` and follow-up A1.
 */
const NotFound = () => <NotFoundPage locale="vi" />

export default NotFound
