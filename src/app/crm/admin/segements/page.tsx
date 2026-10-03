import type { Metadata } from 'next'

import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'

import { type RawSearchParams, segmentsFrom, withoutInternal } from '../adminParams'
import { importMap } from '../importMap.js'

type Args = {
  searchParams: Promise<RawSearchParams>
}

const resolve = async (searchParamsPromise: Promise<RawSearchParams>) => {
  const searchParams = await searchParamsPromise

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

const Page = async ({ searchParams }: Args) => {
  const resolved = await resolve(searchParams)

  return RootPage({
    config,
    importMap,
    params: Promise.resolve(resolved.params),
    searchParams: Promise.resolve(resolved.searchParams),
  })
}

export default Page
