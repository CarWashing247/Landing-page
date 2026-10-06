import type { Locale } from '../../lib/locales'
import { pathForService } from '../../lib/locales'
import type { Page, Service } from '../../payload-types'
import { Band } from './shared'

type PricingBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'pricing' }>

/**
 * The price table, rendered from the related `Services` documents.
 *
 * **Every number here comes from the service**, which is the point of the block
 * being a relationship rather than typed rows: the table, the service page and
 * T-14's `Offer` schema all read the same row, so a price change lands in all
 * three at once. A typed table would be a second copy whose disagreement is
 * invisible until a customer points it out.
 *
 * The relationship resolves to objects because the page reads at `depth: 1`. An
 * id that failed to populate is skipped rather than rendered as a blank card.
 */

/**
 * `150000` as `150.000 ₫`.
 *
 * `Intl` rather than a hand-rolled thousands separator: Vietnamese groups with
 * dots where English groups with commas, and the symbol sits on the opposite
 * side. Both fall out of the locale, which is already known here.
 */
const formatPrice = (amount: number, currency: string, locale: Locale): string =>
  new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount)

const asService = (value: number | Service): Service | undefined =>
  typeof value === 'object' && value !== null ? value : undefined

export const Pricing = ({
  block,
  duration,
  includes,
  locale,
}: {
  block: PricingBlock
  /** `sections.estimatedDuration` from the catalog — passed in, never hardcoded. */
  duration: string
  /** `sections.includes` from the catalog. */
  includes: string
  locale: Locale
}) => (
  <Band>
    {block.heading ? <h2 className="text-h2">{block.heading}</h2> : null}
    <ul className="mt-8 grid gap-6 md:grid-cols-3">
      {(block.services ?? []).map(asService).map((service) =>
        service ? (
          <li className="flex flex-col rounded-xl bg-white p-6" key={service.id}>
            <h3 className="text-h3">
              <a className="text-ink no-underline" href={pathForService(service.slug, locale)}>
                {service.name}
              </a>
            </h3>

            <p className="text-h2 text-primary mt-2">
              {formatPrice(service.price, service.currency, locale)}
            </p>
            <p className="text-label mt-1 opacity-70">
              {duration}: {service.durationMinutes}′
            </p>

            {service.includes && service.includes.length > 0 ? (
              <>
                <p className="text-label mt-4 opacity-70">{includes}</p>
                <ul className="text-body mt-2 flex flex-col gap-1">
                  {service.includes.map((entry) => (
                    <li key={entry.id ?? entry.item}>{entry.item}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </li>
        ) : null,
      )}
    </ul>
  </Band>
)
