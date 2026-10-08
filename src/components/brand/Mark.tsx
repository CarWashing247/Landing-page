import { BrandIcon } from './BrandIcon'

/** The header pairs this machine-and-car mark with the live CMS brand name. */
export const Mark = ({ className = '' }: { className?: string }) => (
  <BrandIcon className={`h-[34px] w-[34px] shrink-0 ${className}`} />
)
