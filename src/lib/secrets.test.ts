import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getSecret, loadSecrets, resetSecretsCacheForTests } from './secrets'

const ADDR = 'http://vault.test:8200'
const BOOTSTRAP = {
  VAULT_ADDR: ADDR,
  VAULT_SECRET_PATH: 'kv/autowash247/development',
  VAULT_ROLE_ID: 'role-id',
  VAULT_SECRET_ID: 'secret-id',
}

const ok = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response

const fail = (status: number, errors: string[] = []) =>
  ({ ok: false, status, json: async () => ({ errors }) }) as Response

/**
 * One login + one KV read, in that order. Returning them positionally is what
 * lets a test assert the call count — the cache guarantee is the whole point
 * of the module, and a mock keyed by URL would hide a second round trip.
 */
const mockVault = (data: Record<string, unknown>) => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(ok({ auth: { client_token: 'token' } }))
    .mockResolvedValueOnce(ok({ data: { data } }))

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

/** The rejection, typed, so a test can assert on the message itself. */
const rejection = async (promise: Promise<unknown>): Promise<Error> => {
  try {
    await promise
  } catch (error) {
    return error as Error
  }

  throw new Error('Expected the promise to reject, but it resolved.')
}

const VALID = {
  PAYLOAD_SECRET: 'payload',
  REVALIDATE_SECRET: 'revalidate',
  R2_BUCKET: 'bucket',
}

