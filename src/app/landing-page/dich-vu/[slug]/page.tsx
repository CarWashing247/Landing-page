import type { Metadata } from 'next'

import { ServicePage, servicePageMetadata } from '../../../../components/ServicePage'

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
