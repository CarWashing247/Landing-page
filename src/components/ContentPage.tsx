import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import { loadPage, loadSiteSettings } from '../lib/content'
import { t } from '../i18n/t'
import type { Locale } from '../lib/locales'
import { pathForPage } from '../lib/locales'
import { faqSchema } from '../lib/schema/faq'
import { DraftBanner } from './DraftBanner'
import { JsonLd } from './seo/JsonLd'
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
  const { isEnabled: draft } = await draftMode()
  const found = await loadPage(slug, locale, draft)

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
  const { isEnabled: draft } = await draftMode()
  const found = await loadPage(slug, locale, draft)

  if (!found) {
    notFound()
  }

  return (
    <>
      {/*
        `FAQPage`, and only when the page actually carries an FAQ block. Nothing
        emits one today because the block itself is T-17 — `faqSchema` returns
        `null` for a layout without one, which is also the acceptance criterion.
      */}
      <JsonLd
        schema={faqSchema({
          layout: found.doc.layout,
          locale,
          path: pathForPage(slug, locale),
        })}
      />
      <DraftBanner locale={locale} path={pathForPage(slug, locale)} />
      <main>
        <h1>{found.doc.title}</h1>
        <p>{t(locale).placeholder.pageBody}</p>
      </main>
    </>
  )
}
