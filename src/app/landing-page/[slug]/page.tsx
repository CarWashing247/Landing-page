import type { Metadata } from 'next'

import { ContentPage, contentPageMetadata, contentPageSlugs } from '../../../components/ContentPage'

/**
 * CMS pages for the `vi` locale. The locale is a literal so the route stays
 * statically prerenderable — see `src/lib/locales.ts` `FOLDER_FOR`.
 *
 * `generateStaticParams()` below prerenders one route per published document
 * in this locale. `dynamicParams` is left at its default of `true` on purpose:
 * a page published after the build must be reachable without a deploy, which is
 * project goal 2. Such a page renders once on demand and is cached from then on.
 */
const LOCALE = 'vi' as const

type Props = { params: Promise<{ slug: string }> }

export const generateMetadata = async ({ params }: Props): Promise<Metadata> =>
  contentPageMetadata((await params).slug, LOCALE)

const Page = async ({ params }: Props) => <ContentPage locale={LOCALE} slug={(await params).slug} />

export default Page

/**
 * One prerendered route per published document in this locale.
 *
 * Keyed by locale as well as slug (Design.md section 4): the two locale folders
 * each run this for their own locale, so the route count is locales x
 * documents, and a document with no translation is prerendered only where it
 * has a slug. The home document is left out: it is served at the locale root,
 * and its slug must not answer here.
 */
export const generateStaticParams = async (): Promise<{ slug: string }[]> =>
  contentPageSlugs(LOCALE)
