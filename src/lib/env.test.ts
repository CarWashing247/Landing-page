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
})
