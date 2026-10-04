import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { logger, sourceIp } from './log'

/**
 * The format is a contract, not a preference — Design.md 1.5 — so it is
 * asserted against a regex rather than by eye. Five fields, in order:
 *
 *   [timestamp] [source IP] [LEVEL] [action / method] content
 */
const LINE =
  /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[(\S+)\s*\] \[(DEBUG|INFO|ERROR)\s*\] \[([^\]]+)\] (.*)$/

let out: string[]
let err: string[]

beforeEach(() => {
  out = []
  err = []
  vi.spyOn(console, 'log').mockImplementation((line: string) => out.push(line))
  vi.spyOn(console, 'error').mockImplementation((line: string) => err.push(line))
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the line format', () => {
  it('emits the five fields in order', () => {
    vi.stubEnv('LOG_LEVEL', 'debug')
    logger('vault:login').info('connected')

    const match = LINE.exec(out[0]!)

    expect(match).not.toBeNull()
    const [, ip, level, action, content] = match!
    expect(ip).toBe('-')
    expect(level!.trim()).toBe('INFO')
    expect(action).toBe('vault:login')
    expect(content).toBe('connected')
  })

  it('uses a UTC timestamp with milliseconds', () => {
    logger('vault:login').info('connected')

    const stamp = out[0]!.slice(1, out[0]!.indexOf(']'))
    expect(stamp).toMatch(/Z$/)
    expect(new Date(stamp).toISOString()).toBe(stamp)
  })

  it('appends key=value pairs and drops undefined ones', () => {
    logger('POST /api/revalidate').info('purged', {
      tag: 'page:vi:bang-gia',
      count: 2,
      stale: false,
      reason: undefined,
    })

    expect(out[0]).toContain('purged tag=page:vi:bang-gia count=2 stale=false')
    expect(out[0]).not.toContain('reason')
  })

  it('pads the IP and level so columns line up', () => {
    const a = logger('a', '203.0.113.7').info('x')
    const b = logger('b', '-').info('y')

    void a
    void b
    expect(out[0]!.indexOf('[INFO')).toBe(out[1]!.indexOf('[INFO'))
  })

  it('sends error to stderr and the rest to stdout', () => {
    vi.stubEnv('LOG_LEVEL', 'debug')
    const log = logger('vault:read')

    log.debug('a')
    log.info('b')
    log.error('c')

    expect(out).toHaveLength(2)
    expect(err).toHaveLength(1)
    expect(err[0]).toContain('[ERROR')
  })

  /**
   * One event is one line. A caught error's message is routinely multi-line —
   * Vault's own is — and a split line loses its timestamp, level and action.
   */
  it('collapses a multi-line message onto one line, keeping spaces', () => {
    logger('vault:load').error('1 error occurred:\n\t* permission denied\n\n')

    expect(err).toHaveLength(1)
    expect(err[0]).toContain('1 error occurred: * permission denied')
    expect(err[0]).not.toContain('\n')
  })

  /**
   * A value with a space could otherwise look like a second key=value pair,
   * which would let a logged string forge a field nobody logged.
   */
  it('collapses whitespace inside a value', () => {
    logger('vault:login').info('refused', { hint: 'check the namespace' })

    expect(out[0]).toContain('hint=check_the_namespace')
  })
})

describe('the level filter', () => {
  it('silences debug at info', () => {
    vi.stubEnv('LOG_LEVEL', 'info')
    const log = logger('x')

    log.debug('hidden')
    log.info('shown')

    expect(out).toHaveLength(1)
    expect(out[0]).toContain('shown')
  })

  it('emits debug at debug', () => {
    vi.stubEnv('LOG_LEVEL', 'debug')
    logger('x').debug('shown')

    expect(out).toHaveLength(1)
  })

  it('keeps only error at error', () => {
    vi.stubEnv('LOG_LEVEL', 'error')
    const log = logger('x')

    log.debug('no')
    log.info('no')
    log.error('yes')

    expect(out).toHaveLength(0)
    expect(err).toHaveLength(1)
  })

  it('behaves as info when unset', () => {
    vi.stubEnv('LOG_LEVEL', undefined)
    const log = logger('x')

    log.debug('no')
    log.info('yes')

    expect(out).toHaveLength(1)
  })

  /** A typo must not silence the log, and must not fail a boot either. */
  it('behaves as info on an unrecognised value', () => {
    vi.stubEnv('LOG_LEVEL', 'verbose')
    const log = logger('x')

    log.debug('no')
    log.info('yes')

    expect(out).toHaveLength(1)
  })
})

describe('redaction', () => {
  it.each([
    'secret',
    'VAULT_SECRET_ID',
    'token',
    'client_token',
    'password',
    'authorization',
    'cookie',
    'signature',
    'role_id',
  ])('redacts the value of %s', (key) => {
    logger('vault:login').error('refused', { [key]: 'the-actual-value' })

    expect(err[0]).toContain(`${key}=[redacted]`)
    expect(err[0]).not.toContain('the-actual-value')
  })

  it('leaves ordinary fields alone', () => {
    logger('vault:read').info('ok', { path: 'kv/data/autowash247/production', status: 200 })

    expect(out[0]).toContain('path=kv/data/autowash247/production status=200')
  })
})

describe('sourceIp', () => {
  const headers = (init: Record<string, string>) => new Headers(init)

  it('takes the first hop of x-forwarded-for', () => {
    expect(sourceIp(headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1, 10.0.0.2' }))).toBe(
      '203.0.113.7',
    )
  })

  it('falls back to x-real-ip', () => {
    expect(sourceIp(headers({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4')
  })

  it('reports - when there is no request at all', () => {
    expect(sourceIp()).toBe('-')
    expect(sourceIp(null)).toBe('-')
  })

  it('reports - rather than an empty field when the header is empty', () => {
    expect(sourceIp(headers({ 'x-forwarded-for': '' }))).toBe('-')
    expect(sourceIp(headers({ 'x-forwarded-for': '  ' }))).toBe('-')
  })

  it('accepts a Request as well as Headers', () => {
    const request = new Request('https://example.test/api/revalidate', {
      headers: { 'x-forwarded-for': '203.0.113.7' },
    })

    expect(sourceIp(request)).toBe('203.0.113.7')
  })

  it('binds the IP through forRequest', () => {
    logger('POST /api/revalidate')
      .forRequest(headers({ 'x-forwarded-for': '203.0.113.7' }))
      .info('purged')

    expect(LINE.exec(out[0]!)![1]).toBe('203.0.113.7')
  })
})
