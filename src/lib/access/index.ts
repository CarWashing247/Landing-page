import type { Access, FieldAccess, PayloadRequest } from 'payload'

/**
 * Access control, defined once and shared by every collection.
 *
 * These are the controls, not the admin UI's `hidden` flags: hiding a
 * collection from the sidebar only stops an editor finding a door that would
 * 403 anyway. Test these against the REST API, not the UI (AGENT.md 5.6).
 *
 * Two roles exist (T-03): `admin` and `editor`. `editor` is the
 * non-technical staff account, so the rules are written to make the
 * destructive operations impossible rather than merely discouraged.
 */

/** Signed in and an administrator. */
export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

/** Signed in as either role — the ordinary "can edit content" check. */
export const isAdminOrEditor: Access = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'editor'

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
 * and fetching another user's id is denied.
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
  user?.role === 'admin' || user?.role === 'editor'

/**
 * Public. Only for data that is already public by definition — `Media`, whose
 * images every visitor and crawler must be able to fetch, and published
 * content from T-06 onward.
 */
export const anyone: Access = () => true
