import { withPayload } from '@payloadcms/next/withPayload'

/**
 * Route folders under src/app are plain words — no `()` route groups, no `[]`
 * dynamic segments — so the filesystem does not produce the public URLs.
 * `rewrites` maps public paths onto those folders; `redirects` sends the
 * internal paths back out so nothing is reachable at two URLs.
 *
 * Renaming or moving anything under src/app means editing this file in the
 * same commit (AGENT.md section 4).
 *
 * Path depth cannot live in a plain folder name, and the two halves recover it
 * differently — see src/app/crm/admin/adminParams.ts:
 * - admin: from the `__p` query parameter that the rewrite below adds;
 * - API:   from the original request path, because a Route Handler's
 *          `request.url` is the URL the client asked for, not the rewrite
 *          destination, so `__p` never reaches it.
 *
 * Payload's `routes.admin` and `routes.api` stay at their defaults (`/admin`,
 * `/api`), so every URL Payload's client code builds is a public one and is
 * rewritten inbound. That is what keeps this layer invisible to Payload.
 */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  experimental: {
    // There is no single root layout (landing-page and crm each own one), so
    // unmatched URLs need app/global-not-found.tsx to render with lang="vi".
    globalNotFound: true,
  },
  /**
   * Redirects run on incoming requests only; the internal destination of a
   * rewrite is not re-processed through them, so these cannot loop (verified
   * for `/`).
   *
   * The `/crm/api` rule matters for security, not only for SEO: without it the
   * REST API — including `/api/users/login` — is reachable under a second path
   * that any path-based control (rate limit, WAF rule, robots.txt) would miss.
   */
  async redirects() {
    return [
      { source: '/landing-page', destination: '/', permanent: true },
      { source: '/crm/admin/:path*', destination: '/admin', permanent: false },
      { source: '/crm/api/:path*', destination: '/api/:path*', permanent: false },
    ]
  },
  async rewrites() {
    return {
      // afterFiles: runs after real filesystem routes, so /_next/* and static
      // assets are never touched.
      afterFiles: [
        { source: '/api/:path*', destination: '/crm/api/slug' },
        // Bare `/admin` needs its own rule. Folding it into `/admin/:path*`
        // leaves `__p` unsubstituted for zero segments, and Payload then renders
        // its 404 view for logged-in users (logged-out ones are sent to login
        // first, which hides it). `__p=/` decodes to no segments, and because
        // the rewrite's own value wins over the client's, a client-supplied
        // `__p` cannot choose the admin view.
        { source: '/admin', destination: '/crm/admin/segements?__p=/' },
        { source: '/admin/:path*', destination: '/crm/admin/segements?__p=:path*' },
        { source: '/', destination: '/landing-page' },
      ],
    }
  },
}

export default withPayload(nextConfig)
