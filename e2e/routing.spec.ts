import { type APIRequestContext, expect, test } from '@playwright/test'

import { FIXTURE_PNG } from './fixture-image'

const baseURL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/**
 * Smoke test for the rewrite layer in next.config.mjs.
 *
 * Folder names under src/app no longer determine URLs, so a wrong rewrite does
 * not fail the build — it fails here. API-level checks only (the `request`
 * fixture), so no browser binaries are needed.
 */

test.describe('public site', () => {
  test('home page is served at / with lang="vi" and one h1', async ({ request }) => {
    const response = await request.get('/')
    expect(response.status()).toBe(200)

    const html = await response.text()
    expect(html).toContain('<html lang="vi"')
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
  })

  test('internal landing-page path redirects to /', async ({ request }) => {
    const response = await request.get('/landing-page', { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(new URL(response.headers().location ?? '', 'http://x').pathname).toBe('/')
  })

  test('unknown URL is a 404 with lang="vi"', async ({ request }) => {
    const response = await request.get('/khong-ton-tai')
    expect(response.status()).toBe(404)
    expect(await response.text()).toContain('<html lang="vi"')
  })
})

test.describe('admin and API', () => {
  test('/admin is served', async ({ request }) => {
    expect((await request.get('/admin')).status()).toBe(200)
  })

  test('collection reads require authentication', async ({ request }) => {
    expect((await request.get('/api/users')).status()).toBe(403)
  })

  test('the API is not reachable under its internal path', async ({ request }) => {
    const response = await request.post('/crm/api/slug?__p=users/login', {
      data: { email: 'nobody@example.com', password: 'x' },
      maxRedirects: 0,
    })
    expect(response.status()).not.toBe(200)
  })

  test('GraphQL is disabled', async ({ request }) => {
    expect((await request.get('/api/graphql-playground')).status()).toBe(404)
    expect((await request.post('/api/graphql', { data: { query: '{ __typename }' } })).status()).toBe(404)
  })
})

test.describe('authenticated admin', () => {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD

  test.skip(!email || !password, 'set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')

  test('login works and admin sub-routes resolve to the right view', async ({ request }) => {
    const login = await request.post('/api/users/login', { data: { email, password } })
    expect(login.status()).toBe(200)

    const titleOf = async (path: string) =>
      (await (await request.get(path)).text()).match(/<title>([^<]*)<\/title>/)?.[1]

    expect(await titleOf('/admin')).toContain('Dashboard')
    expect(await titleOf('/admin/collections/users')).toContain('Người dùng')
    expect(await titleOf('/admin/account')).toContain('Account')
    // A client-supplied __p must not override the view the URL names.
    expect(await titleOf('/admin?__p=collections/users')).toContain('Dashboard')
  })

  test('an unknown admin route renders Payload\'s 404 view', async ({ request }) => {
    await request.post('/api/users/login', { data: { email, password } })

    const response = await request.get('/admin/collections/khong-ton-tai')
    expect(response.status()).toBe(404)
    expect(await response.text()).toContain('Nothing found')
  })
})

test.describe('media', () => {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD

  test.skip(!email || !password, 'set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')

  /**
   * Uploads its own fixture rather than reading whatever happens to be in the
   * database. An earlier version skipped when the library was empty, which
   * meant the public-read assertion below — the one guarding every image on
   * the site against a 403 — silently never ran on a fresh environment.
   *
   * The fixture is 1400x900, so every size (og included) is a real downscale.
   */
  const upload = async (request: APIRequestContext) => {
    const login = await request.post('/api/users/login', { data: { email, password } })
    expect(login.status()).toBe(200)

    const response = await request.post('/api/media', {
      multipart: {
        file: { name: 'e2e-fixture.png', mimeType: 'image/png', buffer: FIXTURE_PNG },
        _payload: JSON.stringify({ alt: 'Ảnh kiểm thử tự động' }),
      },
    })

    expect(response.status(), await response.text()).toBe(201)

    return (await response.json()).doc
  }

  test('every size is generated and publicly readable', async ({ playwright, request }) => {
    const doc = await upload(request)
    const sizes: Record<string, { url?: string }> = doc.sizes ?? {}

    // A null size is how Payload reports "source was smaller than the target".
    // Every size sets withoutEnlargement, so none may be null.
    for (const name of ['thumbnail', 'card', 'hero', 'og']) {
      expect(sizes[name]?.url, `size "${name}" must be generated`).toBeTruthy()
    }

    const urls = [doc.url, ...Object.values(sizes).map((size) => size?.url)].filter(
      (url): url is string => Boolean(url),
    )
    expect(urls.length).toBe(5)

    // A separate context with no session: what a visitor or crawler sees.
    const anonymous = await playwright.request.newContext({ baseURL })

    try {
      for (const url of urls) {
        const response = await anonymous.get(url)
        expect(response.status(), `${url} must be publicly readable`).toBe(200)
        expect(response.headers()['content-type']).toContain('image/')
      }
    } finally {
      await anonymous.dispose()
    }
  })

  test('the og size is exactly 1200x630', async ({ request }) => {
    const doc = await upload(request)

    expect(doc.sizes?.og).toMatchObject({ width: 1200, height: 630 })
  })
})
