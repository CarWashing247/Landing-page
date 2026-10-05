import { draftMode } from 'next/headers'

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
 * The strings are `TODO(copy)`: T-15A owns the interface catalog and lists the
 * draft banner among the keys it converts. They are deliberately not
 * machine-translated in the meantime (CLAUDE.md).
 */
export const DraftBanner = async ({ locale, path }: { locale: Locale; path?: string }) => {
  const { isEnabled } = await draftMode()

  if (!isEnabled) {
    return null
  }

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
      <span>
        {locale === 'vi'
          ? 'TODO(copy): bạn đang xem bản nháp — nội dung này chưa được xuất bản.'
          : 'TODO(copy): you are viewing a draft — this content is not published.'}
      </span>{' '}
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
          {locale === 'vi' ? 'TODO(copy): thoát xem thử' : 'TODO(copy): exit preview'}
        </button>
      </form>
    </aside>
  )
}
