import type { CollectionConfig } from 'payload'

import { canUseAdminPanel, isAdmin, isAdminFieldLevel, isAdminOrSelf } from '../lib/access'

/**
 * Admin accounts.
 *
 * Two roles: `admin` (developers and the owner) and `editor` (non-technical
 * staff who write content). Only an admin may touch this collection at all,
 * and `role` carries its own field-level guard so an editor cannot promote
 * itself through the REST API even if a future change loosens the
 * collection-level rules.
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
    // Cosmetic only — the `access` rules above are the control. This just
    // keeps an editor from finding a collection that would 403.
    hidden: ({ user }) => user?.role !== 'admin',
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') {
          return data
        }

        // The first account on a fresh database must be an administrator.
        //
        // `role` is admin-only at field level, so the create-first-user flow
        // (no session, therefore not an admin) has it stripped and falls back
        // to the 'editor' default. That would leave a new deployment with no
        // administrator, nobody able to promote one, and the Users collection
        // hidden — effectively bricked. T-04 deploys into exactly that state.
        const { totalDocs } = await req.payload.count({
          collection: 'users',
          req,
        })

        if (totalDocs === 0) {
          return { ...data, role: 'admin' }
        }

        return data
      },
    ],
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
