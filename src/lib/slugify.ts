/**
 * Title → URL slug, for Vietnamese as well as English.
 *
 * Slugs are localized (Design.md 1.1a): `bang-gia` and `pricing` are separate
 * documents' worth of keyword value, and section 3 lists the slug as one of the
 * five placements that affect ranking. So this runs once per locale, on the
 * title in that locale, and never translates anything.
 *
 * Defined once and imported. A second copy of this transform is a second
 * opinion about what `Bảng giá` becomes, and the two would disagree the first
 * time either is touched.
 */

/**
 * `đ` is the trap, and it is specific to Vietnamese.
 *
 * Every other Vietnamese vowel is a base letter plus combining marks, so NFD
 * splits it and the marks can be stripped: `ư` → `u` + U+031B, `ạ` → `a` +
 * U+0323. But `đ` (U+0111) and `Đ` (U+0110) are atomic — NFD leaves them
 * exactly as they are, verified rather than assumed. Strip marks alone and
 * `Đặt lịch` becomes `đat-lich`, which is a non-ASCII character in a URL: it
 * percent-encodes to `%C4%91`, and the pretty slug the whole exercise was for
 * is gone.
 */
const ATOMIC_LETTERS: Record<string, string> = {
  đ: 'd',
  Đ: 'D',
}

export const slugify = (input: string): string =>
  input
    // Separate base letters from their combining marks...
    .normalize('NFD')
    // ...and drop the marks. \p{Mn} is every non-spacing mark, which covers the
    // Vietnamese tone marks and the horn without naming code points one by one.
    .replace(/\p{Mn}/gu, '')
    .replace(/[đĐ]/g, (letter) => ATOMIC_LETTERS[letter]!)
    .toLowerCase()
    // Anything that is not a URL-safe letter or digit becomes a separator. This
    // deliberately collapses runs, so `Giá  &  Khuyến mãi` cannot yield the
    // double hyphen that would make two URLs for one page.
    .replace(/[^a-z0-9]+/g, '-')
    // A leading or trailing hyphen is invisible in the admin UI and visible in
    // the URL.
    .replace(/^-+|-+$/g, '')
