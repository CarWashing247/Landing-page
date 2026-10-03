import { describe, expect, it } from 'vitest'

import { anyone, canUseAdminPanel, isAdmin, isAdminFieldLevel, isAdminOrEditor, isAdminOrSelf } from '.'

/**
 * These functions are the access control, so a regression here is a security
 * bug rather than a broken feature. Called directly with the minimum shape
 * Payload passes them.
 */
type Role = 'admin' | 'editor'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const as = (user: { id?: number; role?: Role } | null): any => ({ req: { user } })

const admin = as({ id: 1, role: 'admin' })
const editor = as({ id: 2, role: 'editor' })
const anonymous = as(null)
// A role that does not exist yet must not be treated as privileged.
const unknownRole = as({ id: 3, role: 'viewer' as Role })

describe('isAdmin', () => {
  it('admits only admins', () => {
    expect(isAdmin(admin)).toBe(true)
    expect(isAdmin(editor)).toBe(false)
    expect(isAdmin(anonymous)).toBe(false)
    expect(isAdmin(unknownRole)).toBe(false)
  })
})

describe('isAdminOrEditor', () => {
  it('admits both known roles and nobody else', () => {
    expect(isAdminOrEditor(admin)).toBe(true)
    expect(isAdminOrEditor(editor)).toBe(true)
    expect(isAdminOrEditor(anonymous)).toBe(false)
    expect(isAdminOrEditor(unknownRole)).toBe(false)
  })
})

describe('isAdminFieldLevel', () => {
  it('is what stops an editor promoting itself', () => {
    expect(isAdminFieldLevel(admin)).toBe(true)
    expect(isAdminFieldLevel(editor)).toBe(false)
    expect(isAdminFieldLevel(anonymous)).toBe(false)
  })
})

describe('isAdminOrSelf', () => {
  it('gives admins everything', () => {
    expect(isAdminOrSelf(admin)).toBe(true)
  })

  it('scopes anyone else to their own document', () => {
    expect(isAdminOrSelf(editor)).toEqual({ id: { equals: 2 } })
  })

  it('denies anonymous requests outright', () => {
    expect(isAdminOrSelf(anonymous)).toBe(false)
  })

  it('scopes an unknown role rather than admitting it', () => {
    expect(isAdminOrSelf(unknownRole)).toEqual({ id: { equals: 3 } })
  })
})

describe('canUseAdminPanel', () => {
  it('admits both known roles only', () => {
    expect(canUseAdminPanel(admin)).toBe(true)
    expect(canUseAdminPanel(editor)).toBe(true)
    expect(canUseAdminPanel(anonymous)).toBe(false)
    expect(canUseAdminPanel(unknownRole)).toBe(false)
  })
})

describe('anyone', () => {
  it('admits anonymous requests, which is the point', () => {
    expect(anyone(anonymous)).toBe(true)
  })
})
