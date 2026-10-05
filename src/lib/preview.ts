import type { Locale } from './locales'
import { isLocale, pathForPage, pathForService } from './locales'

/**
 * The draft-preview contract, spelled once.
 *
 * `admin.preview` on each collection builds a URL here, and
 * `/api/draft/route.ts` takes it apart. They are two halves of one agreement:
 * a parameter renamed on one side and not the other produces a Preview button
 * that silently 400s, which an editor will report as "preview is broken" and
 * nobody will be able to reproduce from the admin alone.
 */

/** The collections a draft can be previewed from. */
export const PREVIEWABLE = ['pages', 'services'] as const

export type Previewable = (typeof PREVIEWABLE)[number]

export const isPreviewable = (value: unknown): value is Previewable =>
  typeof value === 'string' && (PREVIEWABLE as readonly string[]).includes(value)

/** Query parameter names, shared by the builder and the parser. */
export const PARAM = {
  collection: 'collection',
  locale: 'locale',
  secret: 'secret',
  slug: 'slug',
} as const

/**
 * Where a previewed document lives on the public site.
 *
 * The service segment is itself localized (`/dich-vu/` against
 * `/en/services/`), which is why this goes through `locales.ts` rather than
 * concatenating a path here.
 */
export const pathForPreview = (
  collection: Previewable,
  slug: string,
  locale: Locale,
): string => (collection === 'pages' ? pathForPage(slug, locale) : pathForService(slug, locale))

/**
 * The URL the Preview button opens.
 *
 * Relative, not absolute: the admin is served from the same origin as the
 * site, and an absolute URL built from `NEXT_PUBLIC_SITE_URL` would send an
 * editor working against a preview deployment to production. Returns `null`
 * when the document has no slug in this locale yet — Payload hides the button
 * rather than offering one that cannot work.
 */
export const previewUrl = ({
  collection,
  locale,
  secret,
  slug,
}: {
  collection: Previewable
  locale: string
  secret: string
  slug: unknown
}): null | string => {
  if (typeof slug !== 'string' || slug.length === 0 || !isLocale(locale)) {
    return null
  }

  const params = new URLSearchParams({
    [PARAM.collection]: collection,
    [PARAM.locale]: locale,
    [PARAM.secret]: secret,
    [PARAM.slug]: slug,
  })

  return `/api/draft?${params.toString()}`
}

/**
 * A caller-supplied return path, or `null` if it is not a path on this site.
 *
 * The exit route takes `?to=` from a link the banner rendered, and an
 * unchecked value there is an open redirect: `/api/draft/exit?to=https://evil.example`
 * is a link that *starts* on this domain, which is exactly what makes a
 * phishing hop convincing. The admin is the audience for this URL, so the
 * credential at risk is an editor's.
 *
 * Two shapes are rejected. An absolute URL is the obvious one. A
 * protocol-relative `//evil.example` is the one that gets missed: it starts
 * with `/`, so a naive check passes it, and the browser reads it as a host.
 */
export const safeLocalPath = (to: null | string | undefined): null | string =>
  to && to.startsWith('/') && !to.startsWith('//') ? to : null
