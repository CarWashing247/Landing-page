import { draftMode } from 'next/headers'

import { t } from '../i18n/t'
import type { Locale } from '../lib/locales'

/**
 * "You are looking at a draft", with a way out.
 *
 * A Server Component with a plain HTML form — no `'use client'`, no JavaScript.
 * The exit is a `POST` because it changes state, and a form is the only way to
 * make a `POST` without script. That matters beyond tidiness here: this banner
 * renders on every preview page, and a client component in the root layout
 * would ship its bundle to every *published* page too, where draft mode is off
 * and the banner renders nothing.
 *
 * Rendering `null` when draft mode is off is what keeps it out of the published
 * HTML entirely.
 *
 * The strings come from the T-15A catalog. The Vietnamese is still `TODO(copy)`
 * there — no deck shows an editor-facing preview state, so nobody has written
 * it — but the literals are out of this component, which is what T-15A owns.
 */
export const DraftBanner = async ({ locale, path }: { locale: Locale; path?: string }) => {
  const { isEnabled } = await draftMode()

  if (!isEnabled) {
    return null
  }

  const copy = t(locale)
  const exit = new URLSearchParams({ locale })

  if (path) {
    exit.set('to', path)
  }

  return (
    <aside
      // `role="status"` rather than `alert`: it is a standing condition, not an
      // interruption, so a screen reader announces it without cutting off.
      role="status"
      style={{
        background: '#b45309',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        inset: '0 0 auto 0',
        padding: '8px 16px',
        position: 'fixed',
        zIndex: 9999,
      }}
    >
      <span>{copy.draft.message}</span>{' '}
      <form action={`/api/draft/exit?${exit.toString()}`} method="post" style={{ display: 'inline' }}>
        <button
          style={{
            background: 'none',
            border: 0,
            color: 'inherit',
            cursor: 'pointer',
            font: 'inherit',
            padding: 0,
            textDecoration: 'underline',
          }}
          type="submit"
        >
          {copy.draft.exit}
        </button>
      </form>
    </aside>
  )
}
