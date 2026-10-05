import type { CollectionBeforeChangeHook, Field } from 'payload'

/**
 * `lastModified` that means "this locale changed", not "the row changed".
 *
 * **Why a stored field rather than `updatedAt`.** `updatedAt` is not localized —
 * one row, one timestamp — so publishing an English edit moved the *Vietnamese*
 * sitemap entry's `lastmod` too. Both URLs then claim to have changed when one
 * of them did not, and a sitemap that overstates `lastmod` is worse than one
 * that omits it: Google's sitemaps documentation is explicit that it ignores the
 * field on a site where it has learned the value is unreliable. The cost is not
 * this one entry, it is the credibility of every other entry in the file.
 *
 * Payload has no localized equivalent to offer, so this adds one: a localized
 * date stamped on write. Because the field is `localized: true`, a write in one
 * locale touches that locale's column and leaves the other's standing, which is
 * exactly the distinction `updatedAt` cannot make.
 *
 * **It lives on the same row as `updatedAt`**, and that is the safety argument
 * rather than an implementation detail: whatever Payload's draft and version
 * machinery does to decide which row the public read path sees, this stamp
 * travels with it. So it can be no less accurate than the `updatedAt` it
 * replaces — it can only be more specific.
 *
 * Deriving the same answer from version history was the alternative and is a
 * trap: it means diffing successive versions per locale to find the last one
 * that touched this locale's fields, on every sitemap request, to compute a
 * value an editor can simply be stamped with.
 */

export const LOCALE_UPDATED_AT = 'localeUpdatedAt'

/**
 * Hidden rather than read-only in the sidebar, deliberately.
 *
 * Shown, it would need a Vietnamese label and a description explaining how it
 * differs from the `updatedAt` column an editor already sees two rows above it —
 * Vietnamese copy that CLAUDE.md forbids machine-translating and that nothing in
 * Design.md asks for. `admin.hidden` keeps it out of the form while leaving it in
 * the API and the generated types, which is all this needs.
 */
export const localeUpdatedAtField: Field = {
  name: LOCALE_UPDATED_AT,
  type: 'date',
  localized: true,
  admin: { hidden: true },
}

/**
 * Stamp the locale being written.
 *
 * Skipped for `locale: 'all'`, where there is no single locale to stamp:
 * Payload expects a localized value to arrive as a per-locale map on such a
 * write, so a single timestamp would either be rejected or be written to one
 * arbitrary locale. A document only ever reached through `all` writes keeps an
 * empty stamp and falls back to `updatedAt`, which is the behaviour this
 * replaces — the absence degrades, it does not break.
 *
 * Every write is stamped, including one that changed nothing. That matches
 * `updatedAt` exactly: pressing Save with no edits already moves it today, so
 * this is not a new inaccuracy, and comparing incoming against stored data to
 * detect a no-op write would be a second, subtler copy of the comparison
 * `forceNoindexWhenUntranslated` needed a stored read to get right.
 */
export const stampLocaleUpdatedAt =
  (): CollectionBeforeChangeHook =>
  ({ data, req }) => {
    const { locale } = req

    if (!locale || locale === 'all') {
      return data
    }

    return { ...data, [LOCALE_UPDATED_AT]: new Date().toISOString() }
  }
