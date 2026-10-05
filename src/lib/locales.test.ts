import { describe, expect, it } from 'vitest'

import {
  DEFAULT_LOCALE,
  LOCALES,
  isLocale,
  localeFromPath,
  otherLocales,
  pathForHome,
  pathForPage,
  pathForService,
  prefixFor,
  urlFor,
} from './locales'

describe('localeFromPath', () => {
  it('treats an unprefixed path as the default locale', () => {
    expect(localeFromPath('/bang-gia')).toEqual({ locale: 'vi', path: '/bang-gia' })
    expect(localeFromPath('/')).toEqual({ locale: 'vi', path: '/' })
  })

  it('reads the English prefix', () => {
    expect(localeFromPath('/en/pricing')).toEqual({ locale: 'en', path: '/pricing' })
  })

  it('handles the bare prefix, which needs its own rewrite rule', () => {
    expect(localeFromPath('/en')).toEqual({ locale: 'en', path: '/' })
    expect(localeFromPath('/en/')).toEqual({ locale: 'en', path: '/' })
  })

  it('does not match a path that merely starts with a locale code', () => {
    expect(localeFromPath('/english-lessons')).toEqual({
      locale: 'vi',
      path: '/english-lessons',
    })
    expect(localeFromPath('/envy')).toEqual({ locale: 'vi', path: '/envy' })
  })

  it('never treats the default locale as a prefix, so /vi is ordinary content', () => {
    // `/vi/...` is not a second way to reach Vietnamese; it would be two URLs
    // for one page.
    expect(localeFromPath('/vi/bang-gia').locale).toBe('vi')
    expect(localeFromPath('/vi/bang-gia').path).toBe('/vi/bang-gia')
  })

  it('keeps nested paths intact', () => {
    expect(localeFromPath('/en/services/quick-wash')).toEqual({
      locale: 'en',
      path: '/services/quick-wash',
    })
  })

  it('tolerates a missing leading slash', () => {
    expect(localeFromPath('en/pricing')).toEqual({ locale: 'en', path: '/pricing' })
  })
})

describe('urlFor', () => {
  it('leaves the default locale unprefixed', () => {
    expect(urlFor('/bang-gia', 'vi')).toBe('/bang-gia')
    expect(urlFor('/', 'vi')).toBe('/')
  })

  it('prefixes other locales', () => {
    expect(urlFor('/pricing', 'en')).toBe('/en/pricing')
    expect(urlFor('/', 'en')).toBe('/en')
  })

  it('round-trips with localeFromPath', () => {
    for (const locale of LOCALES) {
      const url = urlFor('/pricing', locale)
      expect(localeFromPath(url)).toEqual({ locale, path: '/pricing' })
    }
  })
})

describe('prefixFor', () => {
  it('is empty for the default locale only', () => {
    expect(prefixFor(DEFAULT_LOCALE)).toBe('')
    expect(prefixFor('en')).toBe('/en')
  })
})

describe('isLocale', () => {
  it('accepts only the configured locales', () => {
    expect(isLocale('vi')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale('')).toBe(false)
  })
})

describe('otherLocales', () => {
  it('lists the locales to advertise as alternates', () => {
    expect(otherLocales('vi')).toEqual(['en'])
    expect(otherLocales('en')).toEqual(['vi'])
  })
})

describe('route shapes', () => {
  it('leaves Vietnamese unprefixed and prefixes English', () => {
    expect(pathForHome('vi')).toBe('/')
    expect(pathForHome('en')).toBe('/en')
    expect(pathForPage('bang-gia', 'vi')).toBe('/bang-gia')
    expect(pathForPage('pricing', 'en')).toBe('/en/pricing')
  })

  it('localizes the service segment, not just the slug', () => {
    // Design.md 1.1a and section 3 both give `/en/services/<slug>`. A shared
    // segment would put a Vietnamese word in the middle of an English URL.
    expect(pathForService('rua-xe-nhanh', 'vi')).toBe('/dich-vu/rua-xe-nhanh')
    expect(pathForService('quick-wash', 'en')).toBe('/en/services/quick-wash')
  })

  it('round-trips through localeFromPath, so the rewrite and the builder agree', () => {
    for (const path of [pathForService('quick-wash', 'en'), pathForPage('pricing', 'en')]) {
      expect(localeFromPath(path).locale).toBe('en')
    }

    expect(localeFromPath(pathForService('rua-xe-nhanh', 'vi')).locale).toBe('vi')
  })
})
