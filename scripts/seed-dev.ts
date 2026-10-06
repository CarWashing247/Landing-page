/**
 * Development seed — **not** the content seed. T-23 owns that.
 *
 * This exists because T-19A could not be verified without it. Six of the design
 * deck's ten screens (the editor, the block builder, the SEO workspace, the
 * media library, the globals and version history) render nothing against an
 * empty database, so there was no way to compare them against the design. It
 * fills the local Postgres with enough to make every admin screen and every
 * public route show something real.
 *
 * Run it with `npx payload run ./scripts/seed-dev.ts`. It is idempotent: it
 * matches documents by slug and updates rather than duplicating.
 *
 * **Where the copy comes from.** Every Vietnamese string below is taken
 * verbatim from the Canva decks — "AutoWash247 Desktop Pages" (`DAHXNi05PeY`)
 * for the page content and "AutoWash247 CMS Admin UI" (`DAHXOjaoczk`) for the
 * service names. Nothing here is written or translated. Where a deck shows a
 * field but gives no words for it — FAQ answers, all English copy — the value
 * is a `TODO(copy)` marker, which is also what the Desktop Pages deck itself
 * puts on its English screens.
 *
 * **What is NOT real, and is marked so loudly.**
 *
 *  - `BusinessInfo` keeps its `TODO(data):` placeholders for the legal name,
 *    the address and the phone number. The decks show sample values — the admin
 *    deck's address is in Ho Chi Minh City, and this business is in Hanoi — and
 *    AGENT.md 5.4 requires these to be byte-identical to Google Business
 *    Profile. A plausible-looking invented address reaches JSON-LD and then
 *    Google, which is the specific failure CLAUDE.md names. Coordinates and
 *    opening hours are seeded because a map pin and a 7-row table are
 *    structural, and both are obvious placeholders.
 *  - **Prices are placeholders apart from one.** The admin deck gives exactly
 *    one real figure, 150 000 ₫ for `Rửa xe cơ bản`. Every other price here is
 *    invented structure, not a business decision, and is flagged in the report.
 *    They must not survive into T-23.
 */
import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '../src/payload.config'

const payload = await getPayload({ config })

/**
 * Payload's validation errors arrive as a nested `data.errors` array that
 * `console.log` prints as `[Object]`, which says nothing. A seed that fails
 * silently is worse than one that does not run, so unwrap it.
 */
process.on('unhandledRejection', (error: unknown) => {
  const data = (error as { data?: { errors?: unknown } })?.data
  console.error('SEED FAILED:', (error as Error)?.message)
  console.error(JSON.stringify(data?.errors ?? error, null, 2))
  process.exit(1)
})

/** `as const`, so each day is its own literal and matches the field's union. */
const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

/** A plain branded rectangle, so `Media` has something real to make sizes from. */
const image = async (label: string, w = 1920, h = 1080): Promise<Buffer> =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
         <rect width="${w}" height="${h}" fill="#0b1f33"/>
         <circle cx="${w * 0.78}" cy="${h * 0.3}" r="${h * 0.28}" fill="#29c8b5" opacity="0.18"/>
         <text x="50%" y="50%" fill="#29c8b5" font-family="sans-serif" font-size="${h / 14}"
               font-weight="700" text-anchor="middle">${label}</text>
         <text x="50%" y="60%" fill="#f3f6f8" font-family="sans-serif" font-size="${h / 32}"
               text-anchor="middle">PLACEHOLDER — seed-dev.ts</text>
       </svg>`,
    ),
  )
    .jpeg({ quality: 82 })
    .toBuffer()

const upsertMedia = async (label: string, altVi: string, altEn: string) => {
  const filename = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`
  const existing = await payload.find({
    collection: 'media',
    locale: 'vi',
    where: { filename: { equals: filename } },
  })

  if (existing.docs[0]) {
    return existing.docs[0]
  }

  const created = await payload.create({
    collection: 'media',
    data: { alt: altVi },
    file: { data: await image(label), mimetype: 'image/jpeg', name: filename, size: 0 },
    locale: 'vi',
  })

  await payload.update({
    collection: 'media',
    data: { alt: altEn },
    id: created.id,
    locale: 'en',
  })

  return created
}

/**
 * Write both locales while the document is still a draft, and publish last.
 *
 * **Order matters, and getting it wrong looks like a bug in the seed.** T-06's
 * slug field refuses a slug change on a *published* document — a 400 with
 * `publishedSlugCannotChange` — and a locale that has no slug yet counts as a
 * change, not as a first write. Creating a page published in Vietnamese and
 * then giving it an English slug therefore fails, which is the guardrail
 * working exactly as designed: the whole point is that an indexed URL cannot
 * move. So both locales are filled in as a draft, and `_status` is flipped once
 * at the end.
 *
 * A document that is already published from an earlier partial run cannot be
 * fixed in place for the same reason, so it is deleted and rebuilt.
 */
