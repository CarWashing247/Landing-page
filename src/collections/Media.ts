import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../lib/access'

/**
 * The image library.
 *
 * `alt` is required at the database level, not merely encouraged in a
 * handover document (AGENT.md section 5.6). It is read aloud by screen
 * readers and indexed by Google, and it is the one field an editor in a hurry
 * will skip. T-23 fills real Vietnamese alt text; do not relax this to make
 * seeding easier — a nullable column now means a migration later.
 *
 * Where the bytes land is decided by the storage plugin in payload.config.ts,
 * not here, so this collection is identical whether R2 or local disk is in
 * use.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { en: 'Image', vi: 'Hình ảnh' },
    plural: { en: 'Images', vi: 'Hình ảnh' },
  },
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'updatedAt'],
    description: {
      en:
        'Upload images at least 1200px wide. Smaller ones still work, but the ' +
        'Facebook/Zalo share image will be enlarged and slightly soft.',
      vi:
        'Tải ảnh rộng ít nhất 1200px. Ảnh nhỏ hơn vẫn dùng được, nhưng ảnh ' +
        'chia sẻ lên Facebook/Zalo sẽ bị phóng to và hơi mờ.',
    },
  },
  access: {
    // Images on a marketing site are public by definition: without this,
    // Payload's default denies anonymous reads and every <img> on the site
    // 403s for visitors and crawlers.
    read: anyone,
    // An upload *is* a create on this collection, so an editor without it
    // could change a page's words but not its pictures. That is the one place
    // `create` matters for the editor role (T-03).
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    // Deleting an image breaks every page already using it, and there is no
    // undo. Editors replace images instead.
    delete: isAdmin,
  },
  upload: {
    // Local-disk fallback only (MEDIA_LOCAL_DISK=true). Gitignored: uploads
    // are content, not source.
    staticDir: 'media-local',
    mimeTypes: ['image/*'],
    // Lets an editor choose what must stay in frame when a size crops.
    focalPoint: true,
    //
    // `withoutEnlargement` is set on every size on purpose. Left undefined,
    // Payload returns *null* for any size larger than the source: a 600x400
    // upload generated only `thumbnail`, and `card`, `hero` and `og` were all
    // absent. A missing `og` means no Facebook/Zalo preview image at all, and
    // nothing in the admin UI says so.
    //
    //   false -> always enlarge to the target size
    //   true  -> fall back to the original image, never upscaled
    //
    // So every size is always populated, and downstream code (T-09 metadata,
    // T-17 blocks) never has to handle a null size.
    imageSizes: [
      // Admin list thumbnails.
      { name: 'thumbnail', width: 300, height: 300, fit: 'cover', withoutEnlargement: true },
      // Cards and grids.
      { name: 'card', width: 768, height: 512, fit: 'cover', withoutEnlargement: true },
      // Above-the-fold hero. Width only: a fixed height would crop every
      // hero to one aspect ratio regardless of the source image. Not
      // upscaled — a stretched 600px source makes a blurry hero.
      { name: 'hero', width: 1920, withoutEnlargement: true },
      // Open Graph. Exactly 1200x630 and cropped, never letterboxed —
      // Facebook and Zalo pad anything else with grey bars. This is the one
      // size that *must* enlarge: the right dimensions matter more than
      // sharpness, because a wrong-sized card is rejected outright.
      { name: 'og', width: 1200, height: 630, fit: 'cover', withoutEnlargement: false },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      // Localized: alt text is read aloud and indexed, so an English page
      // needs English alt text (Design.md section 2.1).
      localized: true,
      label: {
        en: 'Image description (for SEO and screen readers)',
        vi: 'Mô tả ảnh (cho SEO và trình đọc màn hình)',
      },
      admin: {
        description: {
          en:
            'Briefly describe what the image shows. Screen readers read this ' +
            'aloud and Google uses it to understand the image. For example: ' +
            '"A white sedan being washed automatically at AutoWash247". Required.',
          vi:
            'Mô tả ngắn nội dung của ảnh. Trình đọc màn hình sẽ đọc câu này, ' +
            'và Google dùng nó để hiểu ảnh. Ví dụ: "Xe sedan trắng đang được ' +
            'rửa tự động tại AutoWash247". Bắt buộc phải có.',
        },
      },
    },
    {
      name: 'caption',
      type: 'text',
      localized: true,
      label: { en: 'Caption (optional)', vi: 'Chú thích (không bắt buộc)' },
      admin: {
        description: {
          en: 'Caption shown beneath the image on the page. Leave blank if not needed.',
          vi: 'Chú thích hiển thị bên dưới ảnh trên trang. Để trống nếu không cần.',
        },
      },
    },
  ],
}
