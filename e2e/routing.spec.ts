import {
  type APIRequestContext,
  type PlaywrightWorkerArgs,
  expect,
  test,
} from '@playwright/test'

/** The `playwright` fixture, used to build isolated request contexts. */
type PlaywrightFixture = PlaywrightWorkerArgs['playwright']

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
    expect(await titleOf('/admin/account')).toContain('Account')

    // The Users label is a { vi, en } pair since T-04A, so this asserts the
    // right *view* rendered rather than which language won. Payload resolves
    // the language for API requests to 'en' regardless of the payload-lng
    // cookie, the Accept-Language header or i18n.fallbackLanguage — measured,
    // and noted in the T-04A task file as unresolved.
    expect(await titleOf('/admin/collections/users')).toMatch(/Người dùng|Users/)

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

test.describe('roles and access control', () => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL
  const adminPassword = process.env.E2E_ADMIN_PASSWORD
  const editorEmail = process.env.E2E_EDITOR_EMAIL
  const editorPassword = process.env.E2E_EDITOR_PASSWORD

  test.skip(
    !adminEmail || !adminPassword || !editorEmail || !editorPassword,
    'set E2E_ADMIN_* and E2E_EDITOR_* credentials',
  )

  const signIn = async (context: APIRequestContext, email?: string, password?: string) => {
    const response = await context.post('/api/users/login', { data: { email, password } })
    expect(response.status(), `${email} must be able to log in`).toBe(200)
  }

  test('an editor sees only its own account, never other users', async ({ playwright }) => {
    const editor = await playwright.request.newContext({ baseURL })

    try {
      await signIn(editor, editorEmail, editorPassword)

      const list = await editor.get('/api/users')
      expect(list.status()).toBe(200)

      const body = await list.json()
      expect(body.totalDocs).toBe(1)
      expect(body.docs.map((d: { email: string }) => d.email)).toEqual([editorEmail])
    } finally {
      await editor.dispose()
    }
  })

  test('an editor cannot create, delete or promote accounts', async ({ playwright }) => {
    const editor = await playwright.request.newContext({ baseURL })
    const admin = await playwright.request.newContext({ baseURL })

    try {
      await signIn(editor, editorEmail, editorPassword)
      await signIn(admin, adminEmail, adminPassword)

      const self = (await (await editor.get('/api/users')).json()).docs[0]

      expect((await editor.post('/api/users', {
        data: { email: 'intruder@example.com', password: 'Whatever123!' },
      })).status()).toBe(403)

      expect((await editor.delete(`/api/users/${self.id}`)).status()).toBe(403)

      // Payload strips a field the user may not write rather than rejecting
      // the request, so this returns 200. What matters is that the role did
      // not change — assert the stored value, not the status code.
      await editor.patch(`/api/users/${self.id}`, { data: { role: 'admin' } })

      const after = await admin.get(`/api/users/${self.id}`)
      expect((await after.json()).role).toBe('editor')
    } finally {
      await editor.dispose()
      await admin.dispose()
    }
  })

  test('an editor may manage media but never delete it', async ({ playwright }) => {
    const editor = await playwright.request.newContext({ baseURL })

    try {
      await signIn(editor, editorEmail, editorPassword)

      // Uploading is a create: without it an editor could change a page's
      // words but not its pictures.
      const upload = await editor.post('/api/media', {
        multipart: {
          file: { name: 'editor-upload.png', mimeType: 'image/png', buffer: FIXTURE_PNG },
          _payload: JSON.stringify({ alt: 'Biên tập viên tải lên' }),
        },
      })
      expect(upload.status()).toBe(201)

      const { doc } = await upload.json()

      expect((await editor.patch(`/api/media/${doc.id}`, {
        data: { alt: 'Đã sửa mô tả' },
      })).status()).toBe(200)

      // Deleting an image breaks every page using it, with no undo.
      expect((await editor.delete(`/api/media/${doc.id}`)).status()).toBe(403)
    } finally {
      await editor.dispose()
    }
  })

  test('anonymous requests cannot read accounts', async ({ playwright }) => {
    const anonymous = await playwright.request.newContext({ baseURL })

    try {
      expect((await anonymous.get('/api/users')).status()).toBe(403)
    } finally {
      await anonymous.dispose()
    }
  })
})

