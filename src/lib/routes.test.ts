import { describe, expect, it } from 'vitest'

import { LOCALES } from './locales'
import { NAV } from './routes'

describe('NAV', () => {
  it('links to the five routes Design.md section 3 names, in both locales', () => {
    expect(NAV.map((item) => item.href('vi'))).toEqual([
      '/',
      '/dich-vu',
      '/bang-gia',
      '/huong-dan',
      '/lien-he',
    ])

    expect(NAV.map((item) => item.href('en'))).toEqual([
      '/en',
      '/en/services',
      '/en/pricing',
      '/en/how-it-works',
      '/en/contact',
    ])
  })

  it('does not link to routes the designs show but the plan does not have', () => {
    // "Về chúng tôi" and "Tin tức" appear in the Canva header and correspond to
    // no route, no keyword cluster and no task. Linking them would ship 404s.
    expect(NAV.map((item) => item.key)).not.toContain('about')
    expect(NAV.map((item) => item.key)).not.toContain('news')
  })

  it('keeps the guide, which the designs omit and the keyword map relies on', () => {
    expect(NAV.map((item) => item.key)).toContain('guide')
  })

  it('produces a local path for every item in every locale', () => {
    // A nav item that produced an absolute URL would leave the locale behind.
    for (const locale of LOCALES) {
      for (const item of NAV) {
        expect(item.href(locale), `${item.key} in ${locale}`).toMatch(/^\//)
      }
    }
  })

  it('gives the English locale its own slugs, not translated Vietnamese ones', () => {
    // Design.md section 3 researches each locale's clusters separately.
    for (const item of NAV) {
      if (item.key !== 'home') {
        expect(item.href('en'), item.key).not.toBe(item.href('vi'))
      }
    }
  })
})
