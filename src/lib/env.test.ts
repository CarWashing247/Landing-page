import { afterEach, describe, expect, it } from 'vitest'

import { requireEnv } from './env'

const KEY = 'AUTOWASH_TEST_ONLY'

afterEach(() => {
  delete process.env[KEY]
})

describe('requireEnv', () => {
  it('returns the value when set', () => {
    process.env[KEY] = 'value'
    expect(requireEnv(KEY)).toBe('value')
  })

  it('throws, naming the variable, when unset', () => {
    expect(() => requireEnv(KEY)).toThrow(KEY)
  })

  it('throws on an empty value rather than returning it', () => {
    process.env[KEY] = ''
    expect(() => requireEnv(KEY)).toThrow(KEY)
  })

  /**
   * The convention is that credentials come from Vault; this is the guard
   * that stops one quietly reappearing in process.env because that was the
   * path of least resistance during a later task.
   */
  it('refuses a Vault-owned key even when the variable is set', () => {
    process.env.PAYLOAD_SECRET = 'set-in-the-environment'

    try {
      expect(() => requireEnv('PAYLOAD_SECRET')).toThrow(/comes from Vault/)
      expect(() => requireEnv('R2_SECRET_ACCESS_KEY')).toThrow(/Vault/)
    } finally {
      delete process.env.PAYLOAD_SECRET
    }
  })
})
