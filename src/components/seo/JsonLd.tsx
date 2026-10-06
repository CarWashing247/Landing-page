/**
 * The only place this site writes a `<script type="application/ld+json">`.
 *
 * **Why `dangerouslySetInnerHTML` is the correct tool here, not a shortcut.**
 * React escapes the text children of any element, `<script>` included, so
 * `<script>{JSON.stringify(data)}</script>` ships `&quot;` in place of every
 * quote and produces JSON no parser accepts. There is no non-dangerous way to
 * put raw text inside a script tag, which is why every structured-data guide for
 * React reaches for this — the care goes into the serialiser below instead.
 *
 * **What the escaping actually prevents.** The string is injected into HTML, so
 * a `<` from CMS data can end the script element early: a business name
 * containing a closing script tag would otherwise close this one and open a real
 * one, which is stored XSS with the CMS as the vector. Escaping it as a
 * `\uXXXX` sequence keeps it a JSON string: that form is valid JSON and parses
 * back to the same character, so nothing is lost. `>` and `&` go the same way, to
 * foreclose `]]>` and entity tricks.
 *
 * U+2028 and U+2029 are escaped as well: they are legal inside a JSON string but
 * are line terminators to a JavaScript parser, so an unescaped one breaks any
 * consumer that reads this block as script rather than as data.
 *
 * **Both are written as escape sequences rather than as the characters
 * themselves, and that is not stylistic.** A literal U+2028 pasted into the regex
 * below terminates the regex literal, so the file stops compiling — and the cause
 * is an invisible character, which is a long debugging session for a one-line
 * file. Keep them as `\uXXXX` text.
 */

const ESCAPES: Record<string, string> = {
  '&': '\\u0026',
  '<': '\\u003c',
  '>': '\\u003e',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
}

/** One pass, so a replacement can never be re-escaped by a later one. */
export const serialiseJsonLd = (data: unknown): string =>
  JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (character) => ESCAPES[character]!)

export const JsonLd = ({ schema }: { schema: Record<string, unknown> | null }) => {
  if (!schema) {
    return null
  }

  return (
    <script
      dangerouslySetInnerHTML={{ __html: serialiseJsonLd(schema) }}
      type="application/ld+json"
    />
  )
}
