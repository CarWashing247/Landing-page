/**
 * Vietnamese, and the source of truth for the key set.
 *
 * `en.ts` is typed against this object, so a key added here that is not added
 * there fails `npm run typecheck`. Vietnamese is the source rather than English
 * because it is the default locale and the language the site is actually for —
 * making English the source would mean every Vietnamese string started life as a
 * translation of something.
 *
 * **Most of the Vietnamese below is taken verbatim from the Canva designs**
 * ("AutoWash247 Website UI", design `DAHXNsDnbjg`), which carry copy written by
 * the designer. CLAUDE.md forbids machine-translating Vietnamese and asks for
 * `TODO(copy)` instead; that rule assumes nobody has written the copy. Where the
 * designs have written it, taking it verbatim is better than a placeholder, and
 * a `TODO(copy)` marker would be wrong twice over because it would hide copy
 * that already exists.
 *
 * Strings that appear in **no** deck are marked `TODO(copy)` and listed in the
 * PR. They are not invented and not translated.
 *
 * Two things deliberately do not live here:
 *
 *  - **Business data.** The phone number, address, email and opening hours come
 *    from the `BusinessInfo` global, never from a catalog. The designs show
 *    sample values for them — see the note on `contact` below.
 *  - **The brand name.** It comes from `SiteSettings.brandName`, so `footer.
 *    rights` is only the part that follows it.
 *
 * Casing is natural, not display casing. The designs set several buttons in
 * capitals (GỬI TIN NHẮN, TÌM TRẠM GẦN BẠN); that is `text-transform`, applied
 * by the component. Storing shouted strings would make them unreadable anywhere
 * the design does not shout, and would break the moment a screen reader got one.
 */
