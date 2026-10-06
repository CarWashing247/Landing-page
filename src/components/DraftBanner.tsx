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
      /*
       * Tokens rather than the inline hex this shipped with in T-12 (follow-up
       * A6). It is `highlight` on `ink` rather than the amber it used to be,
       * because the palette has no amber and inventing one would be a seventh
       * colour nobody designed — and this is the one surface that should look
       * unlike the site, so the brightest token in the set is the right one.
       *
       * Static rather than fixed: fixed overlapped the header and hid it. In
       * normal flow the banner pushes the page down, which is correct for a
       * standing condition that applies to the whole document.
       */
      className="bg-highlight text-on-highlight text-label flex flex-wrap items-center gap-2 px-4 py-2"
      // `role="status"` rather than `alert`: it is a standing condition, not an
      // interruption, so a screen reader announces it without cutting off.
      role="status"
    >
      <span>{copy.draft.message}</span>
      <form action={`/api/draft/exit?${exit.toString()}`} method="post">
        <button className="cursor-pointer underline" type="submit">
          {copy.draft.exit}
        </button>
      </form>
    </aside>
  )
}
