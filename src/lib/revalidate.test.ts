import { describe, expect, it } from 'vitest'

import { SECRET_HEADER, isRevalidatePayload } from './revalidate'

/**
 * The guard is the endpoint's whole input contract: anything it lets through is
 * passed to `revalidateTag`. A purge endpoint behind a shared secret should not
 * also be a place where a surprising body shape does something surprising.
 */

describe('isRevalidatePayload', () => {
  it('accepts a list of non-empty tag strings', () => {
    expect(isRevalidatePayload({ tags: ['sitemap'] })).toBe(true)
    expect(isRevalidatePayload({ tags: ['page:vi:bang-gia', 'globals'] })).toBe(true)
  })

  it('accepts an empty list, which purges nothing', () => {
    // Valid but inert. The hook never sends one; rejecting it would turn a
    // harmless no-op into a 400 the editor's save would have to swallow.
    expect(isRevalidatePayload({ tags: [] })).toBe(true)
  })

  it('rejects anything that is not an object with a tags array', () => {
    for (const body of [null, undefined, 'sitemap', 42, [], { nope: true }, { tags: 'sitemap' }]) {
      expect(isRevalidatePayload(body)).toBe(false)
    }
  })

  it('rejects a list holding anything but non-empty strings', () => {
    // An empty tag would be passed to `revalidateTag` and silently match
    // nothing, which looks identical to a purge that worked.
    for (const tags of [[''], ['ok', ''], ['ok', null], ['ok', 7], [['nested']], [{}]]) {
      expect(isRevalidatePayload({ tags })).toBe(false)
    }
  })

  it('ignores extra keys rather than rejecting them', () => {
    // Forwards-compatible: a future caller sending more than it needs to still
    // gets its tags purged.
    expect(isRevalidatePayload({ extra: 'ignored', tags: ['globals'] })).toBe(true)
  })
})

describe('the secret header', () => {
  it('is lower case, because that is how fetch and Headers normalise it', () => {
    expect(SECRET_HEADER).toBe(SECRET_HEADER.toLowerCase())
  })
})