export const vi = {
  /** The header's primary navigation. Verbatim from the designs. */
  nav: {
    home: 'Trang chủ',
    services: 'Dịch vụ',
    pricing: 'Bảng giá',
    /**
     * Design.md section 3 names this route in both locales; the Canva designs
     * omit it. See `src/lib/routes.ts` for why the plan wins.
     */
    guide: 'Hướng dẫn',
    about: 'Về chúng tôi',
    news: 'Tin tức',
    contact: 'Liên hệ',
    /** Accessible names for the landmark and the mobile menu toggle. */
    primaryLabel: 'TODO(copy): accessible label for the primary navigation landmark',
    openMenu: 'TODO(copy): accessible label for the button that opens the mobile menu',
    closeMenu: 'TODO(copy): accessible label for the button that closes the mobile menu',
  },

  /**
   * The language switch, shown as "VI | EN" in the designs.
   *
   * The two labels are the languages' own endonyms, so they read the same in
   * either locale — which is why they are not translated in `en.ts` either.
   */
  language: {
    vietnamese: 'VI',
    english: 'EN',
    switchLabel: 'TODO(copy): accessible label for the language switch',
  },

  /** Buttons and calls to action. Verbatim from the designs. */
  actions: {
    findStation: 'Tìm trạm gần bạn',
    tryToday: 'Trải nghiệm dịch vụ ngay hôm nay',
    tryTodayLead: 'Nhanh chóng, tiện lợi, luôn sẵn sàng phục vụ bạn.',
    callNow: 'Gọi ngay',
    directions: 'Chỉ đường',
    viewOnMap: 'Xem trên bản đồ',
    sendMessage: 'Gửi tin nhắn',
    /**
     * The service card's action. Both halves are words the catalog already
     * holds — `Xem` from `viewOnMap` and `gói dịch vụ` from
     * `sections.servicePackage` — so this composes written vocabulary rather
     * than translating anything new.
     */
    viewPackage: 'Xem gói dịch vụ',
  },

  /** Section headings used across the pages. Verbatim from the designs. */
  sections: {
    featuredPackages: 'Gói dịch vụ nổi bật',
    faq: 'Câu hỏi thường gặp',
    priceList: 'Bảng giá dịch vụ',
    fourSteps: 'Quy trình 4 bước',
    serviceDetails: 'Chi tiết dịch vụ',
    includes: 'Bao gồm',
    servicePackage: 'Gói dịch vụ',
    estimatedDuration: 'Thời gian dự kiến',
  },

  /** The three-step explainer on the home page. Verbatim from the designs. */
  steps: {
    scanQr: 'Quét QR',
    chooseService: 'Chọn dịch vụ',
    wash: 'Rửa xe',
  },

  /**
   * Footer column headings and the legal line.
   *
   * `rights` is only what follows the brand: the component composes it with
   * `SiteSettings.brandName` so the name lives in one place (AGENT.md 5.1).
   */
  footer: {
    servicesHeading: 'Dịch vụ',
    aboutHeading: 'Về chúng tôi',
    contactHeading: 'Liên hệ',
    hotline: 'Hotline',
    email: 'Email',
    support: 'Hỗ trợ',
    rights: 'Tất cả quyền được bảo lưu.',
  },

  /**
   * The contact page (T-19). Labels and placeholders are verbatim from the
   * designs; the validation messages are not in any deck.
   *
   * **The designs show sample business data next to this form** — a hotline of
   * `1900 0000`, `info@autowash247.vn`, an address on Đường Lê Duẩn and hours of
   * `Thứ 2 - Thứ 7: 08:00 - 18:00`. Those are design placeholders, not the
   * business's details, and none of them is here: they belong in `BusinessInfo`
   * and are still `TODO(data):` there. Copying them out of the deck would put an
   * invented address into JSON-LD and into Google Business Profile, which is the
   * specific outcome CLAUDE.md warns about.
   */
  contact: {
    heading: 'Kết nối với chúng tôi',
    nameLabel: 'Họ tên',
    namePlaceholder: 'Nhập họ tên',
    emailLabel: 'Email',
    emailPlaceholder: 'Nhập email',
    subjectLabel: 'Chủ đề',
    subjectPlaceholder: 'Chọn chủ đề',
    messageLabel: 'Nội dung',
    messagePlaceholder: 'Nhập nội dung tin nhắn...',
    addressHeading: 'Địa chỉ',
    hoursHeading: 'Giờ làm việc',

    /**
     * Added by T-19, from the **Desktop Pages** deck (`DAHXNi05PeY`, page 6
     * "Liên hệ / lien-he — Desktop"), which is T-19's named design source. The
     * keys above came from the Website UI deck (`DAHXNsDnbjg`, page 8) in
     * T-15A, and the two decks word three of them differently — "Họ và tên"
     * against `nameLabel`'s "Họ tên", "Giờ mở cửa" against `hoursHeading`'s
     * "Giờ làm việc", and a service picker where page 8 has a free "Chủ đề".
     * The existing values are left exactly as T-15A set them: `hoursHeading`
     * is already rendered by the footer (T-16), so re-wording it here would
     * change a component this task has no business touching. The divergence is
     * recorded in `architecture/follow-ups.md` instead.
     *
     * The service picker is a genuinely different field rather than a
     * re-wording, so it gets its own keys and `subjectLabel`/
     * `subjectPlaceholder` are left unused.
     */
    phoneLabel: 'Số điện thoại',
    phonePlaceholder: 'Nhập số điện thoại',
    serviceLabel: 'Dịch vụ quan tâm',
    servicePlaceholder: 'Chọn dịch vụ',

    /**
     * The three cards beside the form. Headings reuse `addressHeading` and
     * `hoursHeading` above; these are the supporting lines under each.
     *
     * `addressNote` is `TODO(copy)` and the others are not, which needs saying:
     * the deck's own text for it extracts as "Tìm dường đến của rửa gần bạn".
     * Two of those are plainly OCR damage for "đường" and "cửa" — Canva's
     * extraction is diacritic-lossy throughout these decks, which T-19A's file
     * also records — but the noun that follows is not recoverable with any
     * confidence, and guessing at it would be writing Vietnamese copy rather
     * than taking it. The other two lines extract cleanly and are verbatim.
     */
    callHeading: 'Gọi chúng tôi',
    callNote: 'Hỗ trợ nhanh chóng mọi thời điểm',
    addressNote: 'TODO(copy): card line under the address — the deck reads "Tìm đường đến <OCR-damaged noun> gần bạn"',
    hoursNote: 'Phục vụ linh hoạt mỗi ngày',

    /** None of these appear in any deck. */
    required: 'TODO(copy): this field is required',
    /**
     * The code a field fails with when it is not text at all. Only a
     * handcrafted POST can reach it — the form's own inputs can only ever
     * produce strings — so it exists to keep the schema's contract true rather
     * than because a visitor is expected to see it.
     */
    invalid: 'TODO(copy): that value is not valid',
    invalidEmail: 'TODO(copy): that does not look like an email address',
    invalidPhone: 'TODO(copy): that does not look like a phone number',
    tooLong: 'TODO(copy): that is longer than this field accepts',
    sending: 'TODO(copy): sending…',
    sent: 'TODO(copy): thank you, your message has been sent',
    sendFailed: 'TODO(copy): the message could not be sent, please try again',
  },

  /**
   * The 404 page.
   *
   * Not in any deck. The wording below is the phrase this task's own
   * verification greps for (`không tìm thấy`), so it is the task file's
   * expectation rather than a translation invented here — and `Trang chủ` is
   * already the designs' own word for the home page.
   */
  notFound: {
    title: '404',
    message: 'Không tìm thấy trang này.',
    backHome: 'Về trang chủ',
  },

  /**
   * Weekday names, for the footer's opening hours.
   *
   * The Vietnamese is taken from the `WEEKDAYS` constant in
   * `src/globals/BusinessInfo.ts`, written in T-05 — already in the repo, so not
   * translated here. Monday first, which is how Vietnamese business listings
   * order the week.
   */
  weekdays: {
    monday: 'Thứ Hai',
    tuesday: 'Thứ Ba',
    wednesday: 'Thứ Tư',
    thursday: 'Thứ Năm',
    friday: 'Thứ Sáu',
    saturday: 'Thứ Bảy',
    sunday: 'Chủ Nhật',
    /** Shown instead of a time range for a day the business does not open. */
    closed: 'Đóng cửa',
  },

  /** Strings that exist for assistive technology rather than for the eye. */
  a11y: {
    skipToContent: 'TODO(copy): skip to main content',
  },

  /**
   * Placeholder body copy, which exists only until the real content lands.
   *
   * **This whole section is meant to be deleted.** T-17 renders the blocks that
   * replace the page and home bodies, T-18 the service template, T-23 the real
   * content. It is here rather than left inline because the criterion is that no
   * component holds a user-facing literal, and a placeholder is still a literal —
   * it renders to a visitor exactly like finished copy does.
   *
   * The designs do have real home and service copy. Putting it in is T-17's and
   * T-23's job, not this task's, which converts what exists rather than writing
   * what does not.
   */
  placeholder: {
    homeBody: 'TODO(copy): home page content — see T-17 (blocks) and T-23 (seed).',
    pageBody: 'TODO(copy): page body — blocks are T-17, real content is T-23.',
  },

  /**
   * The draft preview banner (T-12), which has carried `TODO(copy)` since that
   * task. Still unwritten: no deck shows an editor-facing preview state.
   */
  draft: {
    message: 'TODO(copy): you are viewing a draft — this content is not published',
    exit: 'TODO(copy): exit preview',
  },
} as const

/**
 * The shape every locale must have, with the values widened to `string`.
 *
 * `vi` is `as const`, so its own type is the literal strings. Typing `en`
 * against that directly would demand the *Vietnamese words*, which is obviously
 * not what is wanted — hence the mapped type: same keys, two levels deep, any
 * string as the value.
 *
 * Deriving the shape from `vi` rather than declaring it separately is what makes
 * the key set single-sourced. A hand-written interface would be a third place to
 * update and the first to fall behind.
 */
export type Messages = {
  [Section in keyof typeof vi]: {
    [Key in keyof (typeof vi)[Section]]: string
  }
}
