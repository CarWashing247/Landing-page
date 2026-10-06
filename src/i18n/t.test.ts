import { describe, expect, it } from 'vitest'

import { LOCALES } from '../lib/locales'
import { en } from './messages/en'
import { vi } from './messages/vi'
import { t } from './t'

/**
 * What the type system cannot say.
 *
 * The key set is already enforced at compile time — `en.ts` is typed against
 * `vi`, so a missing key fails `npm run typecheck`, and that is proven by
 * removing one rather than asserted here. These tests cover what types do not:
 * that no value is empty, that the two locales genuinely differ, and that
 * nothing ships a placeholder marker by accident.
 */

/** Every `section.key` path and its value, for a locale's catalog. */
const entries = (catalog: Record<string, Record<string, string>>): [string, string][] =>
  Object.entries(catalog).flatMap(([section, keys]) =>
    Object.entries(keys).map(([key, value]): [string, string] => [`${section}.${key}`, value]),
  )

describe('t', () => {
  it('returns a catalog for every locale', () => {
    for (const locale of LOCALES) {
      expect(t(locale), locale).toBeDefined()
    }
  })

  it('returns the right language', () => {
    expect(t('vi').nav.home).toBe('Trang chủ')
    expect(t('en').nav.home).toBe('Home')
  })

  it('never returns an empty string', () => {
    // A blank value is the failure mode the criterion names: it renders as
    // nothing and looks like a layout bug rather than a missing translation.
    for (const locale of LOCALES) {
      const blank = entries(t(locale) as never).filter(([, value]) => value.trim() === '')

      expect(blank, locale).toEqual([])
    }
  })

  it('has the same key set in both locales', () => {
    // Belt and braces with the compile-time check, and it catches the one case
    // types do not: a key that exists in both but was never really translated,
    // because the English was pasted from the Vietnamese.
    expect(entries(en as never).map(([key]) => key)).toEqual(
      entries(vi as never).map(([key]) => key),
    )
  })

  it('translates every key that is not deliberately identical', () => {
    /*
     * An English value identical to the Vietnamese one compiles happily and
     * renders happily; the only way to notice is to look. So the identical set
     * is pinned, and each member has a reason:
     *
     *  - `language.*` are the languages' own endonyms, the same in both.
     *  - `notFound.title` is the number 404.
     *  - `footer.hotline`, `footer.email` and `contact.emailLabel` are loanwords
     *    Vietnamese uses unchanged — the designs write "Hotline" and "Email".
     *  - `placeholder.*` are unwritten in both languages and are deleted when
     *    T-17, T-18 and T-23 land.
     *
     * A new entry here means someone pasted the Vietnamese into `en.ts`.
     */
    const english = new Map(entries(en as never))
    const identical = entries(vi as never)
      .filter(([key, value]) => english.get(key) === value)
      .map(([key]) => key)
      .sort()

    expect(identical).toEqual([
      'contact.emailLabel',
      'footer.email',
      'footer.hotline',
      'language.english',
      'language.vietnamese',
      'notFound.title',
      'placeholder.homeBody',
      'placeholder.pageBody',
    ])
  })

  it('marks every unwritten string with TODO(copy) and no other placeholder form', () => {
    // One marker shape, so the PR can list them and a grep finds them all.
    for (const locale of LOCALES) {
      const bad = entries(t(locale) as never).filter(
        ([, value]) => /TODO/.test(value) && !value.startsWith('TODO(copy): '),
      )

      expect(bad, locale).toEqual([])
    }
  })
})
