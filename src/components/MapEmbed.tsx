/**
 * A lazily loaded Google Maps embed — **built, and deliberately not rendered.**
 *
 * **Read this before wiring it up.** T-19's file and Design.md section 4 both
 * ask the contact page for a lazy map. Both decks say otherwise: the Desktop
 * Pages contact screen (`DAHXNi05PeY`, page 6) shows a heading, a form and three
 * detail cards with no map, and the UI Foundation deck's layout rules state
 * "Map and contact integrations are out of scope for this release". T-19's own
 * file flags that conflict and says to resolve it before building. It was
 * resolved in favour of the decks — **the map is temporarily bypassed in the UI
 * and is planned as a later enhancement** — with this component left ready so
 * turning the map on is one import rather than a fresh piece of work. Nothing imports it
 * today, which is a cost worth naming: it is unexercised code, and the first
 * person to use it should run the LCP measurement in T-19's verification block
 * rather than trusting this comment.
 *
 * What it gets right, and why each one matters:
 *
 *  - **`loading="lazy"`**, so the iframe's own ~700KB of script and tiles are
 *    not fetched until it approaches the viewport. An eager Maps iframe is the
 *    single easiest way to fail Gate 3, which is the reason the task singles it
 *    out.
 *  - **An aspect-ratio box with explicit `width` and `height`**, so the browser
 *    reserves the space before the iframe loads and the map contributes no CLS.
 *    `aspect-[4/3]` plus `absolute inset-0` is what holds the box open; the
 *    attributes are the fallback for the same reason `BlockImage` passes them.
 *  - **A `title`**, because an iframe without one is an unlabelled frame to a
 *    screen reader — it is the frame's accessible name, not decoration.
 *  - **`referrerPolicy`**, so the embed is not handed the full URL of the page
 *    it sits on.
 *
 * **It needs no API key in this form.** The `/maps?q=<lat>,<lng>&output=embed`
 * URL is the keyless embed; Google's documented Embed API
 * (`/maps/embed/v1/place`) does require one, and switching to it means adding
 * that key to `.env.example` in the same commit and flagging it (T-19's own
 * flag). The keyless form is undocumented and could be withdrawn, which is the
 * trade: no credential to manage, no contractual promise it keeps working.
 *
 * The caller passes a `title` rather than this component reading the catalog,
 * so it stays a pure presentational leaf like `BlockImage`.
 */
export const MapEmbed = ({
  lat,
  lng,
  title,
  zoom = 16,
}: {
  lat: number
  lng: number
  /** The iframe's accessible name. From the message catalog, never a literal. */
  title: string
  zoom?: number
}) => (
  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card md:aspect-[16/9]">
    <iframe
      className="absolute inset-0 h-full w-full border-0"
      height={450}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      src={`https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`}
      title={title}
      width={800}
    />
  </div>
)
