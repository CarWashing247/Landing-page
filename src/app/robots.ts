import type { MetadataRoute } from 'next'

import { requireEnv } from '../lib/env'

/**
 * `/robots.txt`.
 *
 * **At the root of `app/`, not under a locale folder**, which is where the task
 * file put it. Next's convention requires it: `robots.(js|ts)` is recognised
 * only in the root of `app`, unlike `sitemap`, which may nest inside a route
 * segment. Nested, it is silently not built — no error, no warning, no entry in
 * the route table, and `/robots.txt` 404s. Caught by reading the build output
 * rather than by trusting the file to be picked up.
 *
 * It needs no rewrite for the same reason: the file's own path already is the
 * public URL, so this is the one route under `app/` the rewrite table does not
 * have to account for.
 *
 * **This is crawl hygiene, not access control.** Disallowing `/admin` and
 * `/api` keeps them out of search results and stops crawl budget being spent on
 * pages that will never rank; it does nothing to stop anyone reaching them.
 * T-22 owns the actual controls, and T-03's access rules are what currently
 * hold. A `Disallow` line is also a published list of the paths worth looking
 * at, which is a reason to keep it short rather than enumerate every endpoint.
 *
 * The `Sitemap:` line must be absolute — a relative one is ignored, silently,
 * and the sitemap simply never gets discovered.
 */
const robots = (): MetadataRoute.Robots => {
  const base = requireEnv('NEXT_PUBLIC_SITE_URL').replace(/\/$/, '')

  return {
    rules: {
      allow: '/',
      disallow: ['/admin', '/api'],
      userAgent: '*',
    },
    sitemap: `${base}/sitemap.xml`,
  }
}

export default robots
