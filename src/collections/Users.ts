import type { CollectionConfig } from 'payload'

/**
 * Minimal auth collection so /admin has something to log in with.
 *
 * Roles and access control are T-03 — deliberately absent here. Until that
 * lands, every user is a full admin, so do not create editor accounts yet.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Người dùng',
    plural: 'Người dùng',
  },
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'updatedAt'],
  },
  fields: [
    // `email` and `password` are added by `auth: true`.
  ],
}
