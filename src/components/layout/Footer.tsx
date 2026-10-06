import { t } from '../../i18n/t'
import { loadBusinessInfo, loadSiteSettings } from '../../lib/content'
import type { Locale } from '../../lib/locales'
import { groupOpeningHours } from '../../lib/opening-hours'
import { callHref } from '../../lib/routes'
import { publishable } from '../../lib/schema/shared'

/**
 * The footer, and every value in it comes from `BusinessInfo`.
 *
 * This is the component T-16 exists to get right. A footer is where an address
 * and a phone number are most likely to be pasted in "just for now", and where
 * that is hardest to notice afterwards — it renders on every page, so it looks
 * deliberate. The acceptance criterion is that nothing here is hardcoded, and
 * the check for it is a `grep` for digits and place names in this directory.
 *
 * **Placeholder values are omitted rather than printed.** `BusinessInfo` still
 * holds `TODO(data):` for the name, address and phone until T-23, and
 * `publishable()` — the same guard the JSON-LD uses (T-14) — drops them. A
 * visitor seeing a blank contact block learns nothing; a visitor seeing
 * "TODO(data): phone number" learns the site is unfinished, and a crawler
 * records it. The two surfaces agree about what the business has said, because
 * they ask the same question.
 */
export const Footer = async ({ locale }: { locale: Locale }) => {
  const [settings, business] = await Promise.all([loadSiteSettings(locale), loadBusinessInfo()])
  const copy = t(locale)

  const legalName = publishable(business?.legalName)
  const street = publishable(business?.streetAddress)
  const locality = publishable(business?.locality)
  const phone = publishable(business?.phone)
  const zalo = publishable(business?.zalo)
  const runs = groupOpeningHours(business?.openingHours)

  return (
    <footer className="bg-surface text-ink border-border mt-16 border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="text-h3">{settings?.brandName ?? 'AutoWash247'}</p>
          {/*
            The tagline is the one line of marketing in the shell, and it is the
            same `defaultDescription` the meta description falls back to — one
            sentence describing the business, written once.
          */}
          {settings?.defaultDescription ? (
            <p className="text-body mt-2 opacity-80">{settings.defaultDescription}</p>
          ) : null}
        </div>

        <section>
          <h2 className="text-label mb-3 opacity-70">{copy.footer.contactHeading}</h2>
          <address className="text-body not-italic">
            {legalName ? <p>{legalName}</p> : null}
            {/*
              Street and locality are separate fields and separate lines, as
              `BusinessInfo` stores them — joining them with a comma here would
              be a second opinion about address formatting, and T-14 already
              emits them as structured `PostalAddress` parts.
            */}
            {street ? <p>{street}</p> : null}
            {locality ? <p>{locality}</p> : null}

            {phone ? (
              <p className="mt-3">
                <span className="opacity-70">{copy.footer.hotline}: </span>
                <a className="text-ink" href={callHref(phone)}>
                  {phone}
                </a>
              </p>
            ) : null}

            {zalo ? (
              <p>
                <span className="opacity-70">Zalo: </span>
                {/*
                  The field accepts a number or a zalo.me link, so the value is
                  printed as stored rather than guessed into a URL.
                */}
                {zalo}
              </p>
            ) : null}
          </address>
        </section>

        {runs.length > 0 ? (
          <section>
            <h2 className="text-label mb-3 opacity-70">{copy.contact.hoursHeading}</h2>
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
          </section>
        ) : null}
      </div>

      <div className="border-border border-t">
        <p className="text-label mx-auto max-w-6xl px-4 py-6 opacity-70">
          © {settings?.brandName ?? 'AutoWash247'}. {copy.footer.rights}
        </p>
      </div>
    </footer>
  )
}