const upsert = async <T extends 'pages' | 'services'>(
  collection: T,
  slug: string,
  vi: Record<string, unknown>,
  en?: Record<string, unknown>,
) => {
  const existing = await payload.find({
    collection,
    locale: 'vi',
    where: { slug: { equals: slug } },
  })

  const previous = existing.docs[0]

  if (previous && (previous as { _status?: string })._status === 'published') {
    await payload.delete({ collection, id: previous.id })
  }

  /*
   * `data` is cast at these three call sites, and only here. Payload types a
   * write's payload against the generic collection slug, and this helper is
   * deliberately generic over two collections whose fields differ — so the
   * compiler cannot know that `vi` is a valid `Page` *or* a valid `Service`
   * without the caller proving it. The seed's own data literals are what prove
   * it, and Payload validates every field at runtime anyway: the failures this
   * script actually hit (a published slug, a draft in a relationship) were
   * caught there, not by the compiler. Likewise `update` returns a union with
   * `BulkOperationResult` because the overload is chosen by the presence of
   * `id`, which TypeScript cannot narrow through a variable.
   */
  type Written = { id: number | string }
  const write = (data: Record<string, unknown>, locale: 'en' | 'vi', id?: number | string) =>
    id === undefined
      ? (payload.create({ collection, data: data as never, locale }) as Promise<Written>)
      : (payload.update({ collection, data: data as never, id, locale }) as Promise<Written>)

  const stillThere = previous && (previous as { _status?: string })._status !== 'published'

  const doc = await write({ ...vi, _status: 'draft' }, 'vi', stillThere ? previous.id : undefined)

  if (en) {
    await write({ ...en, _status: 'draft' }, 'en', doc.id)
  }

  // Only now, and only if this document is meant to be live.
  if (vi._status === 'published') {
    await write({ _status: 'published' }, 'vi', doc.id)
  }

  return doc
}

// ---------------------------------------------------------------- media

const heroImage = await upsertMedia(
  'AutoWash247',
  'Trạm rửa xe tự động AutoWash247',
  'TODO(copy): alt text for the AutoWash247 wash station',
)
const serviceImage = await upsertMedia(
  'Dich vu',
  'Xe đang được rửa tại trạm AutoWash247',
  'TODO(copy): alt text for a car being washed',
)

// ---------------------------------------------------------------- globals

await payload.updateGlobal({
  slug: 'business-info',
  data: {
    // Hoan Kiem lake: a landmark, deliberately not a claim about where the
    // business is. Replaced with the real coordinates in T-23.
    lat: 21.028511,
    lng: 105.804817,
    openingHours: WEEKDAYS.map((day) => ({ closed: false, closes: '21:00', day, opens: '07:30' })),
  },
})

await payload.updateGlobal({
  data: { brandName: 'AutoWash247' },
  slug: 'site-settings',
})

// ---------------------------------------------------------------- services

/**
 * Names and the one real price from the admin deck (`DAHXOjaoczk`, page 7).
 * `includes` is the service-detail list from the Desktop Pages deck, page 5.
 */
const INCLUDES = [
  'Rửa thân vỏ xe, mâm và hốc bánh',
  'Vệ sinh kính, gương và đèn',
  'Hút bụi nội thất và vệ sinh bề mặt cơ bản',
  'Khử mùi khoang xe',
  'Lau khô và kiểm tra hoàn thiện',
]

const SERVICES = [
  { duration: 30, en: 'Basic Car Wash', name: 'Rửa xe cơ bản', price: 150_000, slug: 'rua-xe-co-ban' },
  { duration: 45, en: 'Advanced Car Wash', name: 'Rửa xe nâng cao', price: 250_000, slug: 'rua-xe-nang-cao' },
  { duration: 60, en: 'Interior Cleaning', name: 'Vệ sinh nội thất', price: 350_000, slug: 've-sinh-noi-that' },
  { duration: 90, en: 'Paint Polishing', name: 'Đánh bóng sơn', price: 650_000, slug: 'danh-bong-son' },
  { duration: 180, en: 'Ceramic Coating', name: 'Phủ ceramic', price: 2_500_000, slug: 'phu-ceramic' },
]

const serviceIds: (number | string)[] = []

for (const service of SERVICES) {
  const doc = await upsert(
    'services',
    service.slug,
    {
      _status: 'published',
      currency: 'VND',
      durationMinutes: service.duration,
      image: serviceImage.id,
      includes: INCLUDES.map((item) => ({ item })),
      name: service.name,
      price: service.price,
      slug: service.slug,
    },
    {
      // The Desktop Pages deck marks its own English screens `TODO(copy)`; the
      // names are the admin deck's, the prose is not written anywhere.
      name: service.en,
      slug: service.en.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    },
  )

  serviceIds.push(doc.id)
}

