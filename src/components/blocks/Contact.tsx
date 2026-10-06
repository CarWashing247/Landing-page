import { t } from '../../i18n/t'
import { loadBusinessInfo, loadServiceNames } from '../../lib/content'
import type { Locale } from '../../lib/locales'
import { groupOpeningHours } from '../../lib/opening-hours'
import { callHref } from '../../lib/routes'
import { publishable } from '../../lib/schema/shared'
import type { Page } from '../../payload-types'
import { ContactForm } from '../ContactForm'
import { Band } from './shared'

type ContactBlock = Extract<NonNullable<Page['layout']>[number], { blockType: 'contact' }>

/**
 * The contact band: the business's details beside the form.
 *
 * Design source: the Desktop Pages deck (`DAHXNi05PeY`), page 6 — a heading and
 * a lead paragraph, a form, and three cards reading "Gọi chúng tôi", "Địa chỉ"
 * and "Giờ mở cửa". **The deck shows no map**, and the UI Foundation deck's
 * layout rules say "Map and contact integrations are out of scope for this
 * release", which is the conflict T-19's own file asks to resolve before
 * building. It is resolved in favour of the decks: `src/components/MapEmbed.tsx`
 * exists and is ready, and nothing renders it. See the task file.
 *
 * **The order is the point of this block.** T-19's goal is "someone who is about
 * to drive over": the call and directions links come first in the document, so
 * they are above the fold on a 390px viewport with the form below them, rather
 * than making a driver scroll past five inputs to find a phone number.
 *
 * **Both are plain `<a>` elements rendered on the server**, so they work with
 * JavaScript disabled — which is the acceptance criterion, and also what Zalo
 * and Coc Coc need. They carry `data-ga-event` rather than an `onClick`: an
 * `onClick` would make this a client component and put `'use client'` above the
 * form, which the same criteria forbid. T-21 owns GA4 and attaches one
 * delegated listener keyed on that attribute; see this task's report.
 *
 * Every value comes from `BusinessInfo` and passes through `publishable()`, the
 * same guard the footer and the JSON-LD use (T-14, T-16): the globals still hold
 * `TODO(data):` until T-23, and a card that says "TODO(data): phone number" is
 * worse than no card. A card with nothing to show is not rendered.
 */
export const Contact = async ({
  block,
  locale,
}: {
  block: ContactBlock
  locale: Locale
}) => {
  const [business, services] = await Promise.all([loadBusinessInfo(), loadServiceNames(locale)])
  const copy = t(locale)

  const phone = publishable(business?.phone)
  const street = publishable(business?.streetAddress)
  const locality = publishable(business?.locality)
  const runs = groupOpeningHours(business?.openingHours)

  /**
   * Google Maps' documented directions URL, which needs no API key and no
   * script — the `dir` form with `api=1` is a plain link.
   *
   * Built from the stored coordinates rather than the address text, because a
   * coordinate is unambiguous and an address string is what Maps has to guess
   * at. No coordinates means no directions link, not a link to a guess.
   */
  const destination =
    typeof business?.lat === 'number' && typeof business?.lng === 'number'
      ? `${business.lat},${business.lng}`
      : undefined

  const directionsHref = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${destination}`
    : undefined

  return (
    <Band>
      <div className="flex flex-col gap-10">
        <div className="max-w-3xl">
          {/* `<h2>`, never `<h1>` — the page's `Hero` or its title owns that. */}
          <h2 className="text-h2">{block.heading}</h2>
          {block.body ? <p className="text-body mt-3">{block.body}</p> : null}
        </div>

        {/*
          The three cards first in the document and first on a narrow screen,
          so a driver sees the number before the form. On desktop the grid puts
          them beside it.
        */}
        <div className="grid gap-6 lg:grid-cols-3">
          {phone ? (
            <Card heading={copy.contact.callHeading} note={copy.contact.callNote}>
              <a className="text-h3 text-accent no-underline" data-ga-event="call" href={callHref(phone)}>
                {phone}
              </a>
            </Card>
          ) : null}

          {street || locality ? (
            <Card heading={copy.contact.addressHeading} note={copy.contact.addressNote}>
              {/*
                Street and locality on separate lines, as `BusinessInfo` stores
                them — the footer does the same, and joining them with a comma
                here would be a second opinion about address formatting.
              */}
              <address className="text-body not-italic">
                {street ? <p>{street}</p> : null}
                {locality ? <p>{locality}</p> : null}
              </address>

              {directionsHref ? (
                <a
                  className="text-label text-accent mt-2 inline-block"
                  data-ga-event="directions"
                  href={directionsHref}
                  // A map in a new tab, so a visitor reading the page does not
                  // lose it to the navigation app.
                  rel="noopener"
                  target="_blank"
                >
                  {copy.actions.directions}
                </a>
              ) : null}
            </Card>
          ) : null}

          {runs.length > 0 ? (
            <Card heading={copy.contact.hoursHeading} note={copy.contact.hoursNote}>
              <dl className="text-body">
                {runs.map((run) => (
                  <div className="flex justify-between gap-4" key={run.days.join('-')}>
                    <dt>
                      {run.days.length === 1
                        ? copy.weekdays[run.days[0]!]
                        : `${copy.weekdays[run.days[0]!]} – ${copy.weekdays[run.days[run.days.length - 1]!]}`}
                    </dt>
                    <dd>
                      {run.hours ? `${run.hours.opens} – ${run.hours.closes}` : copy.weekdays.closed}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}
        </div>

        <div className="bg-white text-on-white rounded-xl p-6 md:p-8">
          <h3 className="text-h3 mb-6">{copy.contact.heading}</h3>

          <ContactForm
            copy={{
              emailLabel: copy.contact.emailLabel,
              emailPlaceholder: copy.contact.emailPlaceholder,
              errors: {
                invalid: copy.contact.invalid,
                invalidEmail: copy.contact.invalidEmail,
                invalidPhone: copy.contact.invalidPhone,
                required: copy.contact.required,
                tooLong: copy.contact.tooLong,
              },
              messageLabel: copy.contact.messageLabel,
              messagePlaceholder: copy.contact.messagePlaceholder,
              nameLabel: copy.contact.nameLabel,
              namePlaceholder: copy.contact.namePlaceholder,
              phoneLabel: copy.contact.phoneLabel,
              phonePlaceholder: copy.contact.phonePlaceholder,
              sendFailed: copy.contact.sendFailed,
              sending: copy.contact.sending,
              sent: copy.contact.sent,
              serviceLabel: copy.contact.serviceLabel,
              servicePlaceholder: copy.contact.servicePlaceholder,
              submit: copy.actions.sendMessage,
            }}
            locale={locale}
            services={services}
          />
        </div>
      </div>
    </Band>
  )
}

/** One detail card. Rendered only by a caller that has something to put in it. */
const Card = ({
  children,
  heading,
  note,
}: {
  children: React.ReactNode
  heading: string
  note: string
}) => (
  <section className="bg-white text-on-white border-ink/10 flex flex-col rounded-xl border p-6">
    <h3 className="text-label mb-2 opacity-70">{heading}</h3>
    {children}
    <p className="text-label mt-3 opacity-70">{note}</p>
  </section>
)
