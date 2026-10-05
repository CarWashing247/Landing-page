import type { Access, FieldAccess, PayloadRequest } from 'payload'

/**
 * Access control, defined once and shared by every collection.
 *
 * These are the controls, not the admin UI's `hidden` flags: hiding a
 * collection from the sidebar only stops an editor finding a door that would
 * 404 anyway. Test these against the REST API, not the UI (AGENT.md 5.6).
 *
 * Two roles exist (T-03): `admin` and `editor`. `editor` is the
 * non-technical staff account, so the rules are written to make the
 * destructive operations impossible rather than merely discouraged.
 */

/** The roles allowed to sign in to /admin and edit content. */
const STAFF_ROLES = ['admin', 'editor'] as const

/**
 * Written as an allow-list so a role added later is denied until it is named
 * here, rather than inheriting staff access by accident.
 */
const isStaff = (user: { role?: string } | null | undefined): boolean =>
  Boolean(user?.role && (STAFF_ROLES as readonly string[]).includes(user.role))

/** Signed in and an administrator. */
export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

/** Signed in as either staff role — the ordinary "can edit content" check. */
export const isAdminOrEditor: Access = ({ req: { user } }) => isStaff(user)

/**
 * Field-level variant. Used on `Users.role` so an editor cannot promote
 * itself: without it, `PATCH /api/users/<own-id>` with `{"role":"admin"}`
 * is a complete privilege escalation.
 */
export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) => user?.role === 'admin'

/**
 * Admins see every account; anyone else sees only their own.
 *
 * Returning a `Where` query rather than a boolean is what makes this work:
 * Payload filters the rows instead of refusing the request. Needed because a
 * flat `isAdmin` on `Users.read` makes /admin/account return 500 for an
 * editor — verified — so they cannot change their own password or email.
 * Other accounts stay invisible: an editor's list contains exactly one row
 * and fetching another user's id returns 404.
 */
export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) {
    return false
  }

  if (user.role === 'admin') {
    return true
  }

  return { id: { equals: user.id } }
}

/**
 * Who may open /admin at all.
 *
 * Separate from `isAdminOrEditor` because `access.admin` is typed more
 * narrowly than the others: it returns a plain boolean, where `Access` may
 * also return a `Where` query to filter rows.
 */
export const canUseAdminPanel = ({ req: { user } }: { req: PayloadRequest }): boolean =>
  isStaff(user)

/**
 * Public. Only for data that is already public by definition — `Media`, whose
 * images every visitor and crawler must be able to fetch, and published
 * content from T-06 onward.
 */
export const anyone: Access = () => true

/**
 * Public reads see published documents; staff see drafts as well.
 *
 * This is `anyone` for anything with `versions: { drafts: true }`, and it has to
 * be a `Where` rather than a boolean for the same reason `isAdminOrSelf` does:
 * Payload filters the rows instead of refusing the request. A flat `anyone` on
 * a drafted collection serves unpublished work to `GET /api/pages` — and to
 * crawlers — because the draft filter is a query concern, not an access one.
 *
 * Staff keep the unfiltered view so the admin list shows drafts, which is the
 * whole point of having them.
 */
export const publishedOrStaff: Access = ({ req: { user } }) => {
  if (isStaff(user)) {
    return true
  }

  return { _status: { equals: 'published' } }
}