beforeEach(() => {
  resetSecretsCacheForTests()
  for (const [key, value] of Object.entries(BOOTSTRAP)) {
    vi.stubEnv(key, value)
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  resetSecretsCacheForTests()
})

describe('loadSecrets', () => {
  it('logs in with AppRole, then reads the KV v2 data path', async () => {
    const fetchMock = mockVault(VALID)

    await expect(loadSecrets()).resolves.toMatchObject(VALID)

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${ADDR}/v1/auth/approle/login`)
    // KV v2 injects `data` between the mount and the rest of the path.
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `${ADDR}/v1/kv/data/autowash247/development`,
    )
  })

  it('sends the token on the read but not on the login', async () => {
    const fetchMock = mockVault(VALID)
    await loadSecrets()

    const headers = (i: number) =>
      (fetchMock.mock.calls[i]?.[1]?.headers ?? {}) as Record<string, string>

    expect(headers(0)['x-vault-token']).toBeUndefined()
    expect(headers(1)['x-vault-token']).toBe('token')
  })

  it('omits the namespace header when VAULT_NAMESPACE is unset', async () => {
    const fetchMock = mockVault(VALID)
    await loadSecrets()

    const headers = (fetchMock.mock.calls[0]?.[1]?.headers ?? {}) as Record<
      string,
      string
    >
    expect(headers['x-vault-namespace']).toBeUndefined()
  })

  it('sends the namespace header when VAULT_NAMESPACE is set', async () => {
    vi.stubEnv('VAULT_NAMESPACE', 'admin')
    const fetchMock = mockVault(VALID)
    await loadSecrets()

    const headers = (fetchMock.mock.calls[0]?.[1]?.headers ?? {}) as Record<
      string,
      string
    >
    expect(headers['x-vault-namespace']).toBe('admin')
  })

  it('reads once per process however many callers there are', async () => {
    const fetchMock = mockVault(VALID)

    await Promise.all([loadSecrets(), loadSecrets()])
    await loadSecrets()

    expect(fetchMock).toHaveBeenCalledTimes(2) // login + read, not four
  })

  it('freezes the result so a caller cannot mutate the cache', async () => {
    mockVault(VALID)
    const secrets = await loadSecrets()

    expect(Object.isFrozen(secrets)).toBe(true)
  })

  it('treats an empty string in Vault as an absent key', async () => {
    mockVault({ ...VALID, REVALIDATE_SECRET: '' })
    const secrets = await loadSecrets()

    expect(secrets.REVALIDATE_SECRET).toBeUndefined()
  })

  it('fails naming PAYLOAD_SECRET when it is missing', async () => {
    mockVault({ R2_BUCKET: 'bucket' })

    await expect(loadSecrets()).rejects.toThrow(/PAYLOAD_SECRET/)
  })

  it('retries on the next call rather than caching a failure', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(ok({ auth: { client_token: 'token' } }))
      .mockResolvedValueOnce(ok({ data: { data: {} } }))
      .mockResolvedValueOnce(ok({ auth: { client_token: 'token' } }))
      .mockResolvedValueOnce(ok({ data: { data: VALID } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadSecrets()).rejects.toThrow()
    await expect(loadSecrets()).resolves.toMatchObject(VALID)
  })
})

describe('loadSecrets failure messages', () => {
  it('names the missing bootstrap variable', async () => {
    vi.stubEnv('VAULT_ROLE_ID', '')
    mockVault(VALID)

    await expect(loadSecrets()).rejects.toThrow(/VAULT_ROLE_ID/)
  })

  it('rejects a VAULT_SECRET_PATH with no mount', async () => {
    vi.stubEnv('VAULT_SECRET_PATH', 'autowash247')
    mockVault(VALID)

    await expect(loadSecrets()).rejects.toThrow(/VAULT_SECRET_PATH/)
  })

  it('points at VAULT_NAMESPACE on a 403, which HCP does not mention', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(fail(403, ['permission denied'])),
    )

    await expect(loadSecrets()).rejects.toThrow(/VAULT_NAMESPACE/)
  })

  it('does not blame VAULT_NAMESPACE for a 403 when it is set', async () => {
    vi.stubEnv('VAULT_NAMESPACE', 'admin')
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(fail(403, ['permission denied'])),
    )

    const error = await rejection(loadSecrets())

    expect(error.message).not.toMatch(/VAULT_NAMESPACE/)
    expect(error.message).toMatch(/permission denied/)
  })

  it('mentions the AppRole lockout on a 403 from the login endpoint', async () => {
    // Five bad logins lock the role_id and the lockout then refuses the
    // correct secret_id with an identical message, so the hint belongs here.
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(fail(403, ['permission denied'])),
    )

    await expect(loadSecrets()).rejects.toThrow(/sys\/locked-users/)
  })

  it('does not mention the lockout for a 403 on the read', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(ok({ auth: { client_token: 'token' } }))
        .mockResolvedValueOnce(fail(403, ['permission denied'])),
    )

    const error = await rejection(loadSecrets())

    expect(error.message).not.toMatch(/locked-users/)
  })

  it('says to start the containers when Vault is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new Error('ECONNREFUSED')),
    )

    await expect(loadSecrets()).rejects.toThrow(/docker compose up/)
  })

  /**
   * The bootstrap secret_id is in the login request body. Vault never echoes
   * it, but an error path that stringified the request would, and the whole
   * point of this module is that credentials do not reach a log.
   */
  it('never puts a credential in an error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(fail(400, ['invalid role or secret ID'])),
    )

    const error = await rejection(loadSecrets())

    // Vault's own wording is kept, because it is what makes a 400
    // diagnosable. The bootstrap values that produced it are not.
    expect(error.message).toContain('invalid role or secret ID')
    expect(error.message).not.toContain(BOOTSTRAP.VAULT_SECRET_ID)
    expect(error.message).not.toContain(BOOTSTRAP.VAULT_ROLE_ID)
  })

  it('keeps secret values out of the message when a key is rejected', async () => {
    mockVault({ PAYLOAD_SECRET: '', R2_BUCKET: 'bucket' })

    const error = await rejection(loadSecrets())

    expect(error.message).toContain('PAYLOAD_SECRET')
    expect(error.message).not.toContain('bucket')
  })
})

describe('getSecret', () => {
  it('returns a present value', async () => {
    mockVault(VALID)

    await expect(getSecret('REVALIDATE_SECRET')).resolves.toBe('revalidate')
  })

  it('throws naming the key and the path when absent', async () => {
    mockVault(VALID)

    await expect(getSecret('PREVIEW_SECRET')).rejects.toThrow(
      /PREVIEW_SECRET.*kv\/autowash247\/development/s,
    )
  })
})
