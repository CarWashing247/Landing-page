import type { Metadata } from 'next'

import { loadBusinessInfo, loadSiteSettings } from '../lib/content'
import { t } from '../i18n/t'
import type { Locale } from '../lib/locales'
import { LOCALES, pathForHome } from '../lib/locales'
import { autoWashSchema } from '../lib/schema/autowash'
import { JsonLd } from './seo/JsonLd'
import { buildMetadata } from './seo/metadata'

/**
 * Placeholder home page, shared by both locales.
 *
 * Real content is T-23 and the blocks that render it are T-17. The locale
 * arrives as a prop from the per-locale folder, so it is a build-time
 * constant and this stays statically prerenderable.
 *
 * Interface strings move to the T-15A catalog; the literals below are the
 * ones that task converts.
 */
export const HomePage = async ({ locale }: { locale: Locale }) => (
  <>
    {/*
      The `AutoWash` business node lives on the home page alone, with a stable
      `@id` that service pages reference as their `provider` — one business
      entity for the whole site rather than a copy of the name and address on
      every page. `autoWashSchema` returns `null` while `BusinessInfo` still
      holds `TODO(data):` placeholders, so nothing is emitted until T-23 fills
      them in, and then it appears without a deploy.
    */}
    <JsonLd
      schema={autoWashSchema({
        business: await loadBusinessInfo(),
        locale,
        settings: await loadSiteSettings(locale),
      })}
    />
    <div>
      <h1>AutoWash247</h1>
      <p>{t(locale).placeholder.homeBody}</p>
    </div>
  </>
)

/**
 * Home-page metadata — fallbacks only, deliberately.
 *
 * **`/` is not CMS-backed yet, and T-09 does not decide that it should be.**
 * T-23 step 1 lists `/` among the documents to create, but nothing in Design.md
 * says which slug the home document carries, and inventing one here would
 * commit two later tasks to it: the `[slug]` route would have to refuse that
 * slug so `/` and `/trang-chu` are not the same page at two URLs, and the
 * sitemap would have to special-case it. So the home route reads
 * `SiteSettings` alone, which is exactly the "blank SEO tab still ships
 * complete tags" path, and T-17 — which builds the home body — wires a document
 * in if that is what it wants.
 *
 * The consequence to know: the home `<title>` is the brand name, with no
 * suffix appended, because appending `| AutoWash247` to `AutoWash247` reads
 * like a bug. Its description is `SiteSettings.defaultDescription`.
 */
export const homeMetadata = async (locale: Locale): Promise<Metadata> =>
  buildMetadata({
    locale,
    // Both locales always serve a home page, so both `hreflang` links are
    // always honest here — unlike a document, which may exist in only one.
    paths: Object.fromEntries(LOCALES.map((candidate) => [candidate, pathForHome(candidate)])),
    settings: await loadSiteSettings(locale),
  })
