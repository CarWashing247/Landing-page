import { describe, expect, it } from 'vitest'

import type { SitemapDocument } from './content'
import { HOME_SLUG, pathForPage, pathForService } from './locales'
import { indexableLocales, lastModifiedFor, sitemapEntries } from './sitemap'

const BASE = 'https://autowash247.vn'

const doc = (over: Partial<SitemapDocument> = {}): SitemapDocument => ({
  localeUpdatedAt: {},
  noindex: {},
  slug: { en: 'pricing', vi: 'bang-gia' },
  updatedAt: '2026-03-01T10:00:00.000Z',
  ...over,
})

const urls = (entries: ReturnType<typeof sitemapEntries>) => entries.map((e) => e.url)

describe('indexableLocales', () => {
  it('includes a locale that has its own slug and is not noindex', () => {
    expect(indexableLocales(doc())).toEqual(['vi', 'en'])
  })

  it('excludes a locale with no slug of its own', () => {
    // Payload resolves a missing localized value through the fallback, so an
    // untranslated locale would otherwise be listed at the default's slug.
    expect(indexableLocales(doc({ slug: { vi: 'bang-gia' } }))).toEqual(['vi'])
  })

  it('excludes a locale flagged noindex', () => {
    expect(indexableLocales(doc({ noindex: { en: true } }))).toEqual(['vi'])
  })

  it('treats noindex as per locale, not per document', () => {
    // The whole point of localizing the flag: hiding the Vietnamese page must
    // not hide its English translation.
    expect(indexableLocales(doc({ noindex: { vi: true } }))).toEqual(['en'])
  })

  it('treats a false or absent flag as indexable', () => {
    expect(indexableLocales(doc({ noindex: { en: false, vi: false } }))).toEqual(['vi', 'en'])
  })
})

describe('sitemapEntries', () => {
  it('emits one absolute URL per indexable locale', () => {
    expect(urls(sitemapEntries([doc()], pathForPage, BASE))).toEqual([
      `${BASE}/bang-gia`,
      `${BASE}/en/pricing`,
    ])
  })

  it('lists the home document at the locale root, never at /home', () => {
    const home = doc({ slug: { en: HOME_SLUG, vi: HOME_SLUG } })
    const [entry] = sitemapEntries([home], pathForPage, BASE)

    expect(urls(sitemapEntries([home], pathForPage, BASE))).toEqual([`${BASE}/`, `${BASE}/en`])
    expect(entry?.alternates?.languages).toEqual({
      en: `${BASE}/en`,
      vi: `${BASE}/`,
      'x-default': `${BASE}/`,
    })
  })

  it('uses the localized service segment', () => {
    const service = doc({ slug: { en: 'quick-wash', vi: 'rua-xe-nhanh' } })

    expect(urls(sitemapEntries([service], pathForService, BASE))).toEqual([
      `${BASE}/dich-vu/rua-xe-nhanh`,
      `${BASE}/en/services/quick-wash`,
    ])
  })

  it('carries a real stored timestamp, never now', () => {
    const [entry] = sitemapEntries([doc()], pathForPage, BASE)

    expect(entry!.lastModified).toEqual(new Date('2026-03-01T10:00:00.000Z'))
  })

  it('gives each locale its own lastModified', () => {
    // The flag this closes: with only `updatedAt` to go on, both entries claimed
    // the English edit's timestamp and the Vietnamese URL said it had changed
    // when it had not.
    const entries = sitemapEntries(
      [doc({ localeUpdatedAt: { en: '2026-05-02T00:00:00.000Z', vi: '2026-04-01T00:00:00.000Z' } })],
      pathForPage,
      BASE,
    )

    expect(entries.map((entry) => [entry.url, entry.lastModified])).toEqual([
      [`${BASE}/bang-gia`, new Date('2026-04-01T00:00:00.000Z')],
      [`${BASE}/en/pricing`, new Date('2026-05-02T00:00:00.000Z')],
    ])
  })

  it('never names an excluded locale in alternates', () => {
    // The property that matters most: Google reads a reciprocal hreflang group
    // as a unit, so pointing at a URL this same sitemap excluded devalues the
    // whole set.
    const entries = sitemapEntries([doc({ noindex: { vi: true } })], pathForPage, BASE)

    expect(urls(entries)).toEqual([`${BASE}/en/pricing`])
    expect(entries[0]!.alternates?.languages).toEqual({ en: `${BASE}/en/pricing` })
  })

  it('drops x-default when Vietnamese itself is excluded', () => {
    // x-default points at Vietnamese; with that gone there is no locale-neutral
    // answer, and naming the English URL would be a different wrong one.
    const entries = sitemapEntries([doc({ noindex: { vi: true } })], pathForPage, BASE)

    expect(entries[0]!.alternates?.languages).not.toHaveProperty('x-default')
  })

  it('names x-default as Vietnamese when Vietnamese is in', () => {
    const entries = sitemapEntries([doc()], pathForPage, BASE)

    expect(entries[0]!.alternates?.languages).toEqual({
      en: `${BASE}/en/pricing`,
      vi: `${BASE}/bang-gia`,
      'x-default': `${BASE}/bang-gia`,
    })
  })

  it('emits nothing for a document excluded in every locale', () => {
    expect(sitemapEntries([doc({ noindex: { en: true, vi: true } })], pathForPage, BASE)).toEqual([])
  })

  it('gives both locales of one document the same alternates set', () => {
    const entries = sitemapEntries([doc()], pathForPage, BASE)

    expect(entries[0]!.alternates).toEqual(entries[1]!.alternates)
  })
})

describe('lastModifiedFor', () => {
  it('prefers the locale’s own stamp', () => {
    const page = doc({ localeUpdatedAt: { en: '2026-05-02T00:00:00.000Z' } })

    expect(lastModifiedFor(page, 'en')).toEqual(new Date('2026-05-02T00:00:00.000Z'))
  })

  it('does not let one locale’s stamp speak for another', () => {
    // `localeUpdatedAt` is localized, so a locale with no stamp of its own must
    // not inherit its sibling's — that is the bug `updatedAt` had.
    const page = doc({ localeUpdatedAt: { en: '2026-05-02T00:00:00.000Z' } })

    expect(lastModifiedFor(page, 'vi')).toEqual(new Date('2026-03-01T10:00:00.000Z'))
  })

  it('falls back to updatedAt when the locale has no stamp', () => {
    // A row last written before the field existed, or written through a
    // `locale: 'all'` API call where there is no single locale to stamp.
    expect(lastModifiedFor(doc(), 'vi')).toEqual(new Date('2026-03-01T10:00:00.000Z'))
  })

  it('falls back rather than throwing when the map is missing entirely', () => {
    // Not hypothetical: `unstable_cache` persists across deployments, so the
    // build that added this field was handed the previous build's cached
    // documents, which had no `localeUpdatedAt` at all, and crashed the sitemap
    // route. The cache key is versioned now; this is the guard behind it.
    const stale = { ...doc(), localeUpdatedAt: undefined } as unknown as SitemapDocument

    expect(lastModifiedFor(stale, 'vi')).toEqual(new Date('2026-03-01T10:00:00.000Z'))
  })

  it('falls back when the stamp is explicitly null', () => {
    // Postgres returns null, not undefined, for a column never written.
    expect(lastModifiedFor(doc({ localeUpdatedAt: { vi: null } }), 'vi')).toEqual(
      new Date('2026-03-01T10:00:00.000Z'),
    )
  })
})
