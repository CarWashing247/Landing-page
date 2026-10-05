import { describe, expect, it } from 'vitest'

import { PARAM, isPreviewable, pathForPreview, previewUrl, safeLocalPath } from './preview'

const secret = 'test-secret'

describe('previewUrl', () => {
  it('carries the four parameters the draft route reads', () => {
    const url = new URL(
      previewUrl({ collection: 'pages', locale: 'vi', secret, slug: 'bang-gia' })!,
      'http://x',
    )

    expect(url.pathname).toBe('/api/draft')
    expect(url.searchParams.get(PARAM.collection)).toBe('pages')
    expect(url.searchParams.get(PARAM.locale)).toBe('vi')
    expect(url.searchParams.get(PARAM.slug)).toBe('bang-gia')
    expect(url.searchParams.get(PARAM.secret)).toBe(secret)
  })

  it('is relative, so a preview deployment never links to production', () => {
    expect(previewUrl({ collection: 'pages', locale: 'vi', secret, slug: 'x' })).toMatch(/^\/api\//)
  })

  it('escapes a slug rather than splicing it into the query', () => {
    const url = previewUrl({ collection: 'pages', locale: 'vi', secret, slug: 'a&b=c' })!

    expect(url).not.toContain('a&b=c')
    expect(new URL(url, 'http://x').searchParams.get(PARAM.slug)).toBe('a&b=c')
  })

  it('returns null when there is nothing to preview', () => {
    // Payload hides the button rather than offering one that cannot resolve.
    for (const slug of [undefined, null, '', 7, {}]) {
      expect(previewUrl({ collection: 'pages', locale: 'vi', secret, slug })).toBeNull()
    }
  })

  it('returns null for a locale this site does not serve', () => {
    expect(previewUrl({ collection: 'pages', locale: 'fr', secret, slug: 'x' })).toBeNull()
  })
})

describe('pathForPreview', () => {
  it('uses the localized service segment, not a shared one', () => {
    expect(pathForPreview('pages', 'bang-gia', 'vi')).toBe('/bang-gia')
    expect(pathForPreview('pages', 'pricing', 'en')).toBe('/en/pricing')
    expect(pathForPreview('services', 'rua-xe-nhanh', 'vi')).toBe('/dich-vu/rua-xe-nhanh')
    expect(pathForPreview('services', 'quick-wash', 'en')).toBe('/en/services/quick-wash')
  })
})

describe('isPreviewable', () => {
  it('admits only the two content collections', () => {
    expect(isPreviewable('pages')).toBe(true)
    expect(isPreviewable('services')).toBe(true)

    // `users` and `media` must never be previewable: the draft route reads with
    // overrideAccess, so the collection list is a real boundary.
    for (const value of ['users', 'media', '', null, undefined, 1, {}]) {
      expect(isPreviewable(value)).toBe(false)
    }
  })
})

describe('safeLocalPath', () => {
  it('allows a path on this site', () => {
    expect(safeLocalPath('/bang-gia')).toBe('/bang-gia')
    expect(safeLocalPath('/en/services/quick-wash')).toBe('/en/services/quick-wash')
  })

  it('rejects an absolute URL', () => {
    expect(safeLocalPath('https://evil.example')).toBeNull()
    expect(safeLocalPath('http://evil.example')).toBeNull()
  })

  it('rejects a protocol-relative URL, which starts with a slash', () => {
    // The one a naive `startsWith('/')` check lets through: the browser reads
    // `//evil.example` as a host, not a path.
    expect(safeLocalPath('//evil.example')).toBeNull()
    expect(safeLocalPath('//evil.example/path')).toBeNull()
  })

  it('rejects anything empty or missing', () => {
    for (const value of ['', null, undefined, 'bang-gia']) {
      expect(safeLocalPath(value)).toBeNull()
    }
  })
})
