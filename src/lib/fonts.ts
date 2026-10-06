import { Inter } from 'next/font/google'

/**
 * Inter, the one typeface this site loads.
 *
 * Named by the Canva UI Foundation deck ("AutoWash247 UI Foundation", page 3),
 * which states that Inter covers Vietnamese diacritics at every weight and shows
 * the full diacritic set rendered. That is the property the whole choice turns
 * on: Vietnamese stacks a tone mark on top of a vowel that may already carry one
 * (ế, ộ, ữ), and a font that merely has the Latin letters renders those as a
 * fallback glyph or a collision. AGENT.md 5.5 requires the `vietnamese` subset
 * for the same reason.
 *
 * **Loaded as a variable font**, so no `weight` array: Inter ships one file
 * covering 100–900, and the deck uses four of them (400 Regular, 500 Medium,
 * 600 Semi Bold, 700 Bold). Listing static weights instead would fetch four
 * files to cover what one already does.
 *
 * **`display: 'swap'`** is required by AGENT.md 5.5. On its own it is the
 * setting that *causes* layout shift — text paints in the fallback and then
 * reflows — which is why the second half matters: `next/font/google` computes
 * fallback metrics from the real font and emits an `@font-face` with
 * `size-adjust`, `ascent-override` and `descent-override` so the fallback
 * occupies the same space. That is on by default (`adjustFontFallback`) and is
 * left on deliberately; turning it off is what reintroduces the shift.
 *
 * `next/font` self-hosts the files from this origin. A `fonts.googleapis.com`
 * request in the rendered HTML means something was wired up as a plain
 * stylesheet link instead, and both the privacy and the no-shift guarantees are
 * gone — the task's verification greps for exactly that.
 */
export const inter = Inter({
  display: 'swap',
  /**
   * `vietnamese` is the point; `latin` is needed too, because the Vietnamese
   * subset carries only the codepoints unique to it and the unaccented letters
   * live in `latin`. Requesting `vietnamese` alone leaves ordinary words
   * unrenderable.
   */
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
})
