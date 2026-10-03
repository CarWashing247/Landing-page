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
/**
 * Derived here rather than imported from src/lib/r2.ts: this file is plain
 * ESM and cannot import a TypeScript module. Kept to one expression so the
 * duplication stays obvious.
 */
const r2Hostname = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : null

const nextConfig = {
  images: {
    // next/image refuses to optimise a remote host that is not listed here.
    // Empty on local disk, where uploads are served same-origin by Payload.
    remotePatterns: r2Hostname
      ? [{ protocol: 'https', hostname: r2Hostname, pathname: '/**' }]
      : [],
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
      { source: '/landing-page-en', destination: '/en', permanent: true },
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
        // Locales. English is prefixed; Vietnamese is the default and
        // unprefixed (Design.md 1.1a). The prefix cannot be a plain folder
        // either, so it rides this table like every other public path.
        //
        // `/en` needs its own rule for the same reason `/admin` did: folded
        // into `/en/:path*`, the parameter is left unsubstituted for zero
        // segments.
        // Locales. Each locale has its own plain-word folder so the locale
        // is a build-time constant and pages stay statically prerenderable
        // (src/lib/locales.ts FOLDER_FOR). Resolving it at request time made
        // every page `ƒ`, which breaks AGENT.md 5.1.
        { source: '/en', destination: '/landing-page-en' },
        { source: '/en/:path*', destination: '/landing-page-en/:path*' },
        { source: '/', destination: '/landing-page' },
      ],
    }
  },
}

export default withPayload(nextConfig)
