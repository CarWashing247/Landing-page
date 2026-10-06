import { siteOrigin } from '../env'
import type { Locale } from '../locales'

/**
 * What every schema builder shares: the context, the node ids, and the two
 * guards that decide whether a value is fit to publish.
 *
 * The builders are pure functions over `payload-types.ts` and live apart from
 * the components that render them for one reason: structured data is the part of
 * this site that is read only by machines, so a mistake in it is invisible on
 * the page. Nothing in a rendered screenshot shows that `telephone` went out
 * wrong. Unit tests are the only place that can be caught cheaply.
 */

export const SCHEMA_CONTEXT = 'https://schema.org'

/** `InStock`, spelled as the enumeration URL Google's Offer documentation uses. */
export const IN_STOCK = 'https://schema.org/InStock'

/**
 * The business is **one** node across the whole site, so its `@id` is one
 * string.
 *
 * This is what lets a service page say "the provider is that business" by
 * reference rather than restating the name and address — and a second copy of a
 * name and address is a second thing to drift out of step with Google Business
 * Profile. It is deliberately locale-independent: there is one car wash, not a
 * Vietnamese one and an English one.
 */
export const businessId = (): string => `${siteOrigin()}/#business`

/**
 * An absolute URL for a local path, spelled the way the canonical tag spells it.
 *
 * **The home page is why this exists.** `pathForHome('vi')` is `/`, so the
 * obvious concatenation yields `https://site/` while `buildMetadata()` emits
 * `https://site` as the canonical — Next normalises the root path away. Measured
 * against the built server before this helper existed: the schema said
 * `http://localhost:3000/` and the canonical said `http://localhost:3000`.
 *
 * To Google those are two URLs. The `url` of a node that disagrees with the
 * page's own canonical undercuts the one claim the node is making about which
 * page it describes, and `Service.provider` resolves the business by this exact
 * string.
 */
export const absoluteUrl = (path: string): string =>
  `${siteOrigin()}${path === '/' ? '' : path}`

/** A document's own node id, derived from its public path so it is stable. */
export const nodeId = (path: string, fragment: string): string =>
  `${absoluteUrl(path)}#${fragment}`

/**
 * BCP-47 for the rendered locale, matching what `hreflang` already declares.
 *
 * **Only valid on `FAQPage`, and that is a correction to AGENT.md 5.4.** The rule
 * says every emitted schema carries `inLanguage`; schema.org's own vocabulary says
 * `inLanguage` has domain `CreativeWork`, `Event`, `BroadcastService`,
 * `CommunicateAction`, `LinkRole`, `PronounceableText` and `WriteAction`.
 * `FAQPage` is a `WebPage`, hence a `CreativeWork`, so it qualifies. `AutoWash` is
 * a `Place`/`Organization` and `Service` is a `Thing` — on those the property does
 * not exist, which is a validation error rather than a harmless extra.
 *
 * Checked against the published vocabulary rather than reasoned about: the only
 * language property valid on `AutoWash` is `knowsLanguage`, and on `Service`
 * there is none at all. `knowsLanguage` is deliberately *not* used, because it
 * asserts which languages the business can serve customers in — a fact about the
 * business that nothing in the CMS states, and one that does not follow from an
 * English page existing.
 *
 * Nothing is lost by the omission: the page's language is already declared by
 * `<html lang>`, by the reciprocal `hreflang` set and by `og:locale`, all from
 * T-09.
 */
export const inLanguage = (locale: Locale): Locale => locale

/**
 * Is this value one of the repo's own `TODO(data):` placeholders?
 *
 * CLAUDE.md requires unknown business data to be written as `TODO(data): …`
 * rather than invented, and `BusinessInfo` currently holds exactly that for the
 * name, the address and the phone number (T-23 fills them). So this is reading
 * a convention the repo already enforces, not guessing at one.
 *
 * It matters because of what the alternative publishes. AGENT.md 5.4 requires
 * the name, address and phone in JSON-LD to be byte-identical to Google Business
 * Profile; `TODO(data): phone number` is guaranteed not to be, and a mismatched
 * name-address-phone is the one structured-data error that actively costs local
 * ranking rather than merely failing to help. Emitting nothing is recoverable.
 * Emitting a contradiction of the Business Profile is not.
 */
export const isPlaceholder = (value: unknown): boolean =>
  typeof value === 'string' && value.trimStart().startsWith('TODO(data):')

/** A string fit to publish: present, not blank, not a placeholder. */
export const publishable = (value: null | string | undefined): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 && !isPlaceholder(value)
    ? value
    : undefined

/**
 * Drop everything a crawler should not see, recursively.
 *
 * `JSON.stringify` already drops `undefined`, but not `null`, `''`, or the empty
 * objects and arrays those leave behind — and `"telephone": null` is worse than
 * no `telephone` at all, because it is a claim rather than a silence. Payload
 * returns `null` for every unfilled optional field, so without this every
 * builder would need a conditional spread per property and would eventually
 * forget one.
 *
 * `false` and `0` are kept. A price of `0` is a real price, and dropping it
 * because it is falsy is the classic version of this bug.
 */
export const prune = <T>(value: T): T => {
  if (Array.isArray(value)) {
    const items = value.map(prune).filter((item) => item !== undefined)

    return (items.length > 0 ? items : undefined) as T
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, prune(item)] as const)
      .filter(([, item]) => item !== undefined)

    return (entries.length > 0 ? Object.fromEntries(entries) : undefined) as T
  }

  if (value === null || value === '') {
    return undefined as T
  }

  return value
}
