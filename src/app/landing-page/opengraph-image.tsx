import { CONTENT_TYPE, SIZE, openGraphImage } from '../../components/seo/OpenGraphImage'

/**
 * Applies to this locale's whole subtree, so every route below it has a share
 * image even before anyone uploads one. See `OpenGraphImage.tsx`.
 */
export const alt = 'AutoWash247'
export const contentType = CONTENT_TYPE
export const size = SIZE

const Image = async () => openGraphImage('vi')

export default Image
