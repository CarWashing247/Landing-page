import { z } from 'zod'

/**
 * The contact form's shape, defined once and validated twice.
 *
 * `src/components/ContactForm.tsx` validates with it in the browser and
 * `src/app/api/contact/route.ts` validates with it again on the server. That is
 * the whole reason this file exists rather than two schemas that look alike:
 * the client-side check is a convenience the visitor can delete from devtools,
 * so the route handler is the control, and a second copy of the rules is a
 * second thing to keep in step.
 *
 * **The messages are codes, not sentences.** A Zod schema carries one message
 * per rule, but this site renders in two locales and the message has to come
 * from the catalog in the visitor's locale (T-19's acceptance criterion). A
 * schema built per locale would mean building it in the request path and
 * handing the route handler a locale it has no other use for. So each rule
 * fails with a stable code, and `src/components/ContactForm.tsx` resolves the
 * code through `t(locale)` at render. The route handler never resolves them at
 * all — it returns which fields were rejected, not prose, because prose is the
 * client's job and echoing is the route handler's risk (see its own note).
 */

/** The rules, as codes the catalog has a string for. */
export const CONTACT_ERRORS = [
  'required',
  'invalid',
  'invalidEmail',
  'invalidPhone',
  'tooLong',
] as const

export type ContactErrorCode = (typeof CONTACT_ERRORS)[number]

/**
 * A string field whose *type* failure is a code too.
 *
 * Without this, a field that is absent or not a string fails with Zod's own
 * built-in prose — "Invalid input: expected string, received number" — which is
 * neither a catalog key nor Vietnamese, and would reach a visitor as a raw
 * English sentence the moment the form's resolver put it on screen. Every rule
 * below carries a code; the type check has to as well, or the contract this
 * file documents holds for four rules out of five.
 *
 * `undefined` and a wrong type are told apart because they are different
 * mistakes: a missing field is one the visitor has to fill in, while a number
 * where a string belongs can only come from a handcrafted POST. Zod 4 reports
 * both as `invalid_type`, so the distinction has to be drawn from the input.
 */
const text = () =>
  z.string({ error: (issue) => (issue.input === undefined ? 'required' : 'invalid') })

/**
 * Upper bounds, so a submission cannot be used to write an unbounded row.
 *
 * These are not formatting rules — the field validation an editor would notice
 * is the lower bound on `message`, and there is deliberately none: a visitor
 * who types three words is still a lead.
 */
const MAX = { email: 254, message: 2000, name: 120, phone: 32, service: 120 } as const

/**
 * A phone number as a person actually types one.
 *
 * Deliberately permissive about *shape* and strict only about how much of it is
 * a digit: `024 1234 5678`, `+84 24 1234 5678` and `0912-345-678` are all the
 * same number written by three people, and rejecting any of them loses a lead
 * to a regular expression. What it does reject is a field with no number in it,
 * which is the mistake worth catching — the task's own verification posts
 * `{"phone":"x"}` and expects a 400.
 *
 * Eight to fifteen digits: eight is shorter than any Vietnamese landline with
 * its area code, fifteen is the E.164 maximum.
 */
const DIGITS = /\d/g
const PHONE_SHAPE = /^[\d\s+().-]+$/

const phoneHasEnoughDigits = (value: string): boolean => {
  const digits = value.match(DIGITS)?.length ?? 0

  return digits >= 8 && digits <= 15
}

/**
 * The submitted contact request.
 *
 * `name`, `phone` and `message` are required because they are what makes a
 * submission actionable — someone to call back, a number to call, and a reason.
 * `email` and `service` are optional: the design shows both, and neither is
 * needed to return the call. An optional field that is *present but blank* is
 * normalised to `undefined` rather than rejected, because an untouched input
 * posts `''` and telling a visitor off for not filling in an optional field is
 * a bug.
 */
export const contactSchema = z.object({
  name: text().trim().min(1, 'required').max(MAX.name, 'tooLong'),

  phone: text()
    .trim()
    .min(1, 'required')
    .max(MAX.phone, 'tooLong')
    .refine((value) => PHONE_SHAPE.test(value), 'invalidPhone')
    .refine(phoneHasEnoughDigits, 'invalidPhone'),

  /**
   * `z.email()` rather than the deprecated `z.string().email()`: this project is
   * on Zod 4, where the format checks are top-level.
   */
  email: z
    .union([z.literal(''), z.email('invalidEmail').max(MAX.email, 'tooLong')], 'invalidEmail')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),

  /**
   * "Dịch vụ quan tâm" in the design. A free-text label rather than a
   * relationship to `Services`: the visitor is telling us what they are after,
   * and binding that to a service id would mean a submission stops making sense
   * the moment a package is renamed or unpublished.
   */
  service: z
    .union([z.literal(''), text().trim().max(MAX.service, 'tooLong')], 'invalid')
    .optional()
    .transform((value) => (value === '' ? undefined : value)),

  message: text().trim().min(1, 'required').max(MAX.message, 'tooLong'),
})

/**
 * Two types, because the optional fields are normalised on the way through.
 *
 * `''` becoming `undefined` means the schema's input and output genuinely
 * differ: a blank optional input posts an empty string, and what comes out the
 * far side has no such key. React Hook Form needs both — the form's fields are
 * the input shape, the submit handler receives the output shape — and collapsing
 * them into one `z.infer` is what makes the resolver's generics not line up.
 */

/** What the form's inputs hold, and what a POST body looks like on the wire. */
export type ContactValues = z.input<typeof contactSchema>

/** What survives validation: trimmed, bounded, with blank optionals dropped. */
export type ContactInput = z.output<typeof contactSchema>
