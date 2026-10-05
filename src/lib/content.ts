import { cache } from 'react'

import type { Page, Service, SiteSetting } from '../payload-types'
import { logger } from './log'
import type { Locale } from './locales'
import { pathForPage, pathForService } from './locales'
import { getPayload } from './payload'

export type Localized<T> = {
  doc: T
  paths: Partial<Record<Locale, string>>
}

export const loadSiteSettings = cache(async (locale: Locale): Promise<SiteSetting | null> => {
  const log = logger('content:site-settings')
  const payload = await getPayload()
  try {
    return await payload.findGlobal({ slug: 'site-settings', depth: 1, locale })
  } catch (error) {
    log.error('site settings unavailable', {
      locale,
      reason: error instanceof Error ? error.message : 'unknown',
    })
    return null
  }
})

type PerLocale = {
  meta?: { canonical?: Partial<Record<Locale, string | null>> }
  slug?: Partial<Record<Locale, string>>
}

const unfallenBack = async (
  collection: 'pages' | 'services',
  id: number | string,
): Promise<PerLocale> =>
  (await (
    await getPayload()
  ).findByID({
    collection,
    id,
    depth: 0,
    locale: 'all',
    overrideAccess: false,
    select: { meta: { canonical: true }, slug: true },
  })) as unknown as PerLocale

const loadBySlug = async <T extends { id: number }>(
  collection: 'pages' | 'services',
  slug: string,
  locale: Locale,
): Promise<Localized<T> | null> => {
  const log = logger(`content:${collection}`)
  const payload = await getPayload()

  const { docs } = await payload.find({
    collection,
    depth: 1,
    limit: 1,
    locale,
    overrideAccess: false,
    where: { slug: { equals: slug } },
  })

  const doc = docs[0] as T | undefined
  if (!doc) {
    log.debug('no published document', { locale, slug })
    return null
  }

  const perLocale = await unfallenBack(collection, doc.id)

  return {
    doc: {
      ...doc,
      meta: { ...(doc as { meta?: object }).meta, canonical: perLocale.meta?.canonical?.[locale] },
    } as T,
    paths: perLocale.slug ?? {},
  }
}

export const loadPage = cache(
  async (slug: string, locale: Locale): Promise<Localized<Page> | null> => {
    const found = await loadBySlug<Page>('pages', slug, locale)
    return found && { ...found, paths: pathsFrom(found.paths, pathForPage) }
  },
)

export const loadService = cache(
  async (slug: string, locale: Locale): Promise<Localized<Service> | null> => {
    const found = await loadBySlug<Service>('services', slug, locale)
    return found && { ...found, paths: pathsFrom(found.paths, pathForService) }
  },
)

export const loadServices = cache(async (locale: Locale): Promise<Service[]> => {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'services',
    depth: 1,
    limit: 3,
    locale,
    overrideAccess: false,
    sort: 'price',
  })
  return docs as Service[]
})

const pathsFrom = (
  slugs: Partial<Record<Locale, string>>,
  build: (slug: string, locale: Locale) => string,
): Partial<Record<Locale, string>> => {
  const paths: Partial<Record<Locale, string>> = {}

  for (const [locale, slug] of Object.entries(slugs) as [Locale, string | undefined][]) {
    if (slug) paths[locale] = build(slug, locale)
  }

  return paths
}
