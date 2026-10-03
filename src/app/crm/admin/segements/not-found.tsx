import type { Metadata } from 'next'

import config from '@payload-config'
import { NotFoundPage, generatePageMetadata } from '@payloadcms/next/views'

import { type RawSearchParams, segmentsFrom, withoutInternal } from '../adminParams'
import { importMap } from '../importMap.js'

// Next.js does not pass props to a not-found component, so `searchParams` is
// usually absent here. Without the fallback, Payload's 404 view throws
// `Cannot read properties of undefined (reading '__p')` instead of rendering.
type Args = {
  searchParams?: Promise<RawSearchParams>
}

const resolve = async (searchParamsPromise?: Promise<RawSearchParams>) => {
  const searchParams = (await searchParamsPromise) ?? {}

  return {
    params: { segments: segmentsFrom(searchParams) },
    searchParams: withoutInternal(searchParams),
  }
}

export const generateMetadata = async ({ searchParams }: Args): Promise<Metadata> => {
  const resolved = await resolve(searchParams)

  return generatePageMetadata({
    config,
    params: Promise.resolve(resolved.params),
    searchParams: Promise.resolve(resolved.searchParams),
  })
}

const NotFound = async ({ searchParams }: Args) => {
  const resolved = await resolve(searchParams)

  return NotFoundPage({
    config,
    importMap,
    params: Promise.resolve(resolved.params),
    searchParams: Promise.resolve(resolved.searchParams),
  })
}

export default NotFound
