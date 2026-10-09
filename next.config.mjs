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
      /**
       * The content routes added in T-09 are nested, so the two rules above no
       * longer cover every internal path. Without these, `/landing-page/bang-gia`
       * serves the same page as `/bang-gia` and Google picks one of them.
       *
       * `opengraph-image` is excluded, and that exclusion is load-bearing. Next
       * generates that route's URL from the *internal* pathname, so the
       * `og:image` tag reads `/landing-page/opengraph-image?<hash>`. Redirecting
       * it put a 308 in front of every share card — which Facebook does follow,
       * but it is one more thing between Zalo and a picture, on the one image
       * path that exists precisely because the alternative is no image at all.
       * An image served at two URLs costs nothing: it is not a page, it is not
       * in the sitemap, and nothing competes for a ranking with it.
       */
      {
        source: '/landing-page/:path((?!opengraph-image$).*)',
        destination: '/:path',
        permanent: true,
      },
      {
        source: '/landing-page-en/:path((?!opengraph-image$).*)',
        destination: '/en/:path',
        permanent: true,
      },
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
        // Vietnamese content paths. This has to be a catch-all: the slugs come
        // from the CMS, so there is no finite list to enumerate here, and an
        // editor adding a page must not need a deploy (project goal 2).
        //
        // It is last on purpose. These rules are matched in order, so every
        // specific path above — `/api/**`, `/admin/**`, `/en/**`, `/` — is
        // already claimed before this sees it. Being in `afterFiles` also means
        // real files and `/_next/**` are never reached by it.
        //
        // Consequence worth knowing: with this rule, every URL matches a route,
        // so `app/global-not-found.tsx` — which only renders for a URL matching
        // no route at all — no longer runs for public paths. An unknown slug
        // reaches `[slug]/page.tsx`, which calls `notFound()`, and each locale's
        // `not-found.tsx` renders it. Next 16 sends that as a 404 with an empty
        // HTML shell and paints the body after hydration (T-19J, follow-up A1).
        { source: '/:path*', destination: '/landing-page/:path*' },
      ],
    }
  },
}

export default withPayload(nextConfig)
