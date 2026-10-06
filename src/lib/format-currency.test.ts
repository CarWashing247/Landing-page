import { describe, expect, it } from 'vitest'

import { formatPrice } from './format-currency'

/**
 * `Intl` output is compared loosely on purpose.
 *
 * The space between the number and the symbol is U+00A0, and which side the
 * symbol sits on is ICU's decision, not ours — pinning the exact string would
 * make these tests fail on a Node upgrade that changed nothing we care about.
 * What matters is the grouping character and that the symbol is present.
 */
const normalise = (value: string): string => value.replace(/ /g, ' ')

describe('formatPrice', () => {
  it('groups with dots for Vietnamese', () => {
    expect(normalise(formatPrice(150000, 'VND', 'vi'))).toBe('150.000 ₫')
  })

  it('groups with commas for English', () => {
    expect(normalise(formatPrice(150000, 'VND', 'en'))).toContain('150,000')
  })

  it('shows the currency symbol in both locales', () => {
    for (const locale of ['en', 'vi'] as const) {
      expect(formatPrice(150000, 'VND', locale), locale).toContain('₫')
    }
  })

  it('shows no fraction digits, because dong has no subunit in practice', () => {
    expect(formatPrice(150000, 'VND', 'vi')).not.toContain(',00')
    expect(formatPrice(150000, 'VND', 'en')).not.toContain('.00')
  })

  it('formats a price with no grouping at all', () => {
    // A 900 ₫ wash is not a real package, but a formatter that only works above
    // a thousand is a formatter with an untested branch.
    expect(normalise(formatPrice(900, 'VND', 'vi'))).toBe('900 ₫')
  })

  it('formats zero rather than rendering nothing', () => {
    // T-07 allows 0 — a free package is a merchandising decision, and `0` must
    // read as a price rather than as a missing one.
    expect(normalise(formatPrice(0, 'VND', 'vi'))).toBe('0 ₫')
  })

  it('reads the currency from its argument rather than assuming dong', () => {
    // The field is single-valued today. This is what makes adding a second
    // currency a CMS change rather than a code change.
    expect(formatPrice(1200, 'USD', 'en')).toContain('1,200')
    expect(formatPrice(1200, 'USD', 'en')).toContain('$')
  })
})
