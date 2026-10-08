import type { Locale } from '../../lib/locales'
import { pathForService } from '../../lib/locales'
import type { Page, Service } from '../../payload-types'
import { SiteIcon } from '../brand/SiteIcon'
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
            <SiteIcon name="droplet" />

            <h3 className="mt-7">
              <a className="text-ink hover:text-action no-underline" href={pathForService(service.slug, locale)}>
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
            {/*
              Not uppercased. The prototype's `.service__price` sets no
              `text-transform` — its sample text is literally
              "PRICE FROM CMS · DURATION FROM CMS", and reading that as a style
              put `uppercase` on a line that in production holds a formatted
              price and a Vietnamese duration label.
            */}
            <p className="text-secondary text-label mt-auto flex flex-wrap items-center gap-1.5 pt-6 font-bold">
              <span>{formatPrice(service.price, service.currency, locale)} ·</span>
              <SiteIcon name="clock" size={20} />
              <span>{durationLabel} {service.durationMinutes}′</span>
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
