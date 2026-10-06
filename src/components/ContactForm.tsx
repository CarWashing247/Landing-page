'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import type { Locale } from '../lib/locales'
import type { ContactErrorCode, ContactInput, ContactValues } from '../lib/validation/contact'
import { contactSchema } from '../lib/validation/contact'

/**
 * The contact form, and the only client component on the contact page.
 *
 * It is a leaf: the heading, the lead paragraph and the three detail cards are
 * all rendered on the server by `src/components/blocks/Contact.tsx`, so what
 * ships to the browser is this form and nothing above it. That is the
 * acceptance criterion, and it is also why the strings arrive as a prop — see
 * `copy` below.
 *
 * **It validates with the same schema the route handler uses**, imported from
 * `src/lib/validation/contact.ts`. What happens here is a convenience: it
 * catches a typo before a round trip. It is not the control, because anything
 * in this file can be deleted from devtools, and `/api/contact` re-checks
 * every field with the same rules.
 *
 * **It degrades to a plain form.** The `<form>` has a real `action` and
 * `method`, so with JavaScript off the browser POSTs to `/api/contact` itself.
 * What the visitor then sees is the route handler's JSON rather than a styled
 * message, which is a poor experience and a working one — and the call and
 * directions links beside it, which are the actions that matter to someone
 * about to drive over, are plain `<a>` elements on the server and need no
 * JavaScript at all.
 */

/**
 * Every string the form renders, resolved by the server component.
 *
 * A client component could import `t(locale)` directly, but that would bundle
 * *both* catalogs into the page — the import is static, so nothing would tell
 * the bundler that an `/en` page needs only `en`. Passing the resolved strings
 * keeps the catalog on the server, which is the same reason `RenderBlocks`
 * hands `Pricing` its two labels rather than letting the block look them up.
 */
export type ContactFormCopy = {
  readonly nameLabel: string
  readonly namePlaceholder: string
  readonly phoneLabel: string
  readonly phonePlaceholder: string
  readonly emailLabel: string
  readonly emailPlaceholder: string
  readonly serviceLabel: string
  readonly servicePlaceholder: string
  readonly messageLabel: string
  readonly messagePlaceholder: string
  readonly submit: string
  readonly sending: string
  readonly sent: string
  readonly sendFailed: string
  /** One per `ContactErrorCode`, so a new rule cannot ship without a message. */
  readonly errors: Readonly<Record<ContactErrorCode, string>>
}

/**
 * The schema fails with a code rather than a sentence (see its own note), so
 * this is where a code becomes the visitor's language.
 *
 * An unrecognised message falls back to `required`, which cannot happen while
 * the schema and `ContactErrorCode` agree — the point is that it renders *a*
 * sentence rather than a raw code if they ever stop agreeing.
 */
const messageFor = (copy: ContactFormCopy, code: string | undefined): string =>
  copy.errors[code as ContactErrorCode] ?? copy.errors.required

type Status = 'idle' | 'sending' | 'sent' | 'failed'

const FIELD_CLASS =
  'text-body border-ink/20 bg-white text-ink placeholder:text-ink/40 w-full rounded-xl border px-4 py-3'

