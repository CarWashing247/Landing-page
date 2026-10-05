import { describe, expect, it } from 'vitest'

import type { Media, SiteSetting } from '../../payload-types'
import { buildMetadata } from './metadata'
import type { MetadataDoc } from './metadata'

/**
 * The fallback chain is the part of T-08 and T-09 that manual testing cannot
 * reach: you cannot see a fallback by opening a page that has its own values,
 * and the pages that *do* rely on one are the ones nobody thought to check.
 * Hence a case per blank field, not just an all-set and an all-blank case.
 */

const settings = {
  brandName: 'AutoWash247',
  defaultDescription: 'Rửa xe tự động tại Hà Nội, 10 phút mỗi lượt.',
  titleSuffix: ' | AutoWash247',
} as SiteSetting

const ALT = 'Một chiếc sedan trắng đang được rửa tự động'

const image = (id: number, ogUrl: string | null): Media =>
  ({
    alt: ALT,
    height: 900,
    id,
    url: `/media/original-${id}.jpg`,
    width: 1600,
    ...(ogUrl ? { sizes: { og: { url: ogUrl } } } : {}),
  }) as Media

/** What `buildMetadata` falls back to when nothing is configured anywhere. */
const generated = (url: string) => ({
  alt: 'AutoWash247',
  height: 630,
  url,
  width: 1200,
})

const doc = (meta: MetadataDoc['meta'] = {}): MetadataDoc => ({ meta, title: 'Bảng giá' })

const paths = { en: '/en/pricing', vi: '/bang-gia' }

describe('buildMetadata — every field set', () => {
  const result = buildMetadata({
    doc: doc({
      canonical: 'https://example.com/elsewhere',
      description: 'Mô tả riêng của trang này.',
      image: image(1, '/media/og-1.jpg'),
      title: 'Giá rửa xe tự động Hà Nội',
    }),
    locale: 'vi',
    paths,
    settings,
  })

  it('uses the page’s own values, not the fallbacks', () => {
    expect(result.title).toBe('Giá rửa xe tự động Hà Nội')
    expect(result.description).toBe('Mô tả riêng của trang này.')
    expect(result.openGraph?.images).toEqual([
      { alt: ALT, height: 630, url: '/media/og-1.jpg', width: 1200 },
    ])
  })

  it('lets an editor’s canonical win over the generated one', () => {
    // The whole point of the field: this content also lives elsewhere and that
    // URL is the one that should earn the ranking.
    expect(result.alternates?.canonical).toBe('https://example.com/elsewhere')
  })
})

describe('buildMetadata — the fallback chain, one blank field at a time', () => {
  it('falls back from a blank title to the heading plus the suffix', () => {
    expect(buildMetadata({ doc: doc({ title: '' }), locale: 'vi', paths, settings }).title).toBe(
      'Bảng giá | AutoWash247',
    )
  })

  it('treats whitespace as blank, because a space is what a cleared field leaves', () => {
    expect(buildMetadata({ doc: doc({ title: '   ' }), locale: 'vi', paths, settings }).title).toBe(
      'Bảng giá | AutoWash247',
    )
  })

  it('supplies a separator when titleSuffix is unset', () => {
    // `Bảng giáAutoWash247` is worse than a guess, so the separator is added
    // rather than the brand omitted.
    const bare = { brandName: 'AutoWash247' } as SiteSetting

    expect(buildMetadata({ doc: doc(), locale: 'vi', paths, settings: bare }).title).toBe(
      'Bảng giá | AutoWash247',
    )
  })

  it('falls back from a blank description to the site default', () => {
    expect(buildMetadata({ doc: doc(), locale: 'vi', paths, settings }).description).toBe(
      settings.defaultDescription,
    )
  })

  it('falls back from a blank image to SiteSettings.ogFallback', () => {
    const withFallback = { ...settings, ogFallback: image(9, '/media/og-9.jpg') } as SiteSetting

    expect(
      buildMetadata({ doc: doc(), locale: 'vi', paths, settings: withFallback }).openGraph?.images,
    ).toEqual([{ alt: ALT, height: 630, url: '/media/og-9.jpg', width: 1200 }])
  })

  it('prefers the generated og size over the original upload', () => {
    // The original may be any aspect ratio; only the `og` size is 1200x630.
    const result = buildMetadata({
      doc: doc({ image: image(2, '/media/og-2.jpg') }),
      locale: 'vi',
      paths,
      settings,
    })

    expect(result.openGraph?.images).toEqual([
      { alt: ALT, height: 630, url: '/media/og-2.jpg', width: 1200 },
    ])
  })

  it('uses the original, at its real size, when no og size was generated', () => {
    // Stating 1200x630 for an image that is 1600x900 would be a confident lie,
    // and Facebook sizes the card from what it is told.
    const result = buildMetadata({
      doc: doc({ image: image(3, null) }),
      locale: 'vi',
      paths,
      settings,
    })

    expect(result.openGraph?.images).toEqual([
      { alt: ALT, height: 900, url: '/media/original-3.jpg', width: 1600 },
    ])
  })

  it('names the generated opengraph-image route when there is no image anywhere', () => {
    // Not left to Next's file convention: that convention does not cascade to
    // nested route segments, so every CMS page would carry no og:image at all.
    // Measured on a running server before this fallback existed.
    const result = buildMetadata({ doc: doc(), locale: 'vi', paths, settings })

    expect(result.openGraph?.images).toEqual([generated('/opengraph-image')])
    expect(result.twitter?.images).toEqual([generated('/opengraph-image')])
  })

  it('names the generated route of the rendered locale, not the default one', () => {
    const result = buildMetadata({ doc: doc(), locale: 'en', paths, settings })

    expect(result.openGraph?.images).toEqual([generated('/en/opengraph-image')])
  })

  it('falls through an unpopulated image relationship rather than guessing a URL', () => {
    // `depth: 0` leaves the upload as an id. Nothing useful can be said about
    // it, so it is treated as absent and the chain continues.
    const result = buildMetadata({ doc: doc({ image: 7 }), locale: 'vi', paths, settings })

    expect(result.openGraph?.images).toEqual([generated('/opengraph-image')])
  })

  it('falls back from a blank canonical to this route’s own path', () => {
    expect(buildMetadata({ doc: doc(), locale: 'vi', paths, settings }).alternates?.canonical).toBe(
      '/bang-gia',
    )
    expect(buildMetadata({ doc: doc(), locale: 'en', paths, settings }).alternates?.canonical).toBe(
      '/en/pricing',
    )
  })
})

