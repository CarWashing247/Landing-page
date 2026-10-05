import type { Field, GlobalConfig } from 'payload'

import { anyone, isAdmin } from '../lib/access'
import { revalidateGlobal } from '../lib/revalidate'

/**
 * The one place the business's identity lives: name, address, phone, hours.
 *
 * After this global exists, a phone number written into a component is a bug.
 * The footer (T-16), the contact page (T-19) and the `AutoWash` JSON-LD (T-14)
 * all read from here, and the JSON-LD is the reason it matters more than
 * tidiness: Google compares the name, address and phone it finds in structured
 * data against Google Business Profile, and a mismatch in either direction
 * costs local ranking. One source can be made to match. Three copies cannot.
 *
 * **Nothing here is localized**, deliberately (Design.md section 2.2). A
 * street address translated into English is wrong in both languages, and the
 * byte-identical requirement in AGENT.md 5.4 cannot hold for a field that has
 * two values.
 *
 * Values are filled by T-23, not here. Leave them empty rather than inventing
 * a plausible Hanoi address — it would end up in JSON-LD and in Google
 * Business Profile, and it is far harder to retract than to enter.
 */

/** `HH:MM`, 24-hour. The format `openingHours` in JSON-LD requires verbatim. */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * The week, in the order the footer prints it and `schema.org` names it.
 * Monday first: Vietnamese business listings start the week on Monday, and a
 * Sunday-first list reads as a mistake to the audience that maintains it.
 */
const WEEKDAYS = [
  { value: 'monday', en: 'Monday', vi: 'Thứ Hai' },
  { value: 'tuesday', en: 'Tuesday', vi: 'Thứ Ba' },
  { value: 'wednesday', en: 'Wednesday', vi: 'Thứ Tư' },
  { value: 'thursday', en: 'Thursday', vi: 'Thứ Năm' },
  { value: 'friday', en: 'Friday', vi: 'Thứ Sáu' },
  { value: 'saturday', en: 'Saturday', vi: 'Thứ Bảy' },
  { value: 'sunday', en: 'Sunday', vi: 'Chủ Nhật' },
] as const

/**
 * A time, validated in the config rather than explained in a handover note
 * (AGENT.md 5.6). `8h` and `08:00 AM` are what people type; both break the
 * JSON-LD silently, because invalid `openingHours` is dropped by Google
 * without an error anywhere an editor would see it.
 */
const timeField = (name: 'opens' | 'closes', label: { en: string; vi: string }): Field => ({
  name,
  type: 'text',
  label,
  admin: {
    placeholder: name === 'opens' ? '07:30' : '21:00',
    // Hidden when the day is closed: two empty time boxes under a ticked
    // "closed" box invite someone to fill them in.
    condition: (_data, siblingData: { closed?: boolean }) => !siblingData?.closed,
    width: '25%',
  },
  validate: (value: string | null | undefined) => {
    if (!value) return true

    return TIME_PATTERN.test(value)
      ? true
      : 'Dùng định dạng 24 giờ HH:MM, ví dụ 07:30 hoặc 21:00. / Use 24-hour HH:MM, e.g. 07:30 or 21:00.'
  },
})

