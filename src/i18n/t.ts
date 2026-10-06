import type { Locale } from '../lib/locales'
import { en } from './messages/en'
import type { Messages } from './messages/vi'
import { vi } from './messages/vi'

/**
 * The interface catalog for one locale.
 *
 * **A plain function, not a context provider.** Every component that renders a
 * string in this project is a Server Component, and the locale is already a
 * build-time constant handed down from the locale folder (see
 * `src/lib/locales.ts` `FOLDER_FOR`). A provider would mean a client component
 * at the root, which would ship a bundle to every statically prerendered page to
 * deliver strings that were known at build time — and would undo the static
 * generation T-10 exists for.
 *
 * **No i18n dependency**, for the same reason: what a library adds here is
 * interpolation, pluralisation and runtime locale negotiation, none of which
 * this site needs. `Intl` is available when a number or date eventually needs
 * formatting.
 *
 * Usage is property access on the returned object:
 *
 * ```tsx
 * const copy = t(locale)
 * return <a href={pathForHome(locale)}>{copy.nav.home}</a>
 * ```
 *
 * That is what satisfies "a missing key never renders a blank or the key name":
 * there is no lookup to miss. `copy.nav.hoem` does not resolve to `undefined` at
 * runtime, it fails `npm run typecheck`.
 */
const CATALOGS: Record<Locale, Messages> = { en, vi }

export const t = (locale: Locale): Messages => CATALOGS[locale]
