/**
 * The admin route folder is the plain word `segements`, so Next.js supplies no
 * route params. The rewrite in next.config.mjs puts the real path depth in the
 * `__p` query parameter instead; these helpers decode it. Page components get
 * framework-resolved `searchParams`, which do reflect the rewrite.
 *
 * Payload reads `params.segments` by that exact name — see
 * `@payloadcms/next/dist/views/Root/index.js`, which does
 * `Array.isArray(params.segments) ? params.segments : []`. Without this,
 * every admin URL would render the dashboard with no error.
 */
const INTERNAL_PARAM = '__p'

export type RawSearchParams = Record<string, string | string[] | undefined>

/** `collections/users` -> `['collections', 'users']` */
export const segmentsFrom = (searchParams: RawSearchParams): string[] => {
  const raw = searchParams[INTERNAL_PARAM]

  if (typeof raw !== 'string') {
    return []
  }

  return raw.split('/').filter(Boolean)
}

/**
 * Payload also receives `searchParams`, and the rewrite's bookkeeping must not
 * leak into the admin UI's own query state.
 */
export const withoutInternal = (
  searchParams: RawSearchParams,
): Record<string, string | string[]> =>
  Object.fromEntries(
    Object.entries(searchParams).filter(
      ([key, value]) => key !== INTERNAL_PARAM && value !== undefined,
    ),
  ) as Record<string, string | string[]>

/**
 * Same job for the REST API, whose folder is the plain word `slug` — but it
 * cannot use `__p`.
 *
 * A Route Handler's `request.url` is the URL the client asked for, not the
 * rewritten destination, so the rewrite's query parameter never arrives.
 * Verified: `/api/users` reached Payload with an empty slug and it answered
 * `Route not found "/api"`. The public path is what we want anyway.
 *
 * Anything not under `/api` yields no slug, which Payload answers with 404.
 * Do not add a fallback that reads a slug from elsewhere: an earlier version
 * read `__p` here, which made `/crm/api/slug?__p=users/login` a working second
 * login endpoint.
 */
const API_PREFIX = '/api'

export const slugFrom = (request: Request): string[] => {
  const { pathname } = new URL(request.url)

  if (pathname !== API_PREFIX && !pathname.startsWith(`${API_PREFIX}/`)) {
    return []
  }

  return pathname.slice(API_PREFIX.length).split('/').filter(Boolean)
}
