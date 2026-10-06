import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import { t } from '../i18n/t'
import { loadBusinessInfo, loadService, loadSiteSettings } from '../lib/content'
import { formatPrice } from '../lib/format-currency'
import type { Locale } from '../lib/locales'
import { callHref } from '../lib/routes'
import { serviceSchema } from '../lib/schema/service'
import { publishable } from '../lib/schema/shared'
import { Cta } from './blocks/Cta'
import { Band, BlockImage, asMedia } from './blocks/shared'
import { JsonLd } from './seo/JsonLd'
import { buildMetadata } from './seo/metadata'

/**
 * A service page: how much, how long, what do I get, and what to do next.
 *
 * This is the route for a visitor who already knows what they want (Design.md
 * section 3), so those three answers are in the first band and nothing above
 * them is decorative. Every value is a `Services` field — the collection has no
 * `layout`, so unlike a `Pages` document this is a fixed template rather than
 * something an editor composes.
 *
 * **Nothing here is written twice.** The container and the one `next/image` call
 * come from `blocks/shared.tsx`, the closing band *is* T-17's `Cta` component
 * fed from the message catalog instead of from a block, and the price goes
 * through the same `formatPrice` as the `Pricing` table. That is this task's "no
 * duplicated CTA or formatter" criterion, and it is also why a later change to
 * the button or to the price format lands on this page for free.
 *
 * **The price is read once.** The number in the heading and the number in the
 * `Offer` schema are the same `service.price`, which is the one thing this
 * task's notes single out: read twice, they disagree after some future
 * refactor and nothing says so.
 */

export const servicePageMetadata = async (slug: string, locale: Locale): Promise<Metadata> => {
  const { isEnabled: draft } = await draftMode()
  const found = await loadService(slug, locale, draft)

  if (!found) {
    return {}
  }

  return buildMetadata({
    // `name` is what an editor fills in; `buildMetadata` asks for `title`
    // because that is what it becomes. Mapping it here keeps the builder from
    // needing to know one collection from another.
    doc: { meta: found.doc.meta, title: found.doc.name },
    locale,
    paths: found.paths,
    settings: await loadSiteSettings(locale),
  })
}

export const ServicePage = async ({ locale, slug }: { locale: Locale; slug: string }) => {
  const { isEnabled: draft } = await draftMode()
  const found = await loadService(slug, locale, draft)

  if (!found) {
    notFound()
  }

  const service = found.doc
  const copy = t(locale)
  const business = await loadBusinessInfo()

  /**
   * The same guard the JSON-LD uses (T-14). `BusinessInfo` holds `TODO(data):`
   * for the phone number until T-23, and a call button that dials a placeholder
   * is worse than no call button: `Action` inside `Cta` renders nothing without
   * both a label and a destination, so the closing band degrades to a heading
   * and a line of copy rather than to a dead link.
   */
  const phone = publishable(business?.phone)
  const image = asMedia(service.image)

  return (
    <>
      {/*
        `provider` is a reference to the home page's business node rather than a
        second copy of the name and address — see `src/lib/schema/service.ts`.
      */}
      <JsonLd schema={serviceSchema({ business, locale, service })} />

      <Band tone="primary">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <p className="text-label opacity-70">{copy.sections.servicePackage}</p>
            <h1 className="text-display mt-2">{service.name}</h1>

            {/*
              Price and duration are the two numbers the visitor came for, so
              they sit directly under the heading rather than in a table further
              down. `′` is the minute symbol, which is why it is a character here
              and not a word in the catalog — the label beside it is the
              translated part, and `Pricing` writes the duration the same way.
            */}
            <p className="text-h2 text-accent mt-6">
              {formatPrice(service.price, service.currency, locale)}
            </p>
            <p className="text-label mt-1 opacity-80">
              {copy.sections.estimatedDuration}: {service.durationMinutes}′
            </p>
          </div>

          {/*
            The only image on the page, so it is the only one with `priority`: it
            is almost certainly the LCP element, and everything T-20 checks about
            lazy loading stays true because there is nothing else to lazy load.
          */}
          {image ? <BlockImage image={image} priority /> : null}
        </div>
      </Band>

      {/*
        "What do I get", as a list because it is one. Rendered only when the
        editor has filled it in: an empty `<ul>` under a heading reads as a broken
        page rather than as a package that covers nothing.
      */}
      {service.includes && service.includes.length > 0 ? (
        <Band>
          <h2 className="text-h2">{copy.sections.includes}</h2>
          <ul className="text-body mt-6 grid gap-2 md:grid-cols-2">
            {service.includes.map((entry) => (
              <li key={entry.id ?? entry.item}>{entry.item}</li>
            ))}
          </ul>
        </Band>
      ) : null}

      {/*
        The next step. T-17's `Cta` takes a block and `Services` has no `layout`
        field to hold one, so the block is assembled here from catalog strings
        rather than by writing a second closing band. Booking and payment are out
        of scope for the whole repo (AGENT.md section 9), so the step is a phone
        call — see this task's flags for the link-out the designs imply and that
        no field holds yet.
      */}
      <Cta
        block={{
          blockType: 'cta',
          body: copy.actions.tryTodayLead,
          ctaHref: phone ? callHref(phone) : null,
          ctaLabel: phone ? copy.actions.callNow : null,
          heading: copy.actions.tryToday,
        }}
      />
    </>
  )
}
