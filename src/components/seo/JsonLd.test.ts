import { describe, expect, it } from 'vitest'

import { serialiseJsonLd } from './JsonLd'

/**
 * The serialiser is the security-relevant half of `JsonLd.tsx`: its output goes
 * into the page as raw HTML, so a `<` that survives can end the script element
 * and start a real one. The component's rendering is React's job; this is the
 * part worth pinning down.
 */

describe('serialiseJsonLd', () => {
  it('escapes a closing script tag so it cannot break out of the element', () => {
    // The attack: a business name saved in the CMS that closes this script tag
    // and opens an executable one. Stored XSS with the CMS as the vector.
    const name = '</scr' + 'ipt><scr' + 'ipt>alert(1)</scr' + 'ipt>'
    const output = serialiseJsonLd({ name })

    expect(output).not.toContain('</scr' + 'ipt>')
    expect(output).not.toContain('<')
  })

  it('escapes it to a form that parses back to the original string', () => {
    // Nothing is lost: \uXXXX is valid JSON for the same character, so the
    // escaping is not a mangling.
    const name = 'Wash <&> Go'

    expect(JSON.parse(serialiseJsonLd({ name })).name).toBe(name)
  })

  it('escapes > and & as well', () => {
    const output = serialiseJsonLd({ a: '>', b: '&' })

    expect(output).not.toContain('>')
    expect(output).not.toContain('&')
  })

  it('escapes U+2028 and U+2029, which are legal JSON but break a JS parser', () => {
    const output = serialiseJsonLd({ a: String.fromCharCode(0x2028) + String.fromCharCode(0x2029) })

    expect(output).toContain('\\u2028')
    expect(output).toContain('\\u2029')
    expect(JSON.parse(output).a).toBe(String.fromCharCode(0x2028) + String.fromCharCode(0x2029))
  })

  it('does not double-escape its own replacements', () => {
    // One pass: escaping `<` introduces a backslash, and a second pass over `&`
    // would have to leave that alone. Verified by round-tripping.
    const value = '<&>'

    expect(JSON.parse(serialiseJsonLd({ value })).value).toBe(value)
  })
})