export const BusinessInfo: GlobalConfig = {
  slug: 'business-info',
  label: { en: 'Business information', vi: 'Thông tin doanh nghiệp' },
  admin: {
    description: {
      en:
        'Name, address, phone and opening hours. These appear in the footer, on ' +
        'the contact page, and in the structured data Google reads. They must ' +
        'match your Google Business Profile exactly, character for character.',
      vi:
        'Tên, địa chỉ, số điện thoại và giờ mở cửa. Những thông tin này xuất ' +
        'hiện ở chân trang, trang liên hệ, và trong dữ liệu có cấu trúc mà ' +
        'Google đọc. Phải khớp chính xác từng ký tự với Google Business Profile.',
    },
  },
  hooks: {
    /**
     * Both globals feed the header, the footer and the JSON-LD on every page,
     * so a change here purges the site-wide `globals` tag. Expensive and rare,
     * which Design.md 1.3 calls the correct trade.
     */
    afterChange: [revalidateGlobal('business-info')],
  },
  access: {
    // Public: every value here is already printed in the footer of every page.
    // Without this, Payload denies anonymous reads and the REST check in this
    // task's verification 403s.
    read: anyone,
    // Not `isAdminOrEditor`. The editor role is scoped to Pages, Services and
    // Media (AGENT.md 5.6), and this is the record Google reconciles against
    // Business Profile — a well-meant edit to the address desynchronises the
    // two until someone notices the ranking drop.
    update: isAdmin,
  },
  fields: [
    {
      name: 'legalName',
      type: 'text',
      required: true,
      label: { en: 'Registered business name', vi: 'Tên doanh nghiệp đã đăng ký' },
      admin: {
        description: {
          en: 'Exactly as registered and as it appears on Google Business Profile.',
          vi: 'Chính xác như đã đăng ký và như trên Google Business Profile.',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'streetAddress',
          type: 'text',
          required: true,
          label: { en: 'Street address', vi: 'Địa chỉ đường phố' },
          admin: {
            width: '60%',
            description: {
              en: 'House number and street only. The district goes in the next field.',
              vi: 'Chỉ số nhà và tên đường. Quận/huyện điền ở ô bên cạnh.',
            },
          },
        },
        {
          name: 'locality',
          type: 'text',
          required: true,
          label: { en: 'District and city', vi: 'Quận/huyện và tỉnh/thành phố' },
          admin: { width: '25%', placeholder: 'Cầu Giấy, Hà Nội' },
        },
        {
          name: 'postalCode',
          type: 'text',
          label: { en: 'Postal code', vi: 'Mã bưu chính' },
          admin: { width: '15%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'lat',
          type: 'number',
          label: { en: 'Latitude', vi: 'Vĩ độ' },
          admin: {
            width: '50%',
            placeholder: '21.0313',
            description: {
              en:
                'From Google Maps: right-click your location on the map and click ' +
                'the coordinates to copy them. Latitude is the first number.',
              vi:
                'Lấy từ Google Maps: bấm chuột phải vào vị trí trên bản đồ rồi ' +
                'bấm vào toạ độ để sao chép. Vĩ độ là số thứ nhất.',
            },
          },
        },
        {
          name: 'lng',
          type: 'number',
          label: { en: 'Longitude', vi: 'Kinh độ' },
          admin: {
            width: '50%',
            placeholder: '105.7821',
            description: {
              en: 'The second of the two numbers copied from Google Maps.',
              vi: 'Số thứ hai trong hai số đã sao chép từ Google Maps.',
            },
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'phone',
          type: 'text',
          required: true,
          label: { en: 'Phone number', vi: 'Số điện thoại' },
          admin: {
            width: '50%',
            placeholder: '024 1234 5678',
            description: {
              en:
                'Write it the way a customer would dial it. Keep it identical to ' +
                'Google Business Profile, spacing included.',
              vi:
                'Viết đúng như cách khách hàng bấm số. Giữ giống hệt Google ' +
                'Business Profile, kể cả khoảng trắng.',
            },
          },
        },
        {
          name: 'zalo',
          type: 'text',
          label: { en: 'Zalo number or link', vi: 'Số Zalo hoặc liên kết Zalo' },
          admin: {
            width: '50%',
            description: {
              en: 'Optional. A phone number, or a zalo.me link.',
              vi: 'Không bắt buộc. Một số điện thoại, hoặc liên kết zalo.me.',
            },
          },
        },
      ],
    },
    {
      name: 'openingHours',
      type: 'array',
      label: { en: 'Opening hours', vi: 'Giờ mở cửa' },
      labels: {
        singular: { en: 'Day', vi: 'Ngày' },
        plural: { en: 'Days', vi: 'Các ngày' },
      },
      /**
       * Exactly seven rows, pre-filled, and neither addable nor removable.
       *
       * The alternative — an empty array an editor fills in — produces a
       * partial week, and a missing day in JSON-LD reads to Google as "closed",
       * not as "unknown". Fixing the count in the config is the guardrail
       * AGENT.md 5.6 asks for.
       *
       * The cost: a day with a midday break cannot be expressed, because that
       * needs two rows for one weekday. Worth revisiting only if the business
       * actually closes for lunch; see this task's report.
       */
      minRows: 7,
      maxRows: 7,
      defaultValue: WEEKDAYS.map(({ value }) => ({ day: value, closed: false })),
      admin: {
        initCollapsed: false,
        description: {
          en:
            'One row per weekday, already in order. Tick "Closed" for a day you ' +
            'do not open; its times then disappear. Use 24-hour times.',
          vi:
            'Mỗi ngày trong tuần một dòng, đã sắp theo thứ tự. Tích "Đóng cửa" ' +
            'cho ngày không mở; khi đó ô giờ sẽ ẩn đi. Dùng giờ 24 tiếng.',
        },
      },
      fields: [
        {
          name: 'day',
          type: 'select',
          required: true,
          label: { en: 'Day', vi: 'Ngày' },
          options: WEEKDAYS.map(({ value, en, vi }) => ({ value, label: { en, vi } })),
          admin: { width: '25%' },
        },
        {
          name: 'closed',
          type: 'checkbox',
          label: { en: 'Closed all day', vi: 'Đóng cửa cả ngày' },
          defaultValue: false,
          admin: { width: '25%' },
        },
        timeField('opens', { en: 'Opens', vi: 'Mở cửa' }),
        timeField('closes', { en: 'Closes', vi: 'Đóng cửa' }),
      ],
    },
    {
      name: 'priceRange',
      type: 'text',
      label: { en: 'Price range', vi: 'Khoảng giá' },
      admin: {
        placeholder: '50.000₫ - 200.000₫',
        description: {
          en:
            'A rough range, shown in search results. Not a price list — the ' +
            'services carry their own prices.',
          vi:
            'Khoảng giá tương đối, hiển thị trong kết quả tìm kiếm. Không phải ' +
            'bảng giá — mỗi dịch vụ có giá riêng.',
        },
      },
    },
  ],
}
