import { beforeAll, describe, expect, it } from 'vitest'

import type { BusinessInfo, SiteSetting } from '../../payload-types'
import { autoWashSchema, openingHoursSpecification } from './autowash'

const ORIGIN = 'https://autowash247.vn'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGIN
})

/**
 * A business whose details are filled in. Values here are obviously synthetic —
 * the point of the tests is the shape, and CLAUDE.md forbids inventing a
 * plausible Hanoi address even in a fixture, because a plausible one is the kind
 * that gets copied into the CMS.
 */
const business = (over: Partial<BusinessInfo> = {}): BusinessInfo =>
  ({
    legalName: 'Example Wash Co',
    locality: 'Example District, Example City',
    openingHours: [{ closed: false, closes: '21:00', day: 'monday', opens: '07:30' }],
    phone: '000 0000 0000',
    streetAddress: '1 Example Street',
    ...over,
  }) as BusinessInfo

const settings = (over: Partial<SiteSetting> = {}): SiteSetting =>
  ({ brandName: 'AutoWash247', ...over }) as SiteSetting

describe('openingHoursSpecification', () => {
  it('maps the stored lowercase day onto schema.org’s capitalised Day', () => {
    expect(openingHoursSpecification([{ closed: false, closes: '21:00', day: 'sunday', opens: '07:30' }])).toEqual([
      { '@type': 'OpeningHoursSpecification', closes: '21:00', dayOfWeek: 'Sunday', opens: '07:30' },
    ])
  })

  it('states a closed day explicitly as 00:00–00:00', () => {
    // An omitted day reads as "no information", not "closed". Google documents
    // the 00:00 form for a day the business does not open.
    expect(openingHoursSpecification([{ closed: true, day: 'sunday' }])).toEqual([
      { '@type': 'OpeningHoursSpecification', closes: '00:00', dayOfWeek: 'Sunday', opens: '00:00' },
    ])
  })

  it('ignores times left on a day marked closed', () => {
    const spec = openingHoursSpecification([
      { closed: true, closes: '21:00', day: 'monday', opens: '07:30' },
    ])

    expect(spec).toEqual([
      { '@type': 'OpeningHoursSpecification', closes: '00:00', dayOfWeek: 'Monday', opens: '00:00' },
    ])
  })

  it('drops an open day with a missing time rather than guessing one', () => {
    // Unreachable through the admin, which validates both times. This is the
    // backstop for a row written by an API call or a migration.
    expect(openingHoursSpecification([{ closed: false, day: 'monday', opens: '07:30' }])).toEqual([])
  })

  it('emits one entry per day, in the stored order', () => {
    const spec = openingHoursSpecification([
      { closed: false, closes: '21:00', day: 'monday', opens: '07:30' },
      { closed: true, day: 'tuesday' },
    ])

    expect(spec.map((entry) => entry.dayOfWeek)).toEqual(['Monday', 'Tuesday'])
  })

  it('returns nothing for absent hours', () => {
    expect(openingHoursSpecification(null)).toEqual([])
    expect(openingHoursSpecification([])).toEqual([])
  })
})

describe('autoWashSchema', () => {
  it('emits AutoWash, not LocalBusiness', () => {
    // Design.md names the subtype; a validator suggesting LocalBusiness is a
    // suggestion, and substituting it loses what kind of business this is.
    expect(autoWashSchema({ business: business(), locale: 'vi', settings: settings() })).toMatchObject(
      { '@type': 'AutoWash' },
    )
  })

  it('carries the identity, the address and inLanguage for the rendered locale', () => {
    const schema = autoWashSchema({ business: business(), locale: 'en', settings: settings() })

    expect(schema).toMatchObject({
      '@id': `${ORIGIN}/#business`,
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'VN',
        addressLocality: 'Example District, Example City',
        streetAddress: '1 Example Street',
      },
      inLanguage: 'en',
      name: 'Example Wash Co',
      telephone: '000 0000 0000',
      url: `${ORIGIN}/en`,
    })
  })

  it('gives the Vietnamese home page the canonical URL, with no trailing slash', () => {
    const schema = autoWashSchema({ business: business(), locale: 'vi', settings: settings() })

    expect(schema).toMatchObject({ url: ORIGIN })
  })

  it('uses the same @id in both locales', () => {
    // One business, not a Vietnamese one and an English one — this is the string
    // a service page's `provider` points at.
    const vi = autoWashSchema({ business: business(), locale: 'vi', settings: settings() })
    const en = autoWashSchema({ business: business(), locale: 'en', settings: settings() })

    expect(vi!['@id']).toBe(en!['@id'])
  })

  it('refuses to publish a placeholder name, address or phone', () => {
    // The guardrail: a name-address-phone that contradicts Google Business
    // Profile costs local ranking, and no schema at all costs nothing.
    expect(
      autoWashSchema({
        business: business({ legalName: 'TODO(data): registered business name' }),
        locale: 'vi',
        settings: settings(),
      }),
    ).toBeNull()

    expect(
      autoWashSchema({
        business: business({ streetAddress: 'TODO(data): street address' }),
        locale: 'vi',
        settings: settings(),
      }),
    ).toBeNull()
  })

  it('still publishes when only the phone is a placeholder', () => {
    // `telephone` is recommended, not required: the name and address are the
    // identity, so a missing phone omits one property rather than the node.
    const schema = autoWashSchema({
      business: business({ phone: 'TODO(data): phone number' }),
      locale: 'vi',
      settings: settings(),
    })

    expect(schema).not.toBeNull()
    expect(schema).not.toHaveProperty('telephone')
  })

  it('returns null when the global has never been saved', () => {
    expect(autoWashSchema({ business: null, locale: 'vi', settings: null })).toBeNull()
  })

  it('omits geo unless both coordinates are present', () => {
    // One coordinate alone is not a location.
    const half = autoWashSchema({ business: business({ lat: 21.03 }), locale: 'vi', settings: settings() })
    expect(half).not.toHaveProperty('geo')

    const both = autoWashSchema({
      business: business({ lat: 21.03, lng: 105.78 }),
      locale: 'vi',
      settings: settings(),
    })
    expect(both).toMatchObject({ geo: { '@type': 'GeoCoordinates', latitude: 21.03, longitude: 105.78 } })
  })

  it('omits priceRange and postalCode when unset rather than sending null', () => {
    const schema = autoWashSchema({ business: business(), locale: 'vi', settings: settings() })

    expect(schema).not.toHaveProperty('priceRange')
    expect(schema!.address).not.toHaveProperty('postalCode')
  })

  it('takes sameAs from the social links, urls only', () => {
    const schema = autoWashSchema({
      business: business(),
      locale: 'vi',
      settings: settings({
        socialLinks: [
          { platform: 'facebook', url: 'https://facebook.com/example' },
          { platform: 'zalo', url: 'https://zalo.me/example' },
        ],
      }),
    })

    expect(schema).toMatchObject({
      sameAs: ['https://facebook.com/example', 'https://zalo.me/example'],
    })
  })

  it('omits sameAs entirely when there are no social links', () => {
    const schema = autoWashSchema({
      business: business(),
      locale: 'vi',
      settings: settings({ socialLinks: [] }),
    })

    expect(schema).not.toHaveProperty('sameAs')
  })
})
