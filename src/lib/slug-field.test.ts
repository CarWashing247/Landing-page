import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { slugField } from './slug-field'

/**
 * The three traps behind this field were each found by testing a running server,
 * and none of them is visible from reading the field config. Without a
 * regression test, a refactor that reintroduces one is silent — so they are
 * pinned here, through the field's public surface rather than by exporting its
 * internals.
 *
 * The hooks only need `req.payload.findByID`, `req.locale` and `req.context`, so
 * a stub is enough and no database is involved.
 */

const field = slugField({ collection: 'pages', example: 'bang-gia', from: 'title' })

const beforeValidate = field.type === 'text' ? (field.hooks?.beforeValidate ?? []) : []
const [generate, refuse] = beforeValidate
const fieldAccessUpdate = field.type === 'text' ? field.access?.update : undefined

/**
 * A request stub. `stored` is what the collection holds for the locale being
 * written — the value the real hook reads back with the fallback switched off.
 */
const makeReq = ({
  context = {},
  locale = 'vi',
  stored,
}: {
  context?: Record<string, unknown>
  locale?: string
  stored?: string
}) =>
  ({
    context,
    headers: new Headers(),
    locale,
    payload: {
      findByID: vi.fn().mockResolvedValue(stored === undefined ? {} : { slug: stored }),
    },
    t: (key: string) => key,
  }) as unknown as PayloadRequest

/**
 * The stub has no `req.i18n`, so `adminMessage` falls back to Vietnamese — its
 * documented behaviour. Matching either catalogue entry keeps these tests about
 * the lock rather than about which language resolved.
 */
const REFUSED = /đổi đường dẫn|address cannot be changed/i

const published = { _status: 'published', id: 1 }
const draft = { _status: 'draft', id: 1 }

// The hooks are typed against Payload's full args object; tests pass the subset
// each one reads.
const run = (hook: (typeof beforeValidate)[number], args: Record<string, unknown>) =>
  (hook as unknown as (a: Record<string, unknown>) => Promise<unknown>)(args)

describe('the slug field definition', () => {
  it('is localized and unique, so one slug may exist per locale', () => {
    expect(field.type).toBe('text')
    if (field.type !== 'text') return

    expect(field.localized).toBe(true)
    expect(field.unique).toBe(true)
    expect(field.required).toBe(true)
  })
})

describe('generating the slug', () => {
  it('fills it from the source field on create', async () => {
    expect(await run(generate!, { data: { title: 'Bảng giá' }, operation: 'create' })).toBe(
      'bang-gia',
    )
  })

  it('normalises a hand-typed slug rather than overwriting it', async () => {
    expect(
      await run(generate!, {
        data: { title: 'Bảng giá' },
        operation: 'create',
        value: 'Khuyến Mãi',
      }),
    ).toBe('khuyen-mai')
  })

  it('does not invent one on update', async () => {
    expect(
      await run(generate!, { data: { title: 'Bảng giá' }, operation: 'update' }),
    ).toBeUndefined()
  })
})

describe('the published-slug lock', () => {
  it('allows any change while the document is a draft', async () => {
    await expect(
      run(refuse!, {
        operation: 'update',
        originalDoc: draft,
        req: makeReq({ stored: 'bang-gia' }),
        value: 'gia-ca',
      }),
    ).resolves.toBe('gia-ca')
  })

  it('refuses a change once published', async () => {
    await expect(
      run(refuse!, {
        operation: 'update',
        originalDoc: published,
        req: makeReq({ stored: 'bang-gia' }),
        value: 'gia-ca',
      }),
    ).rejects.toThrow(REFUSED)
  })

  it('allows the unchanged value through, so an unrelated edit still saves', async () => {
    await expect(
      run(refuse!, {
        operation: 'update',
        originalDoc: published,
        req: makeReq({ stored: 'bang-gia' }),
        value: 'bang-gia',
      }),
    ).resolves.toBe('bang-gia')
  })

  /**
   * Trap 1 and 2. `localization.fallback` is on, so the English read returns the
   * Vietnamese slug where English has none. Comparing against that made a first
   * English slug look like an edit, and a page published in Vietnamese could
   * then never be given its English URL — breaking the /bang-gia + /en/pricing
   * split the locale design rests on.
   */
  it('allows the FIRST slug in a locale that has none, on a published document', async () => {
    const req = makeReq({ locale: 'en', stored: undefined })

    await expect(
      run(refuse!, { operation: 'update', originalDoc: published, req, value: 'pricing' }),
    ).resolves.toBe('pricing')
  })

  it('reads the stored value with the locale fallback switched off', async () => {
    const req = makeReq({ locale: 'en', stored: undefined })
    await run(refuse!, { operation: 'update', originalDoc: published, req, value: 'pricing' })

    expect(req.payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({ fallbackLocale: false, locale: 'en' }),
    )
  })

  it('refuses a change to that locale once it does have a slug', async () => {
    await expect(
      run(refuse!, {
        operation: 'update',
        originalDoc: published,
        req: makeReq({ locale: 'en', stored: 'pricing' }),
        value: 'prices',
      }),
    ).rejects.toThrow(REFUSED)
  })

  /**
   * Trap 3. A denied field is stripped rather than reported, so refusing the
   * slug during a restore left it empty and `required` failed the whole
   * operation — rolling back a published page answered 400 naming a field the
   * editor never touched.
   */
  it('exempts a version restore', async () => {
    await expect(
      run(refuse!, {
        operation: 'update',
        originalDoc: published,
        req: makeReq({ context: { isRestoringVersion: true }, stored: 'bang-gia' }),
        value: 'something-else',
      }),
    ).resolves.toBe('something-else')
  })

  it('ignores a create, which has no previous value to protect', async () => {
    await expect(
      run(refuse!, {
        operation: 'create',
        originalDoc: undefined,
        req: makeReq({}),
        value: 'bang-gia',
      }),
    ).resolves.toBe('bang-gia')
  })
})

describe('field-level write access', () => {
  const canWrite = (args: Record<string, unknown>) =>
    (fieldAccessUpdate as unknown as (a: Record<string, unknown>) => Promise<boolean>)(args)

  it('is writable on create', async () => {
    await expect(canWrite({ doc: undefined, req: makeReq({}) })).resolves.toBe(true)
  })

  it('is writable while a draft', async () => {
    await expect(canWrite({ doc: draft, req: makeReq({ stored: 'bang-gia' }) })).resolves.toBe(true)
  })

  it('is read-only once published', async () => {
    await expect(canWrite({ doc: published, req: makeReq({ stored: 'bang-gia' }) })).resolves.toBe(
      false,
    )
  })

  /** Or the admin panel offers no way to give a published page its English URL. */
  it('is writable for a published document in a locale with no slug yet', async () => {
    await expect(
      canWrite({ doc: published, req: makeReq({ locale: 'en', stored: undefined }) }),
    ).resolves.toBe(true)
  })

  /** Or a restore cannot write the slug it is restoring, and `required` fails. */
  it('is writable during a version restore', async () => {
    await expect(
      canWrite({
        doc: published,
        req: makeReq({ context: { isRestoringVersion: true }, stored: 'bang-gia' }),
      }),
    ).resolves.toBe(true)
  })
})