export const ContactForm = ({
  copy,
  locale,
  services,
}: {
  copy: ContactFormCopy
  locale: Locale
  /** The published service names, for the picker. Empty hides the field. */
  services: readonly string[]
}) => {
  const [status, setStatus] = useState<Status>('idle')

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<ContactValues, unknown, ContactInput>({
    resolver: zodResolver(contactSchema),
    // Validate when a field is left rather than on every keystroke: telling
    // someone their phone number is invalid while they are still typing it is
    // noise, and it fires on the first character.
    mode: 'onBlur',
  })

  const onSubmit = async (values: ContactInput): Promise<void> => {
    setStatus('sending')

    try {
      const response = await fetch('/api/contact', {
        body: JSON.stringify({ ...values, locale }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) {
        setStatus('failed')

        return
      }

      // Cleared only on success, so a failed send leaves the visitor's words in
      // the box to retry with rather than making them type it all again.
      reset()
      setStatus('sent')
    } catch {
      setStatus('failed')
    }
  }

  /**
   * `noValidate` turns off the browser's own bubbles, because the schema is
   * already the source of truth and two validation systems disagree in two
   * languages. The `required` attributes stay off for the same reason — with
   * JavaScript disabled the route handler is what rejects a blank field, and it
   * returns the same verdict this schema would.
   */
  return (
    <form
      action="/api/contact"
      className="flex flex-col gap-4"
      method="post"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      {/*
        The locale, for the submission that does not go through `onSubmit`.
        With JavaScript the `fetch` below sends it explicitly; without it, this
        is the only thing telling the route handler which language the visitor
        was reading, and its default is `vi` — so an English visitor's enquiry
        would otherwise be filed as Vietnamese and called back in the wrong
        language. Unregistered, so React Hook Form ignores it and the schema
        never sees it.
      */}
      <input name="locale" type="hidden" value={locale} />

      <div className="grid gap-4 md:grid-cols-2">
        <Field error={messageFor(copy, errors.name?.message)} invalid={Boolean(errors.name)} label={copy.nameLabel} name="contact-name">
          <input
            {...register('name')}
            aria-invalid={Boolean(errors.name)}
            autoComplete="name"
            className={FIELD_CLASS}
            id="contact-name"
            placeholder={copy.namePlaceholder}
            type="text"
          />
        </Field>

        <Field error={messageFor(copy, errors.phone?.message)} invalid={Boolean(errors.phone)} label={copy.phoneLabel} name="contact-phone">
          <input
            {...register('phone')}
            aria-invalid={Boolean(errors.phone)}
            autoComplete="tel"
            className={FIELD_CLASS}
            id="contact-phone"
            // `tel`, not `text`: it brings up a keypad on a phone, which is the
            // device most of this audience is on.
            inputMode="tel"
            placeholder={copy.phonePlaceholder}
            type="tel"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field error={messageFor(copy, errors.email?.message)} invalid={Boolean(errors.email)} label={copy.emailLabel} name="contact-email">
          <input
            {...register('email')}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            className={FIELD_CLASS}
            id="contact-email"
            inputMode="email"
            placeholder={copy.emailPlaceholder}
            type="email"
          />
        </Field>

        {/*
          The picker disappears when there is no published service to offer,
          rather than rendering an empty dropdown. Until T-23 seeds the
          packages, that is the normal state.
        */}
        {services.length > 0 ? (
          <Field error={messageFor(copy, errors.service?.message)} invalid={Boolean(errors.service)} label={copy.serviceLabel} name="contact-service">
            <select {...register('service')} className={FIELD_CLASS} defaultValue="" id="contact-service">
              <option value="">{copy.servicePlaceholder}</option>
              {services.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>

      <Field error={messageFor(copy, errors.message?.message)} invalid={Boolean(errors.message)} label={copy.messageLabel} name="contact-message">
        <textarea
          {...register('message')}
          aria-invalid={Boolean(errors.message)}
          className={FIELD_CLASS}
          id="contact-message"
          placeholder={copy.messagePlaceholder}
          rows={5}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-4">
        <button
          className="bg-accent text-on-accent text-label rounded-lg px-6 py-3 disabled:opacity-60"
          disabled={status === 'sending'}
          type="submit"
        >
          {status === 'sending' ? copy.sending : copy.submit}
        </button>

        {/*
          `role="status"` so the outcome is announced rather than only shown —
          a visitor using a screen reader otherwise gets no feedback at all,
          because nothing about the page moves when a send succeeds.
        */}
        <p aria-live="polite" className="text-body" role="status">
          {status === 'sent' ? copy.sent : null}
          {status === 'failed' ? copy.sendFailed : null}
        </p>
      </div>
    </form>
  )
}

/**
 * A label, its control and its error, so the three cannot be wired up
 * differently in five places.
 *
 * The error element is always present and empty when valid, rather than
 * appearing on failure: an element that appears pushes everything below it
 * down, and a form that jumps as you leave each field is a layout shift on
 * every blur.
 */
const Field = ({
  children,
  error,
  invalid,
  label,
  name,
}: {
  children: React.ReactNode
  error: string
  invalid: boolean
  label: string
  name: string
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-label" htmlFor={name}>
      {label}
    </label>
    {children}
    <p className="text-label text-danger min-h-5">{invalid ? error : null}</p>
  </div>
)
