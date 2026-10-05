import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BlockRenderer } from './blocks/BlockRenderer'
import { loadPage, loadSiteSettings } from '../lib/content'
import type { Locale } from '../lib/locales'
import { buildMetadata } from './seo/metadata'

export const contentPageMetadata = async (slug: string, locale: Locale): Promise<Metadata> => {
  const found = await loadPage(slug, locale)
  if (!found) return {}
  return buildMetadata({ doc: found.doc, locale, paths: found.paths, settings: await loadSiteSettings(locale) })
}

export const ContentPage = async ({ locale, slug }: { locale: Locale; slug: string }) => {
  const found = await loadPage(slug, locale)
  if (!found) notFound()

  const blocks = (found.doc as unknown as { layout?: Array<{ id?: string | null; blockType: string; [key: string]: unknown }> }).layout

  return (
    <main>
      <BlockRenderer blocks={blocks} locale={locale} />
    </main>
  )
}
