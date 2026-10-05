import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { loadPage, loadSiteSettings } from '../lib/content'
import type { Locale } from '../lib/locales'
import { buildMetadata } from './seo/metadata'

/**
 * A CMS page, shared by both locale folders.
 *
 * The body is a placeholder: rendering `layout` blocks is T-17 and the real
 * copy is T-23. What is not a placeholder is the shape — one `<h1>` carrying
 * the document's own title (AGENT.md 5.2, and the first of the five keyword
 * placements in Design.md section 3), and `notFound()` for a slug with no
 * published document behind it.
 *
 * The metadata helper lives beside the body rather than in each route file so
 * the two locales cannot drift. It delegates to `buildMetadata()` and assembles
 * nothing itself.
 */

export const contentPageMetadata = async (slug: string, locale: Locale): Promise<Metadata> => {
  const found = await loadPage(slug, locale)

  /**
   * Nothing to describe: the page below calls `notFound()` for this same slug,
   * so what renders is the 404, whose own metadata is not this route's to set.
   */
  if (!found) {
    return {}
  }

  return buildMetadata({
    doc: found.doc,
    locale,
    paths: found.paths,
    settings: await loadSiteSettings(locale),
  })
}

export const ContentPage = async ({ locale, slug }: { locale: Locale; slug: string }) => {
  const found = await loadPage(slug, locale)

  if (!found) {
    notFound()
  }

  return (
    <main>
      <h1>{found.doc.title}</h1>
      <p>
        {locale === 'vi'
          ? 'TODO(copy): nội dung trang — các khối nội dung là T-17, nội dung thật là T-23.'
          : 'TODO(copy): page body — blocks are T-17, real content is T-23.'}
      </p>
    </main>
  )
}
