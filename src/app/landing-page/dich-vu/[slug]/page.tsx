import type { Metadata } from 'next'

import { ServicePage, servicePageMetadata } from '../../../../components/ServicePage'
import { publishedSlugs } from '../../../../lib/content'

/**
 * Service pages for the `vi` locale. The path segment differs per locale —
 * `/dich-vu/` against `/en/services/` (Design.md 1.1a) — and lives in
 * `SERVICE_SEGMENT` in `src/lib/locales.ts`, which is what builds the
 * `hreflang` pair.
 */
const LOCALE = 'vi' as const

type Props = { params: Promise<{ slug: string }> }

export const generateMetadata = async ({ params }: Props): Promise<Metadata> =>
  servicePageMetadata((await params).slug, LOCALE)

const Page = async ({ params }: Props) => <ServicePage locale={LOCALE} slug={(await params).slug} />

export default Page

/**
 * One prerendered route per published document in this locale.
 *
 * Keyed by locale as well as slug (Design.md section 4): the two locale folders
 * each run this for their own locale, so the route count is locales x
 * documents, and a document with no translation is prerendered only where it
 * has a slug.
 */
export const generateStaticParams = async (): Promise<{ slug: string }[]> =>
  (await publishedSlugs('services', LOCALE)).map((slug) => ({ slug }))
