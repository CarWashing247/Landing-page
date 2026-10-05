import { describe, expect, it } from 'vitest'

import { GLOBALS_TAG, REVALIDATE_SECONDS, SITEMAP_TAG, pageTag, serviceTag } from './cache-tags'
import { LOCALES } from './locales'

/**
 * The scheme is a contract between three tasks that cannot see each other's
 * strings: the query layer that attaches a tag (T-10), the webhook that purges
 * one (T-11) and the sitemap that consumes one (T-13). `revalidateTag` reports
 * nothing for a tag nobody holds, so a mismatch is silent — these tests are the
 * only place the shape is actually asserted.
 */

describe('cache tags', () => {
  it('puts the locale between the kind and the slug', () => {
    // Design.md 1.3 and AGENT.md 5.3. The T-10 task file's table omits the
    // locale; those two are the binding pair.
    expect(pageTag('vi', 'bang-gia')).toBe('page:vi:bang-gia')
    expect(serviceTag('en', 'quick-wash')).toBe('service:en:quick-wash')
  })

  it('keeps the two locales of one document apart', () => {
    // The whole reason the locale is in the tag: publishing an English edit
    // must not throw away the cached Vietnamese page.
    expect(pageTag('vi', 'bang-gia')).not.toBe(pageTag('en', 'bang-gia'))
  })

  it('keeps a page and a service of the same slug apart', () => {
    expect(pageTag('vi', 'rua-xe-nhanh')).not.toBe(serviceTag('vi', 'rua-xe-nhanh'))
  })

  it('never collides across the locales the site ships', () => {
    const tags = LOCALES.flatMap((locale) => [pageTag(locale, 's'), serviceTag(locale, 's')])

    expect(new Set(tags).size).toBe(tags.length)
  })

  it('keeps the site-wide tags distinct from any document tag', () => {
    expect(SITEMAP_TAG).toBe('sitemap')
    expect(GLOBALS_TAG).toBe('globals')
    expect([SITEMAP_TAG, GLOBALS_TAG]).not.toContain(pageTag('vi', 'sitemap'))
  })

  it('holds the revalidate floor at one hour', () => {
    // AGENT.md 5.3 says not to remove it. A test is cheaper than noticing a
    // year later that someone set it to `false` to debug something.
    expect(REVALIDATE_SECONDS).toBe(3600)
  })
})