describe('buildMetadata — every field blank', () => {
  const result = buildMetadata({ doc: doc(), locale: 'vi', paths, settings })

  it('still emits a complete set of tags', () => {
    expect(result.title).toBe('Bảng giá | AutoWash247')
    expect(result.description).toBe(settings.defaultDescription)
    expect(result.alternates?.canonical).toBe('/bang-gia')
    expect(result.openGraph?.siteName).toBe('AutoWash247')
    expect(result.twitter).toMatchObject({ card: 'summary_large_image' })
  })

  it('survives SiteSettings never having been saved', () => {
    // A fresh install has no row. A page whose title is its own heading beats a
    // 500.
    const bare = buildMetadata({ doc: doc(), locale: 'vi', paths, settings: null })

    expect(bare.title).toBe('Bảng giá')
    expect(bare.description).toBeUndefined()
    expect(bare.alternates?.canonical).toBe('/bang-gia')
  })
})

describe('buildMetadata — no document behind the route', () => {
  it('titles the page with the brand alone, with no suffix appended', () => {
    // `AutoWash247 | AutoWash247` reads like a bug. This is the home page today.
    const result = buildMetadata({ locale: 'vi', paths: { en: '/en', vi: '/' }, settings })

    expect(result.title).toBe('AutoWash247')
    expect(result.description).toBe(settings.defaultDescription)
  })
})

describe('buildMetadata — robots', () => {
  it('emits nothing when the page is indexable', () => {
    // `index, follow` stated explicitly is noise that invites someone to edit it.
    expect(buildMetadata({ doc: doc(), locale: 'vi', paths, settings })).not.toHaveProperty('robots')
    expect(
      buildMetadata({ doc: doc({ noindex: false }), locale: 'vi', paths, settings }),
    ).not.toHaveProperty('robots')
  })

  it('emits noindex and nofollow together when the flag is set', () => {
    expect(
      buildMetadata({ doc: doc({ noindex: true }), locale: 'vi', paths, settings }).robots,
    ).toEqual({ follow: false, index: false })
  })
})

describe('buildMetadata — locale', () => {
  it('matches og:locale to the rendered locale', () => {
    expect(buildMetadata({ doc: doc(), locale: 'vi', paths, settings }).openGraph).toMatchObject({
      locale: 'vi_VN',
    })
    expect(buildMetadata({ doc: doc(), locale: 'en', paths, settings }).openGraph).toMatchObject({
      locale: 'en_US',
    })
  })

  it('emits reciprocal hreflang for both locales plus x-default', () => {
    const languages = buildMetadata({ doc: doc(), locale: 'en', paths, settings }).alternates
      ?.languages

    expect(languages).toEqual({
      en: '/en/pricing',
      vi: '/bang-gia',
      // Vietnamese, because a searcher in neither language group should land on
      // the primary market's page.
      'x-default': '/bang-gia',
    })
  })

  it('never advertises an hreflang to a locale the document has no slug in', () => {
    // AGENT.md 5.2: an alternate pointing at a 404 is worse than no alternate.
    const languages = buildMetadata({
      doc: doc(),
      locale: 'vi',
      paths: { vi: '/bang-gia' },
      settings,
    }).alternates?.languages

    expect(languages).toEqual({ vi: '/bang-gia', 'x-default': '/bang-gia' })
  })

  it('omits x-default when Vietnamese itself is missing', () => {
    // An English-only document. Pointing x-default at the English URL would
    // claim it is the locale-neutral choice, which it is not.
    const languages = buildMetadata({
      doc: doc(),
      locale: 'en',
      paths: { en: '/en/pricing' },
      settings,
    }).alternates?.languages

    expect(languages).toEqual({ en: '/en/pricing' })
  })
})

describe('buildMetadata — AGENT.md section 9', () => {
  it('emits no keywords tag, whatever keywordFocus holds', () => {
    const result = buildMetadata({
      doc: doc({ keywordFocus: 'giá rửa xe tự động' }),
      locale: 'vi',
      paths,
      settings,
    })

    expect(result).not.toHaveProperty('keywords')
    expect(JSON.stringify(result)).not.toContain('giá rửa xe tự động')
  })
})
