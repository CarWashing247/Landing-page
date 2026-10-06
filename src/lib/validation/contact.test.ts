import { describe, expect, it } from 'vitest'

import type { ContactErrorCode } from './contact'
import { CONTACT_ERRORS, contactSchema } from './contact'

/**
 * The schema is the control, not a convenience.
 *
 * `ContactForm.tsx` runs it in the browser where a visitor can delete it, so
 * what these tests cover is the rules `/api/contact` relies on to reject a
 * handcrafted POST. The task's own verification does one such POST with `curl`;
 * this is the same check at every boundary rather than at one.
 */

/** A submission that should pass, so each case can fail one field at a time. */
const valid = {
  message: 'Tôi muốn rửa xe vào cuối tuần.',
  name: 'Nguyễn Văn A',
  phone: '0912 345 678',
}

const codesFor = (input: unknown): string[] => {
  const result = contactSchema.safeParse(input)

  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

const fieldsFor = (input: unknown): string[] => {
  const result = contactSchema.safeParse(input)

  return result.success ? [] : result.error.issues.map((issue) => String(issue.path[0] ?? '?'))
}

describe('contactSchema', () => {
  it('accepts a submission with only the three required fields', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects the body from the task’s verification block', () => {
    // `curl -d '{"name":"","phone":"x"}'` must be a 400. If this ever passes,
    // the route handler is no longer a control.
    expect(contactSchema.safeParse({ name: '', phone: 'x' }).success).toBe(false)
  })

  describe('required fields', () => {
    it.each(['name', 'message'] as const)('rejects a missing %s', (field) => {
      expect(fieldsFor({ ...valid, [field]: undefined })).toContain(field)
    })

    it.each(['name', 'phone', 'message'] as const)('rejects a blank %s', (field) => {
      expect(codesFor({ ...valid, [field]: '   ' })).toContain('required')
    })

    it('trims what it keeps, so a padded value is not stored padded', () => {
      const result = contactSchema.parse({ ...valid, name: '  Nguyễn Văn A  ' })

      expect(result.name).toBe('Nguyễn Văn A')
    })
  })

  describe('phone', () => {
    // Three people writing the same Hanoi number. Rejecting any of these loses
    // a lead to a regular expression.
    it.each(['024 1234 5678', '+84 24 1234 5678', '0912-345-678', '(024) 1234 5678'])(
      'accepts %s',
      (phone) => {
        expect(contactSchema.safeParse({ ...valid, phone }).success).toBe(true)
      },
    )

    it.each(['x', 'gọi cho tôi', '+()'])('rejects %s, which holds no number', (phone) => {
      expect(codesFor({ ...valid, phone })).toContain('invalidPhone')
    })

    it('rejects a number with too few digits to dial', () => {
      expect(codesFor({ ...valid, phone: '1234567' })).toContain('invalidPhone')
    })

    it('rejects more digits than E.164 allows', () => {
      expect(codesFor({ ...valid, phone: '1234567890123456' })).toContain('invalidPhone')
    })

    it('rejects letters mixed into an otherwise valid number', () => {
      expect(codesFor({ ...valid, phone: '0912 345 678 ext' })).toContain('invalidPhone')
    })
  })

  describe('optional fields', () => {
    it.each(['email', 'service'] as const)('accepts a blank %s rather than scolding', (field) => {
      // An untouched input posts `''`. Telling a visitor off for not filling in
      // an optional field is a bug.
      expect(contactSchema.safeParse({ ...valid, [field]: '' }).success).toBe(true)
    })

    it.each(['email', 'service'] as const)('normalises a blank %s to undefined', (field) => {
      const result = contactSchema.parse({ ...valid, [field]: '' })

      expect(result[field]).toBeUndefined()
    })

    it('accepts a real email address', () => {
      expect(contactSchema.parse({ ...valid, email: 'a@autowash247.vn' }).email).toBe(
        'a@autowash247.vn',
      )
    })

    it('rejects something that is not an email address', () => {
      expect(codesFor({ ...valid, email: 'not-an-email' })).toContain('invalidEmail')
    })
  })

  describe('upper bounds', () => {
    it.each([
      ['name', 121],
      ['phone', 33],
      ['message', 2001],
      ['service', 121],
    ] as const)('rejects a %s of %i characters', (field, length) => {
      // Digits for `phone` so it fails on length rather than on shape.
      const filler = (field === 'phone' ? '1' : 'a').repeat(length)

      expect(codesFor({ ...valid, [field]: filler })).toContain('tooLong')
    })

    it('rejects an over-long email on length, not on format', () => {
      const local = 'a'.repeat(250)

      expect(codesFor({ ...valid, email: `${local}@autowash247.vn` })).toContain('tooLong')
    })
  })

  describe('error codes', () => {
    /**
     * Every message the schema can produce has to be a key the catalog has a
     * string for, or the form renders a raw code at a visitor. This is the only
     * thing holding the two files together — `ContactForm.tsx` resolves
     * `errors[code]`, and a code with no entry falls back silently.
     */
    it('only ever fails with a declared code', () => {
      const inputs: unknown[] = [
        {},
        { ...valid, name: '' },
        { ...valid, phone: 'x' },
        { ...valid, phone: '1'.repeat(33) },
        { ...valid, email: 'nope' },
        { ...valid, message: '' },
        { ...valid, message: 'a'.repeat(2001) },
        { ...valid, service: 'a'.repeat(121) },
        { message: 1, name: 2, phone: 3 },
      ]

      const seen = new Set(inputs.flatMap(codesFor))

      expect(seen.size).toBeGreaterThan(0)
      for (const code of seen) {
        expect(CONTACT_ERRORS).toContain(code as ContactErrorCode)
      }
    })

    it('reports a wrong type under a declared code, not Zod’s own prose', () => {
      // A handcrafted POST can send a number. Zod's default message for that is
      // "Invalid input: expected string, received number", which is neither a
      // catalog key nor Vietnamese.
      expect(codesFor({ message: 1, name: 2, phone: 3 })).toEqual(['invalid', 'invalid', 'invalid'])
    })

    it('tells an absent field apart from one that is the wrong type', () => {
      // Different mistakes: a missing field is the visitor's to fill in, a
      // number where a string belongs cannot come from the form at all.
      expect(codesFor({})).toEqual(['required', 'required', 'required'])
    })
  })

  it('ignores a key it does not declare, so `locale` is the route handler’s to read', () => {
    const result = contactSchema.safeParse({ ...valid, locale: 'en' })

    expect(result.success).toBe(true)
    expect(result.success && 'locale' in result.data).toBe(false)
  })
})
