import config from '@payload-config'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
} from '@payloadcms/next/routes'

import { slugFrom } from '../../admin/adminParams'

type PayloadRouteHandler = (
  request: Request,
  args: { params: Promise<{ slug?: string[] }> },
) => Promise<Response>

/**
 * The folder is the plain word `slug`, so Next.js supplies no route params.
 * Rebuild the slug array from the original request path (`/api/users/login`
 * -> `['users', 'login']`) before handing the request to Payload. Not from
 * `__p`: that never reaches a Route Handler — see adminParams.ts.
 */
const withSlug =
  (handler: PayloadRouteHandler) =>
  (request: Request): Promise<Response> =>
    handler(request, { params: Promise.resolve({ slug: slugFrom(request) }) })

export const GET = withSlug(REST_GET(config))
export const POST = withSlug(REST_POST(config))
export const DELETE = withSlug(REST_DELETE(config))
export const PATCH = withSlug(REST_PATCH(config))
export const OPTIONS = withSlug(REST_OPTIONS(config))
