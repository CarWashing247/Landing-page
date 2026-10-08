import Image from 'next/image'

export type SiteIconName =
  | 'clock'
  | 'droplet'
  | 'help'
  | 'location'
  | 'package'
  | 'phone'
  | 'qr-scan'
  | 'sparkle'
  | 'wash-arch'

/** Decorative icon: the adjacent text always names the item. */
export const SiteIcon = ({
  className = '',
  name,
  size = 48,
}: {
  className?: string
  name: SiteIconName
  size?: number
}) => (
  <Image
    alt=""
    aria-hidden="true"
    className={className}
    height={size}
    src={`/brand/icons/${name}.svg`}
    width={size}
  />
)
