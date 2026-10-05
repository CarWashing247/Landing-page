import { ImageResponse } from 'next/og'

import { loadSiteSettings } from '../../lib/content'
import type { Locale } from '../../lib/locales'

/**
 * The last-resort share image, shared by both locale folders.
 *
 * Reached only when a page has no `meta.image` **and** `SiteSettings.ogFallback`
 * is unset — so on a fresh install, and on any page an editor adds before
 * someone uploads a fallback. A share with no image at all gets a grey box on
 * Facebook and nothing on Zalo, which looks like a broken link rather than a
 * plain one.
 *
 * `buildMetadata()` is what makes this reachable: it omits `openGraph.images`
 * entirely when there is nothing to put there, because setting that key at all
 * overrides this file convention.
 *
 * **Deliberately wordless beyond the brand name.** The brand is ASCII, so this
 * needs no font beyond the one `next/og` bundles. A Vietnamese tagline here
 * would stack diacritics through Satori, and a missing glyph in a 1200x630 PNG
 * is invisible until someone shares the page. Real artwork belongs in
 * `ogFallback`, uploaded once, where a designer can see it.
 */

export const SIZE = { height: 630, width: 1200 }
export const CONTENT_TYPE = 'image/png'

export const openGraphImage = async (locale: Locale) => {
  const settings = await loadSiteSettings(locale)

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#0b1b2b',
          color: '#ffffff',
          display: 'flex',
          fontSize: 96,
          fontWeight: 700,
          height: '100%',
          justifyContent: 'center',
          letterSpacing: '-0.02em',
          width: '100%',
        }}
      >
        {settings?.brandName ?? 'AutoWash247'}
      </div>
    ),
    SIZE,
  )
}