test.describe('the last administrator cannot be removed', () => {
  const adminEmail = process.env.E2E_ADMIN_EMAIL
  const adminPassword = process.env.E2E_ADMIN_PASSWORD

  test.skip(!adminEmail || !adminPassword, 'set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')

  /**
   * Losing the last admin bricks the deployment: `role` is admin-only at
   * field level and Users is hidden from editors, so nobody can promote
   * anyone and only SQL can undo it. Both routes to that state are blocked.
   */
  const asAdmin = async (playwright: PlaywrightFixture) => {
    const context = await playwright.request.newContext({ baseURL })
    const login = await context.post('/api/users/login', {
      data: { email: adminEmail, password: adminPassword },
    })
    expect(login.status()).toBe(200)

    return context
  }

  const soleAdminId = async (context: APIRequestContext) => {
    const admins = (await (await context.get('/api/users?limit=100&depth=0')).json()).docs.filter(
      (user: { role: string }) => user.role === 'admin',
    )
    expect(admins, 'this spec assumes exactly one admin').toHaveLength(1)

    return admins[0].id as number
  }

  test('demoting the last admin is refused, with a reason', async ({ playwright }) => {
    const admin = await asAdmin(playwright)

    try {
      const id = await soleAdminId(admin)
      const response = await admin.patch(`/api/users/${id}`, { data: { role: 'editor' } })

      // 400 and a readable message, not a 500 "Something went wrong."
      // Either translation is accepted: the message comes from the catalog
      // keyed by the language Payload resolves, and for API requests that is
      // always 'en' in this version (see T-04A notes).
      expect(response.status()).toBe(400)
      expect((await response.json()).errors[0].message).toMatch(
        /quản trị viên cuối cùng|last administrator/,
      )

      const after = await admin.get(`/api/users/${id}`)
      expect((await after.json()).role).toBe('admin')
    } finally {
      await admin.dispose()
    }
  })

  test('deleting the last admin is refused, with a reason', async ({ playwright }) => {
    const admin = await asAdmin(playwright)

    try {
      const id = await soleAdminId(admin)
      const response = await admin.delete(`/api/users/${id}`)

      expect(response.status()).toBe(400)
      expect((await response.json()).errors[0].message).toMatch(
        /quản trị viên cuối cùng|last administrator/,
      )

      expect((await admin.get(`/api/users/${id}`)).status()).toBe(200)
    } finally {
      await admin.dispose()
    }
  })

  test('a second admin may be demoted and deleted', async ({ playwright }) => {
    const admin = await asAdmin(playwright)

    try {
      const created = await admin.post('/api/users', {
        data: {
          email: `e2e-second-admin-${Date.now()}@autowash247.local`,
          password: 'SecondAdmin123!',
          role: 'admin',
        },
      })
      expect(created.status()).toBe(201)

      const { doc } = await created.json()
      expect(doc.role).toBe('admin')

      // Allowed now, because it is no longer the last one.
      expect((await admin.patch(`/api/users/${doc.id}`, { data: { role: 'editor' } })).status()).toBe(200)
      expect((await admin.delete(`/api/users/${doc.id}`)).status()).toBe(200)
    } finally {
      await admin.dispose()
    }
  })
})

test.describe('locales', () => {
  test('each locale is served with its own lang attribute', async ({ request }) => {
    const vi = await request.get('/')
    expect(vi.status()).toBe(200)
    expect(await vi.text()).toContain('<html lang="vi"')

    const en = await request.get('/en')
    expect(en.status()).toBe(200)
    expect(await en.text()).toContain('<html lang="en"')
  })

  test('internal locale folders redirect out, so no page has two URLs', async ({ request }) => {
    const pairs: Array<[string, string]> = [
      ['/landing-page', '/'],
      ['/landing-page-en', '/en'],
    ]

    for (const [internal, publicPath] of pairs) {
      const response = await request.get(internal, { maxRedirects: 0 })
      expect(response.status()).toBe(308)
      expect(new URL(response.headers().location ?? '', 'http://x').pathname).toBe(publicPath)
    }
  })

  test('the two locales render different copy', async ({ request }) => {
    const vi = await (await request.get('/')).text()
    const en = await (await request.get('/en')).text()

    // Both are placeholders until T-23, but they must not be the same string:
    // that would mean the locale is not reaching the page.
    const extract = (html: string) => html.match(/TODO\(copy\)[^<]*/)?.[0]
    expect(extract(vi)).toBeTruthy()
    expect(extract(en)).toBeTruthy()
    expect(extract(vi)).not.toBe(extract(en))
  })

  test('localized fields are stored per locale, not shared', async ({ playwright }) => {
    const email = process.env.E2E_ADMIN_EMAIL
    const password = process.env.E2E_ADMIN_PASSWORD
    test.skip(!email || !password, 'set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')

    const admin = await playwright.request.newContext({ baseURL })

    try {
      expect((await admin.post('/api/users/login', { data: { email, password } })).status()).toBe(200)

      const created = await admin.post('/api/media?locale=vi', {
        multipart: {
          file: { name: 'locale-fixture.png', mimeType: 'image/png', buffer: FIXTURE_PNG },
          _payload: JSON.stringify({ alt: 'Mô tả tiếng Việt' }),
        },
      })
      expect(created.status()).toBe(201)
      const { doc } = await created.json()

      // Write the English alt only.
      expect(
        (await admin.patch(`/api/media/${doc.id}?locale=en`, {
          data: { alt: 'English description' },
        })).status(),
      ).toBe(200)

      const altFor = async (locale: string) =>
        (await (await admin.get(`/api/media/${doc.id}?locale=${locale}&depth=0`)).json()).alt

      expect(await altFor('en')).toBe('English description')
      // The Vietnamese value must be untouched — this is what a shared column
      // would get wrong.
      expect(await altFor('vi')).toBe('Mô tả tiếng Việt')
    } finally {
      await admin.dispose()
    }
  })
})
