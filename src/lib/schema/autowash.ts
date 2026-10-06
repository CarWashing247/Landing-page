import type { BusinessInfo, SiteSetting } from '../../payload-types'
import type { Locale } from '../locales'
import { pathForHome } from '../locales'
import { SCHEMA_CONTEXT, absoluteUrl, businessId, inLanguage, prune, publishable } from './shared'

/**
 * `AutoWash` for the home page, built from `BusinessInfo` and nothing else.
 *
 * **`@type` is `AutoWash`, not `LocalBusiness`.** Design.md names it and
 * `AutoWash` is a real schema.org subtype of `AutomotiveBusiness`, which is
 * itself a `LocalBusiness` — so it inherits every property Google reads for a
 * local business while telling it what kind of business this is. A validator may
 * suggest `LocalBusiness` because it is the type its examples use; that is a
 * suggestion, not an error, and substituting it loses information.
 */

/**
 * `BusinessInfo.openingHours` stores the weekday as a lowercase English value
 * because that is what a Payload `select` option is. schema.org's `Day`
 * enumeration is capitalised, so the two need a map, and it is spelled out
 * rather than computed from the string so a renamed option fails to compile
 * instead of emitting `Monday` as `monday`.
 */
const SCHEMA_DAY: Record<NonNullable<BusinessInfo['openingHours']>[number]['day'], string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

/** Google's documented way to say "closed all day": both times at `00:00`. */
const CLOSED = { closes: '00:00', opens: '00:00' } as const

/**
 * One `OpeningHoursSpecification` per weekday.
 *
 * **Closed days are emitted explicitly rather than skipped**, because an omitted
 * day is not read as "closed" — it is read as "no information", and Google's own
 * guidance is to state a closed day as `00:00`–`00:00`. `BusinessInfo` fixes the
 * array at seven rows precisely so the week is always complete; dropping the
 * closed ones here would throw that away at the last step.
 *
 * **Days are not grouped into one entry with a `dayOfWeek` array**, which
 * schema.org permits and would be shorter. Seven single-day entries cannot
 * express a wrong grouping, and the saving is a few hundred bytes on a page that
 * already carries an image.
 *
 * A day with hours missing or malformed is dropped rather than guessed at. The
 * field validation in `BusinessInfo` makes that unreachable through the admin,
 * which is the point: this is the backstop for a row written by an API call or a
 * migration that bypassed it.
 */
export const openingHoursSpecification = (
  hours: BusinessInfo['openingHours'],
): Array<Record<string, string>> =>
  (hours ?? []).flatMap((row) => {
    const dayOfWeek = SCHEMA_DAY[row.day]

    if (!dayOfWeek) {
      return []
    }

    if (row.closed === true) {
      return [{ '@type': 'OpeningHoursSpecification', dayOfWeek, ...CLOSED }]
    }

    const opens = publishable(row.opens)
    const closes = publishable(row.closes)

    if (!opens || !closes) {
      return []
    }

    return [{ '@type': 'OpeningHoursSpecification', closes, dayOfWeek, opens }]
  })

/**
 * The business node, or `null` when the CMS cannot yet describe the business.
 *
 * **Returning `null` is a deliberate guardrail, and the reason is specific.**
 * `BusinessInfo` holds `TODO(data):` placeholders for the name, address and
 * phone until T-23 fills them. Emitting those would publish a name and address
 * that contradict Google Business Profile, and AGENT.md 5.4 requires them to be
 * byte-identical; a name-address-phone mismatch is the one structured-data fault
 * that costs local ranking outright instead of merely failing to earn anything.
 * No schema at all costs nothing and reverses itself the moment the real values
 * are saved — no deploy, because the `globals` purge already reaches this page.
 *
 * The same shape as T-08's `noindex` guardrail: the CMS withholds what it cannot
 * yet state correctly, and releases it by itself.
 */
export const autoWashSchema = ({
  business,
  locale,
  settings,
}: {
  business: BusinessInfo | null
  locale: Locale
  settings: SiteSetting | null
}): Record<string, unknown> | null => {
  if (!business) {
    return null
  }

  const name = publishable(business.legalName)
  const streetAddress = publishable(business.streetAddress)
  const addressLocality = publishable(business.locality)

  /**
   * Name and address are the identity. Without both, there is nothing for
   * Google to reconcile against Business Profile and the node is noise.
   * `telephone` is recommended rather than required, so it is allowed to be
   * absent on its own.
   */
  if (!name || !streetAddress || !addressLocality) {
    return null
  }

  const { lat, lng } = business

  return prune({
    '@context': SCHEMA_CONTEXT,
    '@id': businessId(),
    '@type': 'AutoWash',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'VN',
      addressLocality,
      postalCode: publishable(business.postalCode),
      streetAddress,
    },
    // Only when both halves are present: one coordinate alone is not a location.
    geo:
      typeof lat === 'number' && typeof lng === 'number'
        ? { '@type': 'GeoCoordinates', latitude: lat, longitude: lng }
        : undefined,
    inLanguage: inLanguage(locale),
    name,
    openingHoursSpecification: openingHoursSpecification(business.openingHours),
    priceRange: publishable(business.priceRange),
    /**
     * `sameAs` is how Google ties this node to the same business on Facebook or
     * Zalo. Only the URLs — the platform name is for the footer's icon (T-16).
     */
    sameAs: (settings?.socialLinks ?? [])
      .map((link) => publishable(link.url))
      .filter((url): url is string => url !== undefined),
    telephone: publishable(business.phone),
    url: absoluteUrl(pathForHome(locale)),
  })
}
