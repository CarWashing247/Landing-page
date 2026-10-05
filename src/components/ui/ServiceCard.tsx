import type { ReactNode } from 'react'
import { Button } from './Button'

type Props = { name: string; price: string; description?: string; popular?: boolean; href: string; children?: ReactNode }

export const ServiceCard = ({ name, price, description, popular, href, children }: Props) => (
  <article className="relative flex min-h-[360px] flex-col rounded-[20px] bg-white p-6 shadow-[0_8px_30px_rgba(9,14,19,0.04)]">
    <div className="min-h-5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-brand-primary)]">{popular ? 'POPULAR' : ''}</div>
    <h3 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{name}</h3>
    <p className="mt-2 text-[34px] font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">{price}</p>
    {description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>}
    {children && <div className="mt-5">{children}</div>}
    <div className="mt-auto pt-6"><Button href={href} className="w-full min-h-[46px] text-sm">Xem chi tiết</Button></div>
  </article>
)
