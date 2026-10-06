import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

/**
 * The type specimen, for the one acceptance criterion that is a visual check.
 *
 * T-15 requires that Vietnamese diacritics render correctly at every weight —
 * including the stacked tone-plus-vowel marks, where a font with partial
 * coverage substitutes a fallback glyph or lets the marks collide. That cannot
 * be verified by reading HTML, so this page exists to be looked at.
 *
 * **Kept rather than deleted, which is the option T-15 step 5 offers.** The
 * agent that built this has no browser, so the check has to be done by a person;
 * deleting the page would mean deleting the only thing that makes that cheap.
 * It is development-only and `noindex`, so it costs a 404 in production.
 *
 * The Vietnamese on this page is taken from the Canva UI Foundation deck, which
 * is designer-written copy rather than anything machine-translated (CLAUDE.md).
 * It is a developer tool, not interface copy, so it is not part of T-15A's
 * catalog.
 */

export const metadata: Metadata = {
  // Belt and braces with the 404 below: if this ever ships, it must not index.
  robots: { follow: false, index: false },
  title: 'Type specimen',
}

/** Every weight the deck uses, with the name it uses for it. */
const WEIGHTS = [
  { label: 'Regular 400', value: 400 },
  { label: 'Medium 500', value: 500 },
  { label: 'Semi Bold 600', value: 600 },
  { label: 'Bold 700', value: 700 },
] as const

/** The six roles from page 3 of the deck, with the deck's own examples. */
const ROLES = [
  { cls: 'text-display', sample: 'Rửa xe tự động 24/7, mọi lúc.', spec: '64px / 120% / Bold', role: 'Display' },
  { cls: 'text-h1', sample: 'Sạch nhanh. An tâm lái.', spec: '44px / 120% / Bold', role: 'H1' },
  { cls: 'text-h2', sample: 'Công nghệ tiên tiến', spec: '28px / 130% / Semi Bold', role: 'H2' },
  { cls: 'text-h3', sample: 'Gói rửa phù hợp cho bạn', spec: '20px / 140% / Semi Bold', role: 'H3' },
  {
    cls: 'text-body',
    sample:
      'Công nghệ cảm biến thông minh, hoạt động 24/7, mang lại trải nghiệm rửa xe nhanh, sạch và an toàn.',
    spec: '16px / 160% / Regular',
    role: 'Body',
  },
  { cls: 'text-label', sample: 'ĐANG HOẠT ĐỘNG 24/7', spec: '14px / 150% / Medium', role: 'Label' },
] as const

/**
 * The marks that break a font with partial coverage: a tone mark stacked on a
 * vowel that already carries one, plus the đ/Đ the Latin subset does not have.
 */
const STACKED = 'ờ ẵ ụ ệ Đ ữ ạ ỉ ỡ ế ộ ự ằ ẳ ẫ ấ ầ ẩ ẽ ó ò ỏ õ ọ ơ ư đ'

const SWATCHES = [
  { bg: 'bg-ink', fg: 'text-on-ink', hex: '#0F172A', name: 'Ink' },
  { bg: 'bg-slate', fg: 'text-on-slate', hex: '#1E293B', name: 'Slate' },
  { bg: 'bg-action', fg: 'text-on-action', hex: '#C62929', name: 'Action' },
  { bg: 'bg-paper', fg: 'text-ink', hex: '#F8FAFC', name: 'Paper' },
  { bg: 'bg-surface', fg: 'text-ink', hex: '#FFFFFF', name: 'Surface' },
  { bg: 'bg-mist', fg: 'text-ink', hex: '#E9EDF1', name: 'Mist' },
  { bg: 'bg-success', fg: 'text-on-success', hex: '#116B52', name: 'Success' },
  { bg: 'bg-notice', fg: 'text-on-notice', hex: '#FFF4DA', name: 'Notice' },
] as const

const RADII = [
  { cls: 'rounded-sm', label: '6px · sm' },
  { cls: 'rounded-md', label: '10px · md' },
  { cls: 'rounded-control', label: '12px · control — buttons, inputs' },
  { cls: 'rounded-card', label: '20px · card — cards, media panels' },
  { cls: 'rounded-full', label: 'pill' },
] as const

const Specimen = () => {
  // Development only. In production this route is a 404.
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1>Type specimen</h1>
      <p className="text-label">
        Inter · subsets latin + vietnamese · display swap. Tokens from architecture/phase3-uiux-promax.md.
      </p>

      <h2 className="mt-8">Roles</h2>
      {ROLES.map((role) => (
        <section className="mt-6" key={role.role}>
          <p className="text-label text-action">
            {role.role} — {role.spec}
          </p>
          <p className={role.cls}>{role.sample}</p>
        </section>
      ))}

      <h2 className="mt-12">Stacked diacritics at every weight</h2>
      <p className="text-label">
        Each line is the same string. Look for a mark that collides with the letter below it, a
        tone mark that has drifted off centre, or a glyph in a different typeface.
      </p>
      {WEIGHTS.map((weight) => (
        <section className="mt-4" key={weight.value}>
          <p className="text-label text-action">{weight.label}</p>
          <p className="text-h3" style={{ fontWeight: weight.value }}>
            {STACKED}
          </p>
          <p className="text-body" style={{ fontWeight: weight.value }}>
            {STACKED}
          </p>
        </section>
      ))}

      <h2 className="mt-12">Colour pairs</h2>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {SWATCHES.map((swatch) => (
          <div className={`${swatch.bg} ${swatch.fg} rounded-control p-6`} key={swatch.name}>
            <p className="text-h3">{swatch.name}</p>
            <p className="text-label">{swatch.hex}</p>
            <p className="text-body">Rửa xe tự động — text on this colour</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12">Radii</h2>
      <div className="mt-4 flex flex-wrap gap-4">
        {RADII.map((radius) => (
          <div
            className={`${radius.cls} bg-primary text-on-primary text-label p-6`}
            key={radius.cls}
          >
            {radius.label}
          </div>
        ))}
      </div>
    </main>
  )
}

export default Specimen
