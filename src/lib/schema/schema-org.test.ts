import { beforeAll, describe, expect, it } from 'vitest'

import type { BusinessInfo, Service, SiteSetting } from '../../payload-types'
import { autoWashSchema } from './autowash'
import { faqSchema } from './faq'
import { serviceSchema } from './service'

/**
 * Every emitted node, checked against schema.org's own vocabulary.
 *
 * **This test exists because reasoning about it got it wrong.** T-14 shipped
 * `inLanguage` on all three nodes, because AGENT.md 5.4 says every emitted schema
 * carries it. Checked against the published vocabulary, `inLanguage` has domain
 * `CreativeWork`/`Event`/… — so it is valid on `FAQPage` (a `WebPage`, hence a
 * `CreativeWork`) and does not exist on `AutoWash` (a `Place`/`Organization`) or
 * on `Service`. Nothing in a rendered page shows that; the JSON still parsed and
 * the pages still looked right.
 *
 * The acceptance criterion is Google's Rich Results Test, which needs a public
 * URL and has not been run (see the task file's Flags and follow-up A7). This is
 * not a substitute for it — it checks schema.org's vocabulary, not Google's
 * rich-result eligibility — but it is the half that can run in CI, and it is the
 * half that caught a real error.
 *
 * **The vocabulary below is vendored, and deliberately only covers what we
 * emit.** It was extracted from `schemaorg-current-https.jsonld`: `classes` maps
 * each class to its direct `rdfs:subClassOf`, and `properties` maps each property
 * to its `schema:domainIncludes`. A new property therefore fails as "not in the
 * vendored vocabulary" rather than passing unchecked — which is the intended
 * behaviour: adding one means going back to schema.org, confirming it is valid on
 * the type, and extending this table in the same commit. Regenerate with:
 *
 * ```
 * curl -s https://schema.org/version/latest/schemaorg-current-https.jsonld
 * ```
 */

/** Class -> its direct parents, from `rdfs:subClassOf`. */
const CLASSES: Record<string, string[]> = {
  "Answer": [
    "Comment"
  ],
  "AutoWash": [
    "AutomotiveBusiness"
  ],
  "AutomotiveBusiness": [
    "LocalBusiness"
  ],
  "Comment": [
    "CreativeWork"
  ],
  "ContactPoint": [
    "StructuredValue"
  ],
  "CreativeWork": [
    "Thing"
  ],
  "FAQPage": [
    "WebPage"
  ],
  "GeoCoordinates": [
    "StructuredValue"
  ],
  "Intangible": [
    "Thing"
  ],
  "LocalBusiness": [
    "Organization",
    "Place"
  ],
  "Offer": [
    "Intangible"
  ],
  "OpeningHoursSpecification": [
    "StructuredValue"
  ],
  "Organization": [
    "Thing"
  ],
  "Place": [
    "Thing"
  ],
  "PostalAddress": [
    "ContactPoint"
  ],
  "Question": [
    "Comment"
  ],
  "Service": [
    "Intangible"
  ],
  "StructuredValue": [
    "Intangible"
  ],
  "Thing": [],
  "WebPage": [
    "CreativeWork"
  ]
}

/** Property -> the types it is defined on, from `schema:domainIncludes`. */
const DOMAINS: Record<string, string[]> = {
  "acceptedAnswer": [
    "Question"
  ],
  "address": [
    "GeoCoordinates",
    "GeoShape",
    "Organization",
    "Person",
    "Place"
  ],
  "addressCountry": [
    "DefinedRegion",
    "GeoCoordinates",
    "GeoShape",
    "PostalAddress"
  ],
  "addressLocality": [
    "PostalAddress"
  ],
  "availability": [
    "Demand",
    "Offer"
  ],
  "closes": [
    "OpeningHoursSpecification"
  ],
  "dayOfWeek": [
    "EducationalOccupationalProgram",
    "OpeningHoursSpecification"
  ],
  "description": [
    "Thing"
  ],
  "geo": [
    "Place"
  ],
  "inLanguage": [
    "BroadcastService",
    "CommunicateAction",
    "CreativeWork",
    "Event",
    "LinkRole",
    "PronounceableText",
    "WriteAction"
  ],
  "knowsLanguage": [
    "Organization",
    "Person"
  ],
  "latitude": [
    "GeoCoordinates",
    "Place"
  ],
  "longitude": [
    "GeoCoordinates",
    "Place"
  ],
  "mainEntity": [
    "CreativeWork"
  ],
  "name": [
    "Thing"
  ],
  "offers": [
    "AggregateOffer",
    "CreativeWork",
    "EducationalOccupationalProgram",
    "Event",
    "MenuItem",
    "Product",
    "Service",
    "Trip"
  ],
  "openingHoursSpecification": [
    "Place"
  ],
  "opens": [
    "OpeningHoursSpecification"
  ],
  "postalCode": [
    "DefinedRegion",
    "GeoCoordinates",
    "GeoShape",
    "PostalAddress"
  ],
  "price": [
    "DonateAction",
    "Offer",
    "PriceSpecification",
    "TradeAction"
  ],
  "priceCurrency": [
    "DonateAction",
    "Offer",
    "PriceSpecification",
    "Reservation",
    "Ticket",
    "TradeAction"
  ],
  "priceRange": [
    "LocalBusiness"
  ],
  "provider": [
    "Action",
    "CreativeWork",
    "EducationalOccupationalProgram",
    "FinancialIncentive",
    "Invoice",
    "OfferShippingDetails",
    "ParcelDelivery",
    "Reservation",
    "Service",
    "Trip"
  ],
  "sameAs": [
    "Thing"
  ],
  "streetAddress": [
    "PostalAddress"
  ],
  "telephone": [
    "ContactPoint",
    "Organization",
    "Person",
    "Place"
  ],
  "text": [
    "CreativeWork"
  ],
  "url": [
    "Thing"
  ]
}

