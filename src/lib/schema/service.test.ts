import { beforeAll, describe, expect, it } from 'vitest'

import type { BusinessInfo, Service } from '../../payload-types'
import { serviceSchema } from './service'

const ORIGIN = 'https://autowash247.vn'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGIN
})

type ServiceInput = Pick<Service, 'currency' | 'meta' | 'name' | 'price' | 'slug'>

const service = (over: Partial<ServiceInput> = {}): ServiceInput => ({
  currency: 'VND',
  name: 'Rửa xe nhanh',
  price: 150000,
  slug: 'rua-xe-nhanh',
  ...over,
})

const business = (over: Partial<BusinessInfo> = {}): BusinessInfo =>
  ({
    legalName: 'Example Wash Co',
    locality: 'Example District, Example City',
    phone: '000 0000 0000',
    streetAddress: '1 Example Street',
    ...over,
  }) as BusinessInfo

describe('serviceSchema', () => {
  it('nests an Offer carrying the CMS price and currency', () => {
    expect(serviceSchema({ business: business(), locale: 'vi', service: service() })).toMatchObject({
      '@type': 'Service',
      name: 'Rửa xe nhanh',
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        price: '150000',
        priceCurrency: 'VND',
        url: `${ORIGIN}/dich-vu/rua-xe-nhanh`,
      },
    })
  })

  it('sends the price as a string, not a number', () => {
    // Google's Offer documentation asks for a string; a JSON number invites a
    // consumer to normalise 150000 into something with a decimal point.
    const schema = serviceSchema({ business: business(), locale: 'vi', service: service() })

    expect(typeof (schema!.offers as { price: unknown }).price).toBe('string')
  })

  it('keeps a price of zero rather than dropping it as falsy', () => {
    const schema = serviceSchema({ business: business(), locale: 'vi', service: service({ price: 0 }) })

    expect(schema!.offers).toMatchObject({ price: '0' })
  })

  it('uses the localized service segment in the url and the @id', () => {
    const en = serviceSchema({
      business: business(),
      locale: 'en',
      service: service({ slug: 'quick-wash' }),
    })

    expect(en).toMatchObject({
      '@id': `${ORIGIN}/en/services/quick-wash#service`,
      url: `${ORIGIN}/en/services/quick-wash`,
    })
  })

  it('does not carry inLanguage, which schema.org does not define on Service', () => {
    // A correction to AGENT.md 5.4 — see the note in shared.ts. The locale still
    // decides the URL, the name and the description.
    const schema = serviceSchema({ business: business(), locale: 'en', service: service() })

    expect(schema).not.toHaveProperty('inLanguage')
  })

  it('references the business by @id instead of copying its name and address', () => {
    // A second copy of the name and address is a second thing to drift out of
    // step with Google Business Profile.
    const schema = serviceSchema({ business: business(), locale: 'vi', service: service() })

    expect(schema!.provider).toEqual({ '@id': `${ORIGIN}/#business` })
  })

  it('omits provider when the business node will not be emitted', () => {
    // A bare @id pointing at a node no page defines is a dangling reference,
    // which asserts a relationship Google cannot resolve.
    const schema = serviceSchema({
      business: business({ legalName: 'TODO(data): registered business name' }),
      locale: 'vi',
      service: service(),
    })

    expect(schema).not.toHaveProperty('provider')
  })

  it('omits provider when there is no business global at all', () => {
    expect(serviceSchema({ business: null, locale: 'vi', service: service() })).not.toHaveProperty(
      'provider',
    )
  })

  it('takes description from the SEO tab when it is filled in', () => {
    const schema = serviceSchema({
      business: business(),
      locale: 'vi',
      service: service({ meta: { description: 'Rửa xe trong 10 phút.' } }),
    })

    expect(schema).toMatchObject({ description: 'Rửa xe trong 10 phút.' })
  })

  it('omits description when the SEO tab is blank', () => {
    const schema = serviceSchema({ business: business(), locale: 'vi', service: service() })

    expect(schema).not.toHaveProperty('description')
  })

  it('returns null without a name or a slug', () => {
    expect(serviceSchema({ business: business(), locale: 'vi', service: service({ name: '' }) })).toBeNull()
    expect(serviceSchema({ business: business(), locale: 'vi', service: service({ slug: '' }) })).toBeNull()
  })

  it('does not put the inclusions list into the Offer', () => {
    // `includes` is page copy, as T-07's own comment on the field says. An Offer
    // carries price and availability.
    const schema = serviceSchema({ business: business(), locale: 'vi', service: service() })

    expect(JSON.stringify(schema)).not.toContain('includes')
  })
})
