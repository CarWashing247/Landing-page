import { describe, expect, it } from 'vitest'

import { adminLabel, adminMessage, adminTranslations } from './admin-translations'

/**
 * The panel-language switch, tested directly.
 *
 * A browser cannot be used for this: Payload resolves the language for a
 * scripted session to `en` whatever the `payload-lng` cookie says (see
 * `e2e/routing.spec.ts`), so the Vietnamese branch is only reachable here.
 */
const req = (language?: string) => ({ i18n: { language } }) as Parameters<typeof adminMessage>[0]

describe('adminMessage', () => {
  it('answers in the panel language', () => {
    expect(adminMessage(req('en'), 'dashboardViewAll')).toBe(adminTranslations.en.custom.dashboardViewAll)
    expect(adminMessage(req('vi'), 'dashboardRecentTitle')).toBe('Nội dung gần đây')
  })

  it('falls back to Vietnamese for a language this site does not carry', () => {
    expect(adminMessage(req('fr'), 'dashboardRecentTitle')).toBe('Nội dung gần đây')
    expect(adminMessage(req(), 'dashboardRecentTitle')).toBe('Nội dung gần đây')
  })

  it('fills named placeholders', () => {
    expect(adminMessage(req('en'), 'dashboardOpenCollection', { collection: 'pages' })).toBe('Open pages →')
  })

  it('carries every key in both languages', () => {
    expect(Object.keys(adminTranslations.en.custom).sort()).toEqual(
      Object.keys(adminTranslations.vi.custom).sort(),
    )
  })
})

describe('adminLabel', () => {
  it('picks the panel language from a config label', () => {
    const label = { en: 'Pages', vi: 'Các trang' }

    expect(adminLabel(req('vi'), label, 'pages')).toBe('Các trang')
    expect(adminLabel(req('en'), label, 'pages')).toBe('Pages')
  })

  it('passes a plain string through, and falls back when there is no label', () => {
    expect(adminLabel(req('vi'), 'Media', 'media')).toBe('Media')
    expect(adminLabel(req('vi'), undefined, 'media')).toBe('media')
  })
})
