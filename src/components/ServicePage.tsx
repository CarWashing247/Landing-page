import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import { loadBusinessInfo, loadService, loadSiteSettings } from '../lib/content'
import type { Locale } from '../lib/locales'
import { pathForService } from '../lib/locales'
import { serviceSchema } from '../lib/schema/service'
import { DraftBanner } from './DraftBanner'
import { JsonLd } from './seo/JsonLd'
import { buildMetadata } from './seo/metadata'

/**
 * A service page, shared by both locale folders. See `ContentPage.tsx` — the
 * only differences are the collection and that a service's heading field is
 * `name` rather than `title`.
 *
 * The full template — price, duration, what the package includes — is T-18. The
 * `Service` + `Offer` JSON-LD is already here (T-14), which is deliberate: the
 * schema is built from the CMS fields, not from what the template happens to
 * render, so it does not wait on the visual design.
 */

export const servicePageMetadata = async (slug: string, locale: Locale): Promise<Metadata> => {
  const { isEnabled: draft } = await draftMode()
  const found = await loadService(slug, locale, draft)

  if (!found) {
    return {}
  }

  return buildMetadata({
    // `name` is what an editor fills in; `buildMetadata` asks for `title`
    // because that is what it becomes. Mapping it here keeps the builder from
    // needing to know one collection from another.
    doc: { meta: found.doc.meta, title: found.doc.name },
    locale,
    paths: found.paths,
    settings: await loadSiteSettings(locale),
  })
}

export const ServicePage = async ({ locale, slug }: { locale: Locale; slug: string }) => {
  const { isEnabled: draft } = await draftMode()
  const found = await loadService(slug, locale, draft)

  if (!found) {
    notFound()
  }

  return (
    <>
      {/*
        `provider` is a reference to the home page's business node rather than a
        second copy of the name and address — see `src/lib/schema/service.ts`.
      */}
      <JsonLd
        schema={serviceSchema({
          business: await loadBusinessInfo(),
          locale,
          service: found.doc,
        })}
      />
      <DraftBanner locale={locale} path={pathForService(slug, locale)} />
      <main>
        <h1>{found.doc.name}</h1>
        <p>
          {locale === 'vi'
            ? 'TODO(copy): nội dung trang dịch vụ — bố cục đầy đủ là T-18.'
            : 'TODO(copy): service page body — the full template is T-18.'}
        </p>
      </main>
    </>
  )
}
