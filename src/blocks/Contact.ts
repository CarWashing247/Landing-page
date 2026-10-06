import type { Block } from 'payload'

/**
 * The contact band: the business's own details beside a form.
 *
 * **This is the sixth block, and adding one was a decision rather than a
 * convenience.** T-17A's scope note says not to add a block quietly, so: the
 * alternative was a hardcoded `/lien-he` route, which is what T-19's file
 * originally listed. That route would have shadowed `[slug]` for the slug
 * `src/lib/routes.ts` already points the header at, and taken the page's SEO
 * tab out of an editor's hands — which is the one thing Design.md's second goal
 * is about. As a block, the contact page is a `Pages` document like every other
 * page, so T-23 seeds it, T-13 lists it, T-08 gives it an SEO tab, and an
 * editor can reword it without a deploy.
 *
 * **Only the two prose fields are editable, deliberately.** The phone number,
 * the address and the opening hours are *not* fields here: they come from the
 * `BusinessInfo` global, because AGENT.md 5.4 requires them to be
 * byte-identical to Google Business Profile and a second copy inside a block is
 * exactly how two answers appear. The form's own labels are interface text and
 * come from the T-15A catalog. So what an editor owns here is the heading and
 * the lead paragraph, which is what the design varies.
 *
 * Placeholders are the designer's copy from the Desktop Pages deck
 * (`DAHXNi05PeY`, page 6), so an editor adding the block starts from the
 * wording the design was signed off with rather than an empty box.
 */
export const Contact: Block = {
  slug: 'contact',
  labels: {
    singular: { en: 'Contact', vi: 'Khối liên hệ' },
    plural: { en: 'Contact blocks', vi: 'Các khối liên hệ' },
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
      label: { en: 'Heading', vi: 'Tiêu đề' },
      admin: {
        placeholder: 'Chúng tôi luôn sẵn sàng hỗ trợ bạn',
        description: {
          en:
            'The section heading. It renders as a second-level heading, so it does ' +
            'not compete with the page’s own title.',
          vi:
            'Tiêu đề của phần này. Hiển thị ở cấp tiêu đề thứ hai, nên không ' +
            'tranh chấp với tiêu đề chính của trang.',
        },
      },
    },
    {
      name: 'body',
      type: 'textarea',
      label: { en: 'Supporting paragraph', vi: 'Đoạn mô tả' },
      admin: {
        placeholder:
          'Gửi yêu cầu hoặc gọi trực tiếp để được tư vấn về dịch vụ rửa xe nhanh chóng và minh bạch.',
        description: {
          en:
            'One short paragraph under the heading. The phone number, address and ' +
            'opening hours are not written here — they are taken from Business ' +
            'information, so they stay identical to your Google Business Profile.',
          vi:
            'Một đoạn ngắn dưới tiêu đề. Không ghi số điện thoại, địa chỉ hay giờ ' +
            'mở cửa ở đây — những thông tin đó được lấy từ Thông tin doanh nghiệp, ' +
            'để luôn khớp với Google Business Profile của bạn.',
        },
      },
    },
  ],
}
