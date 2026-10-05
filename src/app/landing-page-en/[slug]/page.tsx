import type { Metadata } from 'next'

import { ContentPage, contentPageMetadata } from '../../../components/ContentPage'

/**
 * CMS pages for the `en` locale. The locale is a literal so the route stays
 * statically prerenderable — see `src/lib/locales.ts` `FOLDER_FOR`.
 *
 * `generateStaticParams()` is T-10; until it lands these routes render on
 * demand, which is the open question Design.md section 5a flagged as "decide
 * before T-09" and which is answered there.
 */
const LOCALE = 'en' as const

type Props = { params: Promise<{ slug: string }> }

export const generateMetadata = async ({ params }: Props): Promise<Metadata> =>
  contentPageMetadata((await params).slug, LOCALE)

const Page = async ({ params }: Props) => <ContentPage locale={LOCALE} slug={(await params).slug} />

export default Page