/** JSON-LD syntax, not schema.org properties. */
const JSONLD = new Set(['@context', '@id', '@type'])

const ancestors = (type: string): Set<string> => {
  const seen = new Set<string>()
  const walk = (current: string): void => {
    if (seen.has(current)) {
      return
    }

    seen.add(current)

    for (const parent of CLASSES[current] ?? []) {
      walk(parent)
    }
  }

  walk(type)

  return seen
}

/** Every complaint about one node and everything nested inside it. */
const problems = (node: unknown, where: string): string[] => {
  if (node === null || typeof node !== 'object') {
    return []
  }

  if (Array.isArray(node)) {
    return node.flatMap((item, index) => problems(item, `${where}[${index}]`))
  }

  const entries = Object.entries(node as Record<string, unknown>)
  const type = (node as { '@type'?: unknown })['@type']
  const found: string[] = []

  if (typeof type === 'string' && !(type in CLASSES)) {
    found.push(`${where}: @type "${type}" is not in the vendored vocabulary`)
  }

  const chain = typeof type === 'string' ? ancestors(type) : new Set<string>()

  for (const [key, value] of entries) {
    if (!JSONLD.has(key)) {
      const domain = DOMAINS[key]

      if (!domain) {
        found.push(`${where}: property "${key}" is not in the vendored vocabulary`)
      } else if (typeof type === 'string' && !domain.some((owner) => chain.has(owner))) {
        found.push(`${where}: "${key}" is not valid on ${type} (defined on ${domain.join(', ')})`)
      }
    }

    found.push(...problems(value, `${where}.${key}`))
  }

  return found
}

const ORIGIN = 'https://autowash247.vn'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGIN
})

/** Everything filled in, so no property is skipped by `prune`. */
const business = {
  lat: 21.0313,
  legalName: 'Example Wash Co',
  lng: 105.7821,
  locality: 'Example District, Example City',
  openingHours: [
    { closed: false, closes: '21:00', day: 'monday', opens: '07:30' },
    { closed: true, day: 'sunday' },
  ],
  phone: '000 0000 0000',
  postalCode: '100000',
  priceRange: '50.000d - 200.000d',
  streetAddress: '1 Example Street',
} as BusinessInfo

const settings = {
  brandName: 'AutoWash247',
  socialLinks: [{ platform: 'facebook', url: 'https://facebook.com/example' }],
} as SiteSetting

const service = {
  currency: 'VND',
  meta: { description: 'Rua xe trong 10 phut.' },
  name: 'Rua xe nhanh',
  price: 150000,
  slug: 'rua-xe-nhanh',
} as Pick<Service, 'currency' | 'meta' | 'name' | 'price' | 'slug'>

const nodes = () => ({
  AutoWash: autoWashSchema({ business, locale: 'vi', settings }),
  FAQPage: faqSchema({
    layout: [{ blockType: 'faq', items: [{ answer: 'Khoang 10 phut.', question: 'Mat bao lau?' }] }],
    locale: 'vi',
    path: '/huong-dan',
  }),
  Service: serviceSchema({ business, locale: 'vi', service }),
})

describe('schema.org validity', () => {
  it('emits only properties schema.org defines on the type they appear on', () => {
    const all = Object.entries(nodes()).flatMap(([name, node]) => problems(node, name))

    expect(all).toEqual([])
  })

  it('builds all three nodes from complete data', () => {
    // A null here would make the check above pass by emitting nothing.
    for (const [name, node] of Object.entries(nodes())) {
      expect(node, name).not.toBeNull()
    }
  })

  it('checks a meaningful number of properties, not an empty object', () => {
    const counted = (node: unknown): number =>
      node === null || typeof node !== 'object'
        ? 0
        : Array.isArray(node)
          ? node.reduce((total: number, item) => total + counted(item), 0)
          : Object.entries(node as Record<string, unknown>).reduce(
              (total, [key, value]) => total + (JSONLD.has(key) ? 0 : 1) + counted(value),
              0,
            )

    expect(Object.values(nodes()).reduce((total, node) => total + counted(node), 0)).toBeGreaterThan(30)
  })

  it('carries the properties Google documents as required for each type', () => {
    const built = nodes()

    // LocalBusiness: name and address. Service: name. FAQPage: mainEntity.
    expect(built.AutoWash).toMatchObject({ address: expect.any(Object), name: expect.any(String) })
    expect(built.Service).toMatchObject({ name: expect.any(String) })
    expect(built.FAQPage).toMatchObject({ mainEntity: expect.any(Array) })
    // Offer: price and priceCurrency.
    expect(built.Service!.offers).toMatchObject({
      price: expect.any(String),
      priceCurrency: expect.any(String),
    })
  })

  it('puts inLanguage only on FAQPage, the one type it is valid on', () => {
    const built = nodes()

    expect(built.FAQPage).toHaveProperty('inLanguage')
    expect(built.AutoWash).not.toHaveProperty('inLanguage')
    expect(built.Service).not.toHaveProperty('inLanguage')
  })
})
