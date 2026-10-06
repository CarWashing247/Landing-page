import type { Locale } from '../../lib/locales'
import { pathForService } from '../../lib/locales'
import type { Page, Service } from '../../payload-types'
import { Action, Band, SectionHeading } from './shared'

type PricingBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'pricing' }>

/**
 * The service cards, from the related `Services` documents.
 *
 * **Every number comes from the service**, which is the point of the block being
 * a relationship rather than typed rows: the cards, the service page and T-14's
 * `Offer` schema all read the same row, so a price change lands in all three at
 * once. The prototype labels this explicitly — "PRICE FROM CMS · DURATION FROM
 * CMS" — because showing a price that is not the stored one is the failure that
 * a customer discovers at the till.
 */

/**
 * `150000` as `150.000 ₫`. `Intl` rather than a hand-rolled separator:
 * Vietnamese groups with dots where English groups with commas, and the symbol
 * sits on the opposite side. Both fall out of the locale.
 */
const formatPrice = (amount: number, currency: string, locale: Locale): string =>
  new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount)

const asService = (value: number | Service): Service | undefined =>
  typeof value === 'object' && value !== null ? value : undefined

/** The droplet in its tinted square, from the prototype's `.service__icon`. */
const ServiceIcon = () => (
  <span
    aria-hidden="true"
    className="bg-action-tint text-action grid h-12 w-12 place-items-center rounded-[14px]"
  >
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 2.5c3 3.5 5 6.2 5 8.5a5 5 0 0 1-10 0c0-2.3 2-5 5-8.5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  </span>
)

export const Pricing = ({
  block,
  durationLabel,
  locale,
  viewLabel,
}: {
  block: PricingBlock
  /** From the catalog — never hardcoded. */
  durationLabel: string
  locale: Locale
  viewLabel: string
}) => (
  <Band id="services">
    <SectionHeading eyebrow={block.eyebrow} heading={block.heading} note={block.note} />

    <ul className="grid gap-4 md:grid-cols-3">
      {(block.services ?? []).map(asService).map((service) =>
        service ? (
          <li
            className="border-border rounded-card bg-surface flex min-h-[310px] flex-col border p-7"
            key={service.id}
          >
            <ServiceIcon />

            <h3 className="mt-7">
              <a className="text-ink no-underline" href={pathForService(service.slug, locale)}>
                {service.name}
              </a>
            </h3>

            {service.meta?.description ? (
              <p className="text-secondary mt-2">{service.meta.description}</p>
            ) : null}

            {/*
              Price and duration on one line, as the prototype sets them —
              together they are the comparison a visitor is actually making.
            */}
            <p className="text-secondary text-label mt-auto pt-6 font-bold uppercase">
              {formatPrice(service.price, service.currency, locale)} · {durationLabel}{' '}
              {service.durationMinutes}′
            </p>

            <Action
              className="mt-4 w-full"
              href={pathForService(service.slug, locale)}
              label={viewLabel}
              tone="outline"
            />
          </li>
        ) : null,
      )}
    </ul>
  </Band>
)
