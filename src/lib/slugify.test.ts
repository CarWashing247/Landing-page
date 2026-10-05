import { describe, expect, it } from 'vitest'

import { slugify } from './slugify'

describe('slugify', () => {
  it('unaccents a Vietnamese title', () => {
    expect(slugify('Bảng giá')).toBe('bang-gia')
  })

  it.each([
    ['Dịch vụ rửa xe', 'dich-vu-rua-xe'],
    ['Rửa xe nhanh', 'rua-xe-nhanh'],
    ['Giới thiệu', 'gioi-thieu'],
    ['Liên hệ', 'lien-he'],
    ['Câu hỏi thường gặp', 'cau-hoi-thuong-gap'],
  ])('%s -> %s', (title, expected) => {
    expect(slugify(title)).toBe(expected)
  })

  /**
   * The one case NFD does not solve. `đ` and `Đ` are atomic code points, so
   * stripping combining marks leaves them untouched and the slug carries a
   * non-ASCII character that percent-encodes in the URL.
   */
  it.each([
    ['Đặt lịch', 'dat-lich'],
    ['Đánh giá', 'danh-gia'],
    ['Địa điểm', 'dia-diem'],
    ['đồng giá', 'dong-gia'],
  ])('handles the atomic đ: %s -> %s', (title, expected) => {
    expect(slugify(title)).toBe(expected)
  })

  it('leaves no non-ASCII character behind for any Vietnamese vowel', () => {
    const everyVowel = 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữự'

    expect(slugify(everyVowel)).toMatch(/^[a-z0-9-]*$/)
    expect(slugify(`Đđ${everyVowel}`)).toMatch(/^[a-z0-9-]*$/)
  })

  it('collapses punctuation and runs of spaces into single hyphens', () => {
    expect(slugify('Giá  &  Khuyến mãi')).toBe('gia-khuyen-mai')
    expect(slugify('Rửa xe — nội thất')).toBe('rua-xe-noi-that')
  })

  it('trims leading and trailing separators', () => {
    expect(slugify('  Bảng giá!  ')).toBe('bang-gia')
    expect(slugify('--bang-gia--')).toBe('bang-gia')
  })

  it('leaves an existing slug unchanged, so re-slugifying is safe', () => {
    expect(slugify('bang-gia')).toBe('bang-gia')
    expect(slugify(slugify('Bảng giá'))).toBe('bang-gia')
  })

  it('keeps digits', () => {
    expect(slugify('Gói 3 bước')).toBe('goi-3-buoc')
  })

  it('returns an empty string rather than a lone hyphen for unusable input', () => {
    // The caller decides what to do about it; a slug of "-" would be a URL.
    expect(slugify('')).toBe('')
    expect(slugify('   ')).toBe('')
    expect(slugify('!!!')).toBe('')
  })

  it('handles an English title too', () => {
    expect(slugify('Pricing & Packages')).toBe('pricing-packages')
  })
})
