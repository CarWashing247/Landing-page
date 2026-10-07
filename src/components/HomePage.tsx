import type { Metadata } from 'next'
import { draftMode } from 'next/headers'

import { loadBusinessInfo, loadPage, loadSiteSettings } from '../lib/content'
import { t } from '../i18n/t'
import type { Locale } from '../lib/locales'
import { HOME_SLUG, LOCALES, pathForHome } from '../lib/locales'
import { autoWashSchema } from '../lib/schema/autowash'
import { PageBody } from './ContentPage'
import { JsonLd } from './seo/JsonLd'
import { buildMetadata } from './seo/metadata'

/**
 * The home page, shared by both locales.
 *
 * **`/` is the `Pages` document with the reserved slug `home`** (D1, answered
 * as path A — see `architecture/task/t-17a-home-page.md`). It composes from the
 * same blocks as every other page and goes through the same body renderer, so
 * an editor changes the most important page on the site without a deploy. Its
 * slug never appears in a URL: `pathForPage` maps it to `/` and `/en`, and
 * `ContentPage` refuses it so `/home` 404s.
 *
 * The read goes through `loadPage`, so it carries the same `page:<locale>:home`
 * tag T-11's webhook already purges when the document is published — no new
 * revalidation path.
 *
 * The locale arrives as a prop from the per-locale folder, so it is a
 * build-time constant and this stays statically prerendered.
 */

const loadHome = async (locale: Locale) => {
  const { isEnabled: draft } = await draftMode()
  const found = await loadPage(HOME_SLUG, locale, draft)

  /**
   * Only a document whose slug **in this locale** is `home` is this locale's
   * home page. `paths` is read with the fallback off, so a document with a
   * Vietnamese `home` slug and no English slug has no English path — and must
   * not be served at `/en` advertising `hreflang` for a locale it lacks.
   */
  return found?.paths[locale] === pathForHome(locale) ? found : null
}

export const HomePage = async ({ locale }: { locale: Locale }) => {
  const found = await loadHome(locale)

  return (
    <>
      {/*
        The `AutoWash` business node lives on the home page alone, with a stable
        `@id` that service pages reference as their `provider` — one business
        entity for the whole site rather than a copy of the name and address on
        every page. It is built from `BusinessInfo`, never from the home
        document, so it does not move when the page's content does.
        `autoWashSchema` returns `null` while `BusinessInfo` still holds
        `TODO(data):` placeholders, so nothing is emitted until T-23 fills them
        in, and then it appears without a deploy.
      */}
      <JsonLd
        schema={autoWashSchema({
          business: await loadBusinessInfo(),
          locale,
          settings: await loadSiteSettings(locale),
        })}
      />

      {found ? (
        <PageBody doc={found.doc} locale={locale} path={pathForHome(locale)} />
      ) : (
        /*
          No home document in this locale — a fresh install, or before T-23
          seeds one. `/` must still answer rather than 404, because it is the
          URL every link and share points at; the heading is the one `<h1>`.
        */
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-h1">AutoWash247</h1>
          <p className="text-body">{t(locale).placeholder.homeBody}</p>
        </div>
      )}
    </>
  )
}

/**
 * Home-page metadata, from the home document when there is one.
 *
 * With a document, this is the same `buildMetadata()` call as any CMS page: the
 * SEO tab is editable, `noindex` follows the untranslated-locale guardrail, and
 * the `<title>` gains the suffix T-09 had to suppress while `/` had no document.
 *
 * Without one it falls back to `SiteSettings` alone — the "blank SEO tab still
 * ships complete tags" path — with the brand name as the title, because
 * appending `| AutoWash247` to `AutoWash247` reads like a bug. Both locales
 * always serve a home page in that case, so both `hreflang` links are honest.
 */
export const homeMetadata = async (locale: Locale): Promise<Metadata> => {
  const found = await loadHome(locale)
  const settings = await loadSiteSettings(locale)

  return found
    ? buildMetadata({ doc: found.doc, locale, paths: found.paths, settings })
    : buildMetadata({
        locale,
        paths: Object.fromEntries(LOCALES.map((candidate) => [candidate, pathForHome(candidate)])),
        settings,
      })
}