/*
 * Only the services this script published, never everything in the collection.
 * The Pricing block's relationship carries `filterOptions: _status equals
 * published`, so a draft in the list fails validation with "Block 2 (Pricing) >
 * Services" and nothing explains which row — and a local database can hold
 * drafts from any earlier piece of work. Referencing what this run produced
 * makes the seed independent of whatever else is in there.
 */

// ---------------------------------------------------------------- pages

/** The three questions the deck asks. It gives no answers, so neither does this. */
const FAQ = [
  { answer: 'TODO(copy): how long a wash takes', question: 'Rửa xe mất bao lâu?' },
  { answer: 'TODO(copy): which payment methods are accepted', question: 'Tôi có thể thanh toán bằng cách nào?' },
  { answer: 'TODO(copy): whether an order can be cancelled', question: 'Tôi có thể hủy đơn hàng không?' },
]

const STEPS = [
  { body: 'Quét mã tại trạm rửa xe.', title: 'Quét mã QR' },
  { body: 'Chọn gói phù hợp và thanh toán an toàn.', title: 'Chọn gói & thanh toán' },
  { body: 'Xe được rửa và bạn nhận xác nhận hoàn tất.', title: 'Rửa xe & xác nhận' },
]

const CTA = {
  blockType: 'cta' as const,
  body: 'Rửa xe nhanh chóng, minh bạch và tiện lợi cùng AutoWash247.',
  heading: 'Sẵn sàng trải nghiệm ngay hôm nay',
}

await upsert(
  'pages',
  'home',
  {
    _status: 'published',
    layout: [
      {
        blockType: 'hero',
        heading: 'Trải nghiệm rửa xe nhanh chóng và minh bạch',
        image: heroImage.id,
        subheading: 'Quét mã, chọn gói, thanh toán và rửa xe ngay.',
      },
      { blockType: 'steps', heading: '3 bước rửa xe', steps: STEPS },
      { blockType: 'pricing', heading: 'Bảng giá phổ biến', services: serviceIds.slice(0, 3) },
      { blockType: 'faq', heading: 'Câu hỏi thường gặp', items: FAQ },
      CTA,
    ],
    slug: 'home',
    title: 'Trang chủ',
  },
  { slug: 'home', title: 'TODO(copy): English home page title' },
)

await upsert(
  'pages',
  'bang-gia',
  {
    _status: 'published',
    layout: [
      {
        blockType: 'hero',
        heading: 'Bảng giá minh bạch, lựa chọn phù hợp',
        image: heroImage.id,
        subheading:
          'So sánh các gói rửa xe và chọn dịch vụ phù hợp với nhu cầu của bạn. ' +
          'Giá luôn rõ ràng, không phí ẩn.',
      },
      { blockType: 'pricing', heading: 'Bảng giá phổ biến', services: serviceIds },
      { blockType: 'faq', heading: 'Câu hỏi thường gặp', items: FAQ },
      CTA,
    ],
    slug: 'bang-gia',
    title: 'Bảng giá',
  },
  { slug: 'pricing', title: 'TODO(copy): English pricing page title' },
)

await upsert(
  'pages',
  'huong-dan',
  {
    _status: 'published',
    layout: [
      {
        blockType: 'hero',
        heading: 'Quét mã, rửa xe nhanh gọn',
        image: heroImage.id,
        subheading: 'Ba bước đơn giản để bắt đầu ngay.',
      },
      { blockType: 'steps', heading: '3 bước rửa xe', steps: STEPS },
      { blockType: 'faq', heading: 'Câu hỏi thường gặp', items: FAQ },
      CTA,
    ],
    slug: 'huong-dan',
    title: 'Hướng dẫn',
  },
  { slug: 'how-it-works', title: 'TODO(copy): English how-it-works page title' },
)

await upsert(
  'pages',
  'lien-he',
  {
    _status: 'published',
    layout: [
      {
        blockType: 'contact',
        body: 'Gửi yêu cầu hoặc gọi trực tiếp để được tư vấn về dịch vụ rửa xe nhanh chóng và minh bạch.',
        heading: 'Chúng tôi luôn sẵn sàng hỗ trợ bạn',
      },
    ],
    slug: 'lien-he',
    title: 'Liên hệ',
  },
  { slug: 'contact', title: 'TODO(copy): English contact page title' },
)

// A draft, so the admin's Draft badge and version history have something to
// show — deck pages 3 and 10 both depend on one existing.
await upsert('pages', 'gioi-thieu', {
  _status: 'draft',
  layout: [CTA],
  slug: 'gioi-thieu',
  title: 'Giới thiệu',
})

console.log(`SEEDED: ${SERVICES.length} services, 5 pages, 2 images`)

process.exit(0)
