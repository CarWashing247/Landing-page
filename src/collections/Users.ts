import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  PayloadRequest,
} from 'payload'

import { APIError } from 'payload'

import { canUseAdminPanel, isAdmin, isAdminFieldLevel, isAdminOrSelf } from '../lib/access'

const countAdmins = async (req: PayloadRequest): Promise<number> => {
  const { totalDocs } = await req.payload.count({
    collection: 'users',
    where: { role: { equals: 'admin' } },
    // Join the caller's transaction so the count reflects this operation's
    // view of the table rather than a separate snapshot.
    req,
  })

  return totalDocs
}

/**
 * The first account on a fresh database must be an administrator.
 *
 * `role` is admin-only at field level, so the create-first-user flow (no
 * session, therefore not an admin) has it stripped and falls back to the
 * 'editor' default. That would leave a new deployment with no administrator,
 * nobody able to promote one, and this collection hidden — bricked short of
 * SQL. T-04 deploys into exactly that state.
 */
const firstUserIsAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') {
    return data
  }

  const { totalDocs } = await req.payload.count({ collection: 'users', req })

  return totalDocs === 0 ? { ...data, role: 'admin' } : data
}

/**
 * Refuse to demote the last administrator.
 *
 * Verified before this existed: the only admin could PATCH its own role to
 * 'editor', get a 200, and leave zero admins behind. Nobody could then manage
 * accounts or promote anyone, for the same reasons as above.
 */
const keepLastAdminOnChange: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const isDemotion =
    operation === 'update' &&
    originalDoc?.role === 'admin' &&
    typeof data.role === 'string' &&
    data.role !== 'admin'

  if (isDemotion && (await countAdmins(req)) <= 1) {
    // APIError with isPublic, not a bare Error: a bare throw surfaces as a
    // 500 "Something went wrong." and the editor never sees why.
    throw new APIError(
      'Không thể đổi vai trò của quản trị viên cuối cùng. Hãy tạo một quản trị viên khác trước.',
      400,
      null,
      true,
    )
  }

  return data
}

/** Refuse to delete the last administrator, for the same reason. */
const keepLastAdminOnDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const doomed = await req.payload.findByID({ collection: 'users', id, depth: 0, req })

  if (doomed?.role === 'admin' && (await countAdmins(req)) <= 1) {
    throw new APIError(
      'Không thể xoá quản trị viên cuối cùng. Hãy tạo một quản trị viên khác trước.',
      400,
      null,
      true,
    )
  }
}

/**
 * Admin accounts.
 *
 * Two roles: `admin` (developers and the owner) and `editor` (non-technical
 * staff who write content). Only an admin may create or delete accounts, and
 * `role` carries its own field-level guard so an editor cannot promote itself
 * through the REST API even if a future change loosens the collection rules.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Người dùng',
    plural: 'Người dùng',
  },
  auth: true,
  access: {
    // Managing accounts is an admin job. An editor has no reason to see who
    // else has a login, and every reason not to be able to create or delete
    // one.
    create: isAdmin,
    delete: isAdmin,
    // Read and update are scoped to the user's own document rather than
    // denied outright, so an editor can open /admin/account and change their
    // own password. A flat `isAdmin` here 500s that page. `role` is still
    // admin-only at field level, so this grants no escalation.
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    // Who may open /admin at all. Stated explicitly so that adding a third
    // role later does not grant it panel access by default.
    admin: canUseAdminPanel,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'updatedAt'],
    // Cosmetic only — the `access` rules above are the control. This keeps an
    // editor from finding a collection that answers 404 anyway.
    hidden: ({ user }) => user?.role !== 'admin',
  },
  hooks: {
    beforeChange: [firstUserIsAdmin, keepLastAdminOnChange],
    beforeDelete: [keepLastAdminOnDelete],
  },
  fields: [
    // `email` and `password` are added by `auth: true`.
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      label: 'Vai trò',
      options: [
        { label: 'Quản trị viên', value: 'admin' },
        { label: 'Biên tập viên', value: 'editor' },
      ],
      access: {
        // Not `read`: a user may see their own role. Only an admin may set
        // or change one.
        create: isAdminFieldLevel,
        update: isAdminFieldLevel,
      },
      admin: {
        description:
          'Quản trị viên: toàn quyền, kể cả xoá và quản lý người dùng. ' +
          'Biên tập viên: thêm và sửa nội dung, không xoá được.',
      },
    },
  ],
}
