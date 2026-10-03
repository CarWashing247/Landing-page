import { describe, expect, it } from 'vitest'

import { segmentsFrom, slugFrom, withoutInternal } from './adminParams'

const request = (path: string) => new Request(`http://localhost:3000${path}`)

describe('segmentsFrom', () => {
  it('splits the rewrite parameter into Payload segments', () => {
    expect(segmentsFrom({ __p: 'collections/users' })).toEqual(['collections', 'users'])
  })

  it('returns no segments for the dashboard', () => {
    // `/` is the sentinel the bare /admin rewrite sends
    expect(segmentsFrom({ __p: '/' })).toEqual([])
    expect(segmentsFrom({ __p: '' })).toEqual([])
    expect(segmentsFrom({})).toEqual([])
  })

  it('ignores empty path parts', () => {
    expect(segmentsFrom({ __p: '/collections//users/' })).toEqual(['collections', 'users'])
  })

  it('returns no segments when the parameter is repeated', () => {
    expect(segmentsFrom({ __p: ['account', 'collections/users'] })).toEqual([])
  })
})

describe('withoutInternal', () => {
  it('strips the rewrite parameter and keeps the rest', () => {
    expect(withoutInternal({ __p: 'collections/users', limit: '10', where: ['a', 'b'] })).toEqual({
      limit: '10',
      where: ['a', 'b'],
    })
  })

  it('drops undefined values', () => {
    expect(withoutInternal({ page: undefined })).toEqual({})
  })
})

describe('slugFrom', () => {
  it('derives the slug from the public API path', () => {
    expect(slugFrom(request('/api/users/login'))).toEqual(['users', 'login'])
    expect(slugFrom(request('/api/users?limit=1'))).toEqual(['users'])
  })

  it('returns no slug for the API root', () => {
    expect(slugFrom(request('/api'))).toEqual([])
    expect(slugFrom(request('/api/'))).toEqual([])
  })

  it('does not treat a path that merely starts with "api" as the API', () => {
    expect(slugFrom(request('/apiary/users'))).toEqual([])
  })

  // Regression: an earlier version fell back to `__p`, which made this a
  // working second login endpoint that bypassed path-based controls.
  it('never reads a slug from the query string', () => {
    expect(slugFrom(request('/crm/api/slug?__p=users/login'))).toEqual([])
  })
})
