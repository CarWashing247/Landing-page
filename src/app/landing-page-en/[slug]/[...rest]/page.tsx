import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { notFoundMetadata } from '../../../../components/seo/metadata'
import { loadSiteSettings } from '../../../../lib/content'

/**
 * Every English URL two or more segments deep that no real route claims —
 * `/en/a/b`, `/en/services/quick-wash/extra` — so it reaches this folder's
 * `not-found.tsx` in English (follow-up A19).
 *
 * Without it such a URL matches no route at all and lands in
 * `global-not-found.tsx`, which has neither params nor the request path (its
 * `headers()` carry no URL; measured in T-19J), so it can only render the
 * default locale: Vietnamese copy and `lang="vi"` under an `/en` address.
 * Single-segment URLs already reach `[slug]/page.tsx`, and every real nested
 * route (`services/[slug]`) is more specific than this one, so it shadows
 * nothing.
 *
 * The Vietnamese side needs no twin: its unmatched URLs reach the global 404,
 * which is already in the right locale.
 */
const MissingPage = () => notFound()

/** The same 404 title the slug routes and the global 404 give (A18). */
export const generateMetadata = async (): Promise<Metadata> =>
  notFoundMetadata((await loadSiteSettings('en'))?.brandName ?? 'AutoWash247')

export default MissingPage

/** No paths: nothing here exists, and AGENT.md 5.1 asks every dynamic route to say so. */
export const generateStaticParams = async (): Promise<{ slug: string; rest: string[] }[]> => []
