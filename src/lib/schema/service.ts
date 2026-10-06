import type { BusinessInfo, Service } from '../../payload-types'
import type { Locale } from '../locales'
import { pathForService } from '../locales'
import {
  IN_STOCK,
  SCHEMA_CONTEXT,
  absoluteUrl,
  businessId,
  nodeId,
  prune,
  publishable,
} from './shared'

/**
 * `Service` with a nested `Offer` for a service page.
 *
 * **The provider is a reference, not a copy.** `provider: { '@id': … }` points at
 * the `AutoWash` node the home page emits rather than restating the name and
 * address here. A second copy of the business's name and address is a second
 * thing to drift out of step with Google Business Profile, which AGENT.md 5.4
 * exists to prevent — and a bare `@id` is exactly how JSON-LD expresses "the
 * thing identified over there".
 *
 * The reference is emitted only when the business node is publishable, on the
 * same test `autoWashSchema` uses. Pointing at an `@id` that no page defines
 * would be a dangling reference, which is worse than no `provider`: it asserts a
 * relationship to an entity Google cannot resolve.
 *
 * **No `inLanguage`, against AGENT.md 5.4.** schema.org defines no language
 * property on `Service` at all — see the note on `inLanguage` in `shared.ts`. The
 * locale still decides the URL, the name and the description, so the two locales'
 * service nodes remain distinct; it is only the redundant language tag that is
 * gone.
 *
 * **`includes` is deliberately not in the `Offer`.** It is a list of what the
 * package covers — page copy, as T-07's own comment on the field says — and
 * `Offer` carries price and availability. Stuffing inclusions into
 * `itemOffered` or `description` would be padding structured data with prose.
 */

/** Is the business describable at all? Mirrors `autoWashSchema`'s identity gate. */
const hasPublishableBusiness = (business: BusinessInfo | null): boolean =>
  Boolean(
    business &&
      publishable(business.legalName) &&
      publishable(business.streetAddress) &&
      publishable(business.locality),
  )

export const serviceSchema = ({
  business,
  locale,
  service,
}: {
  business: BusinessInfo | null
  locale: Locale
  service: Pick<Service, 'currency' | 'meta' | 'name' | 'price' | 'slug'>
}): Record<string, unknown> | null => {
  const name = publishable(service.name)
  const slug = publishable(service.slug)

  // Without a name or a URL there is no service to describe.
  if (!name || !slug) {
    return null
  }

  const path = pathForService(slug, locale)
  const url = absoluteUrl(path)

  return prune({
    '@context': SCHEMA_CONTEXT,
    '@id': nodeId(path, 'service'),
    '@type': 'Service',
    description: publishable(service.meta?.description),
    name,
    /**
     * `price` as a string, which is what Google's Offer documentation asks for,
     * and why it matters here: `150000` serialised as a JSON number is
     * indistinguishable from a float to a parser that normalises it, and T-07
     * already refuses a fractional price so the integer is the whole value.
     * `priceCurrency` comes from the CMS field rather than a literal `'VND'` —
     * the field is single-valued today and read-only, and reading it is what
     * makes adding a second currency a CMS change rather than a code change.
     */
    offers: {
      '@type': 'Offer',
      availability: IN_STOCK,
      price: String(service.price),
      priceCurrency: service.currency,
      url,
    },
    provider: hasPublishableBusiness(business) ? { '@id': businessId() } : undefined,
    url,
  })
}
