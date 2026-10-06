import type { GlobalConfig } from 'payload'

import { anyone, isAdmin } from '../lib/access'
import { revalidateGlobal } from '../lib/revalidate'

/**
 * Site-wide defaults: the brand, the metadata fallbacks, the social links.
 *
 * This is what `buildMetadata()` (T-09) falls back to when a page leaves its
 * SEO fields blank, which is the common case — an editor adds a page and
 * fills in the words, not the Open Graph image. Without a fallback here, that
 * page ships with no description and no share image, and nothing says so.
 *
 * Two fields are localized and the rest are not, which is a schema decision
 * rather than a preference (Design.md section 2.2, AGENT.md 5.6): `titleSuffix`
 * and `defaultDescription` are prose a reader sees, so they need a Vietnamese
 * and an English value. A brand name, an image and a measurement ID do not
 * change between locales, and making them localized would invite two
 * divergent brand names.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: { en: 'Site settings', vi: 'Cài đặt trang web' },
  admin: {
    group: { en: 'Globals', vi: 'Globals' },
    /**
     * Hidden from anyone who is not an admin — cosmetic only, exactly as on
     * `Users`. `update: isAdmin` below is the control, and `read` stays open
     * because every value here is printed in the footer of every public page.
     *
     * Without this an editor sees both globals in the sidebar and can open
     * them read-only, which is deck page 10's reading (`Globals · Editor ·
     * View only`). Page 2's editor sidebar has no Globals group at all and
     * page 9 says `Chỉ Admin mới có quyền truy cập và chỉnh sửa`; two screens
     * against one, and the two agree with AGENT.md 5.6. See the task file.
     */
    hidden: ({ user }) => user?.role !== 'admin',
    description: {
      en: 'Brand, default SEO values and social links used across the whole site.',
      vi:
        'Thương hiệu, giá trị SEO mặc định và liên kết mạng xã hội dùng cho ' +
        'toàn bộ trang web.',
    },
  },
  hooks: {
    /**
     * Both globals feed the header, the footer and the JSON-LD on every page,
     * so a change here purges the site-wide `globals` tag. Expensive and rare,
     * which Design.md 1.3 calls the correct trade.
     */
    afterChange: [revalidateGlobal('site-settings')],
  },
  access: {
    // The brand name and the GA4 ID reach the browser on every page anyway;
    // the fallbacks are read when rendering public metadata.
    read: anyone,
    // Same reasoning as BusinessInfo: outside the editor role's scope, and a
    // changed title suffix rewrites the <title> of every page at once.
    update: isAdmin,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: { en: 'Brand', vi: 'Thương hiệu' },
          fields: [
            {
              name: 'brandName',
              type: 'text',
              required: true,
              label: { en: 'Brand name', vi: 'Tên thương hiệu' },
              admin: {
                description: {
                  en:
                    'The trading name, as customers know it. Used in page titles. ' +
                    'This is the short name — the registered legal name lives in ' +
                    'Business information.',
                  vi:
                    'Tên thương mại như khách hàng biết đến. Dùng trong tiêu đề ' +
                    'trang. Đây là tên ngắn — tên pháp lý đã đăng ký nằm ở phần ' +
                    'Thông tin doanh nghiệp.',
                },
              },
            },
            {
              name: 'favicon',
              type: 'upload',
              relationTo: 'media',
              label: { en: 'Favicon', vi: 'Biểu tượng trang (favicon)' },
              admin: {
                description: {
                  en: 'The small icon shown in the browser tab. A square image works best.',
                  vi: 'Biểu tượng nhỏ hiển thị trên tab của trình duyệt. Nên dùng ảnh vuông.',
                },
              },
            },
            {
              name: 'socialLinks',
              type: 'array',
              label: { en: 'Social links', vi: 'Liên kết mạng xã hội' },
              labels: {
                singular: { en: 'Link', vi: 'Liên kết' },
                plural: { en: 'Links', vi: 'Các liên kết' },
              },
              admin: {
                description: {
                  en: 'Shown in the footer. Leave empty for any platform you do not use.',
                  vi: 'Hiển thị ở chân trang. Bỏ trống nếu không dùng nền tảng nào.',
                },
              },
              fields: [
                {
                  name: 'platform',
                  type: 'select',
                  required: true,
                  label: { en: 'Platform', vi: 'Nền tảng' },
                  // A fixed list rather than free text: the footer renders an
                  // icon per platform (T-16), and it cannot render one for a
                  // value nobody anticipated.
                  options: [
                    { value: 'facebook', label: { en: 'Facebook', vi: 'Facebook' } },
                    { value: 'zalo', label: { en: 'Zalo', vi: 'Zalo' } },
                    { value: 'youtube', label: { en: 'YouTube', vi: 'YouTube' } },
                    { value: 'tiktok', label: { en: 'TikTok', vi: 'TikTok' } },
                    { value: 'instagram', label: { en: 'Instagram', vi: 'Instagram' } },
                  ],
                  admin: { width: '30%' },
                },
                {
                  name: 'url',
                  type: 'text',
                  required: true,
                  label: { en: 'Link', vi: 'Đường dẫn' },
                  admin: { width: '70%', placeholder: 'https://facebook.com/…' },
                  validate: (value: string | null | undefined) => {
                    if (!value) return true

                    return /^https?:\/\//.test(value)
                      ? true
                      : 'Phải là đường dẫn đầy đủ, bắt đầu bằng https:// . / Must be a full URL starting with https://'
                  },
                },
              ],
            },
          ],
        },
        {
          /**
           * Its own tab, per AGENT.md 5.6. These are defaults that silently
           * affect every page, and mixing them in with the brand fields is how
           * someone edits the whole site's description while meaning to rename
           * the company.
           */
          label: { en: 'SEO defaults', vi: 'Mặc định SEO' },
          description: {
            en: 'Used on any page that leaves its own SEO fields blank.',
            vi: 'Được dùng cho trang nào để trống các ô SEO của riêng nó.',
          },
          fields: [
            {
              name: 'titleSuffix',
              type: 'text',
              localized: true,
              label: { en: 'Title suffix', vi: 'Phần thêm vào tiêu đề' },
              admin: {
                placeholder: '| AutoWash247',
                description: {
                  en:
                    'Appended to every page title, including the separator. ' +
                    'Google truncates titles near 60 characters, so keep it short.',
                  vi:
                    'Được thêm vào cuối mọi tiêu đề trang, bao gồm cả dấu phân ' +
                    'cách. Google cắt tiêu đề quanh mốc 60 ký tự, nên hãy để ngắn.',
                },
              },
            },
            {
              name: 'defaultDescription',
              type: 'textarea',
              localized: true,
              // Google truncates around 160; 180 leaves room without inviting a
              // paragraph. A hard limit beats a note nobody reads.
              maxLength: 180,
              label: { en: 'Default meta description', vi: 'Mô tả meta mặc định' },
              admin: {
                description: {
                  en:
                    'One or two sentences describing the business, used when a page ' +
                    'has no description of its own. Around 150 characters reads best ' +
                    'in search results; 180 is the maximum.',
                  vi:
                    'Một đến hai câu mô tả doanh nghiệp, dùng khi một trang không ' +
                    'có mô tả riêng. Khoảng 150 ký tự là đẹp nhất trong kết quả ' +
                    'tìm kiếm; tối đa 180.',
                },
              },
            },
            {
              name: 'ogFallback',
              type: 'upload',
              relationTo: 'media',
              label: {
                en: 'Fallback share image',
                vi: 'Ảnh chia sẻ mặc định',
              },
              admin: {
                description: {
                  en:
                    'Shown when a page has no share image of its own. Facebook and ' +
                    'Zalo crop to 1200x630, which the upload generates for you.',
                  vi:
                    'Hiển thị khi một trang không có ảnh chia sẻ riêng. Facebook và ' +
                    'Zalo cắt theo tỉ lệ 1200x630, bản này được tạo tự động khi tải lên.',
                },
              },
            },
          ],
        },
        {
          label: { en: 'Analytics', vi: 'Phân tích' },
          fields: [
            {
              name: 'ga4MeasurementId',
              type: 'text',
              label: { en: 'GA4 measurement ID', vi: 'Mã đo lường GA4' },
              admin: {
                placeholder: 'G-XXXXXXXXXX',
                description: {
                  en:
                    'From Google Analytics: Admin → Data streams → your stream. ' +
                    'Starts with "G-". Leave blank to load no analytics at all.',
                  vi:
                    'Lấy từ Google Analytics: Quản trị → Luồng dữ liệu → luồng của ' +
                    'bạn. Bắt đầu bằng "G-". Để trống thì không tải phân tích nào.',
                },
              },
              validate: (value: string | null | undefined) => {
                if (!value) return true

                // A measurement ID is not a secret — it ships in the client
                // bundle — but the wrong shape means silently no analytics,
                // which looks identical to a quiet week of traffic.
                return /^G-[A-Z0-9]{6,12}$/.test(value)
                  ? true
                  : 'Mã GA4 có dạng G-XXXXXXXXXX. / A GA4 ID looks like G-XXXXXXXXXX.'
              },
            },
          ],
        },
      ],
    },
  ],
}
