import type { Locale } from './locales'

/**
 * A price, formatted for the locale reading it.
 *
 * **One formatter, two call sites**, which is the point of it being here rather
 * than inside either: the `Pricing` block's table and the service page's own
 * heading show the same number for the same service, and a second
 * implementation is how they end up disagreeing about where the symbol goes.
 *
 * `Intl` rather than a hand-rolled thousands separator: Vietnamese groups with
 * dots (`150.000 ₫`) where English groups with commas and puts the symbol in
 * front (`₫150,000`). Both fall out of the locale, which is already a build-time
 * constant on every page that calls this.
 *
 * `maximumFractionDigits: 0` because dong has no subunit in practice, and T-07
 * already refuses a fractional price — so the integer is the whole value and
 * `150.000,00 ₫` would be two characters of noise on every card.
 *
 * `currency` comes from the CMS field rather than a `'VND'` literal, for the
 * same reason T-14's `Offer` reads it: the field is single-valued today, and
 * reading it is what makes a second currency a CMS change rather than a change
 * here.
 */
export const formatPrice = (amount: number, currency: string, locale: Locale): string =>
  new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount)
