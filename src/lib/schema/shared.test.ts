import { beforeAll, describe, expect, it } from 'vitest'

import { absoluteUrl, businessId, isPlaceholder, nodeId, prune, publishable } from './shared'

const ORIGIN = 'https://autowash247.vn'

beforeAll(() => {
  // `siteOrigin()` reads this at call time. Set with a trailing slash on
  // purpose: stripping it is the helper's job and three environments write it
  // by hand.
  process.env.NEXT_PUBLIC_SITE_URL = `${ORIGIN}/`
})

describe('prune', () => {
  it('drops null, undefined and empty strings', () => {
    expect(prune({ a: 1, b: null, c: undefined, d: '' })).toEqual({ a: 1 })
  })

  it('keeps false and zero', () => {
    // The classic version of this bug: a price of 0 is a real price.
    expect(prune({ free: true, flag: false, price: 0 })).toEqual({ flag: false, free: true, price: 0 })
  })

  it('drops an object left empty by pruning, recursively', () => {
    expect(prune({ keep: 'yes', geo: { latitude: null, longitude: null } })).toEqual({ keep: 'yes' })
  })

  it('drops an empty array and prunes inside a kept one', () => {
    expect(prune({ sameAs: [], hours: [{ opens: '07:30', closes: null }] })).toEqual({
      hours: [{ opens: '07:30' }],
    })
  })

  it('returns undefined for an object with nothing left', () => {
    expect(prune({ a: null, b: '' })).toBeUndefined()
  })
})

describe('isPlaceholder', () => {
  it('recognises the repo’s TODO(data) convention', () => {
    expect(isPlaceholder('TODO(data): phone number')).toBe(true)
    expect(isPlaceholder('  TODO(data): street address')).toBe(true)
  })

  it('does not flag real values that merely mention a todo', () => {
    expect(isPlaceholder('Rửa xe TODO')).toBe(false)
    expect(isPlaceholder('024 1234 5678')).toBe(false)
  })
})

describe('publishable', () => {
  it('rejects blank, missing and placeholder values', () => {
    expect(publishable(null)).toBeUndefined()
    expect(publishable(undefined)).toBeUndefined()
    expect(publishable('   ')).toBeUndefined()
    expect(publishable('TODO(data): registered business name')).toBeUndefined()
  })

  it('passes a real value through unchanged', () => {
    expect(publishable('AutoWash247')).toBe('AutoWash247')
  })
})

describe('absoluteUrl', () => {
  it('spells the home page the way the canonical tag spells it', () => {
    // Measured against the built server: the schema said `.../` while the
    // canonical said `...` with no slash, and to Google those are two URLs.
    expect(absoluteUrl('/')).toBe(ORIGIN)
  })

  it('leaves every other path alone', () => {
    expect(absoluteUrl('/en')).toBe(`${ORIGIN}/en`)
    expect(absoluteUrl('/dich-vu/rua-xe-nhanh')).toBe(`${ORIGIN}/dich-vu/rua-xe-nhanh`)
  })
})

describe('node ids', () => {
  it('strips the trailing slash so an @id matches the canonical URL exactly', () => {
    // A trailing slash makes it a different node to Google, and `Service.provider`
    // links to this string.
    expect(businessId()).toBe(`${ORIGIN}/#business`)
    expect(nodeId('/dich-vu/rua-xe-nhanh', 'service')).toBe(
      `${ORIGIN}/dich-vu/rua-xe-nhanh#service`,
    )
  })
})
