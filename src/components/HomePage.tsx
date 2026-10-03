import type { Locale } from '../lib/locales'

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
export const HomePage = ({ locale }: { locale: Locale }) => (
  <main>
    <h1>AutoWash247</h1>
    <p>
      {locale === 'vi'
        ? 'TODO(copy): nội dung trang chủ — xem T-17 (blocks) và T-23 (seed).'
        : 'TODO(copy): home page content — see T-17 (blocks) and T-23 (seed).'}
    </p>
  </main>
)
