import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * No component renders a user-facing string of its own.
 *
 * T-15A's acceptance criterion is that a *check* proves this rather than a
 * reviewer noticing, and the reason is specific: the closed PR #15 hardcoded
 * Vietnamese throughout its components, which is invisible in review of a large
 * diff and silently breaks the English locale — the `en` page renders Vietnamese
 * and nothing anywhere says so.
 *
 * **The strong signal is Vietnamese-specific characters.** `ă â ê ô ơ ư đ` and
 * the tone marks exist in no class name, no attribute value and no English
 * sentence, so a literal containing one is a hardcoded Vietnamese string with
 * effectively no false positives. That is exactly the regression this guards.
 *
 * **The weaker signal is an English sentence**, caught by looking for several
 * words ending in sentence punctuation. It is heuristic: an English literal that
 * does not look like a sentence — a single word on a button — passes this check.
 * That limit is stated rather than papered over, because a check whose coverage
 * is overstated is worse than one whose coverage is known.
 */

const COMPONENTS = join(process.cwd(), 'src', 'components')

/** Characters that appear in Vietnamese and in essentially nothing else here. */
const VIETNAMESE =
  /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/

/** Three or more words, ending like a sentence. */
const SENTENCE = /^[A-Z][^'"]*\s[^'"]*\s[^'"]*[.!?]$/

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)

    if (statSync(path).isDirectory()) {
      return files(path)
    }

    // Tests are not rendered to anyone, and their fixtures are full of
    // Vietnamese on purpose — `metadata.test.ts` checks a Vietnamese title.
    if (path.endsWith('.test.ts') || path.endsWith('.test.tsx')) {
      return []
    }

    return path.endsWith('.tsx') || path.endsWith('.ts') ? [path] : []
  })

/**
 * Every single- or double-quoted literal in the file, with comments removed
 * first — the explanatory comments in this repo are full of Vietnamese examples
 * and are not rendered to anyone.
 */
const literals = (source: string): string[] => {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')

  return [...code.matchAll(/'([^'\\\n]*)'|"([^"\\\n]*)"/g)]
    .map((match) => match[1] ?? match[2] ?? '')
    .filter((value) => value.length > 0)
}

describe('no user-facing literals in components', () => {
  const offenders = files(COMPONENTS).flatMap((file) =>
    literals(readFileSync(file, 'utf8'))
      .filter((value) => VIETNAMESE.test(value) || SENTENCE.test(value))
      .map((value) => `${file.replace(process.cwd() + '/', '')}: ${value}`),
  )

  it('finds no Vietnamese or sentence-shaped string outside the catalog', () => {
    // Every user-facing string belongs in src/i18n/messages. If this fails, move
    // the string there and read it through `t(locale)`.
    expect(offenders).toEqual([])
  })

  it('actually scans the components, rather than passing on an empty list', () => {
    // A check that silently found no files would pass for ever.
    expect(files(COMPONENTS).length).toBeGreaterThan(4)
  })
})
