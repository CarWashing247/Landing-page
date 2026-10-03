import { describe, expect, it } from 'vitest'

import { anyone, canUseAdminPanel, isAdmin, isAdminFieldLevel, isAdminOrEditor, isAdminOrSelf } from '.'

/**
 * These functions are the access control, so a regression here is a security
 * bug rather than a broken feature. Called directly with the minimum shape
 * Payload passes them.
 */
/** `role` is deliberately a plain string so unknown roles can be tested. */
type TestUser = { id?: number; role?: string }

/**
 * Builds the argument Payload passes these functions. Cast through `unknown`
 * rather than `any`, which AGENT.md section 6 forbids: a full
 * `PayloadRequest` is irrelevant here, as every one of these reads only
 * `req.user`.
 */
const as = <T>(user: TestUser | null): T => ({ req: { user } }) as unknown as T

const admin: TestUser = { id: 1, role: 'admin' }
const editor: TestUser = { id: 2, role: 'editor' }
// A role nobody has defined must not inherit staff access.
const unknownRole: TestUser = { id: 3, role: 'viewer' }

describe('isAdmin', () => {
  it('admits only admins', () => {
    expect(isAdmin(as(admin))).toBe(true)
    expect(isAdmin(as(editor))).toBe(false)
    expect(isAdmin(as(null))).toBe(false)
    expect(isAdmin(as(unknownRole))).toBe(false)
  })
})

describe('isAdminOrEditor', () => {
  it('admits both known roles and nobody else', () => {
    expect(isAdminOrEditor(as(admin))).toBe(true)
    expect(isAdminOrEditor(as(editor))).toBe(true)
    expect(isAdminOrEditor(as(null))).toBe(false)
    expect(isAdminOrEditor(as(unknownRole))).toBe(false)
  })
})

describe('isAdminFieldLevel', () => {
  it('is what stops an editor promoting itself', () => {
    expect(isAdminFieldLevel(as(admin))).toBe(true)
    expect(isAdminFieldLevel(as(editor))).toBe(false)
    expect(isAdminFieldLevel(as(null))).toBe(false)
  })
})

describe('isAdminOrSelf', () => {
  it('gives admins everything', () => {
    expect(isAdminOrSelf(as(admin))).toBe(true)
  })

  it('scopes anyone else to their own document', () => {
    expect(isAdminOrSelf(as(editor))).toEqual({ id: { equals: 2 } })
  })

  it('denies anonymous requests outright', () => {
    expect(isAdminOrSelf(as(null))).toBe(false)
  })

  it('scopes an unknown role rather than admitting it', () => {
    expect(isAdminOrSelf(as(unknownRole))).toEqual({ id: { equals: 3 } })
  })
})

describe('canUseAdminPanel', () => {
  it('admits both known roles only', () => {
    expect(canUseAdminPanel(as(admin))).toBe(true)
    expect(canUseAdminPanel(as(editor))).toBe(true)
    expect(canUseAdminPanel(as(null))).toBe(false)
    expect(canUseAdminPanel(as(unknownRole))).toBe(false)
  })
})

describe('anyone', () => {
  it('admits anonymous requests, which is the point', () => {
    expect(anyone(as(null))).toBe(true)
  })
})
