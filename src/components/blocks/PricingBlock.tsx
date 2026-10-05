import type { Service } from '../../payload-types'
import { loadServices } from '../../lib/content'
import { pathForService } from '../../lib/locales'
import { ServiceCard } from '../ui/ServiceCard'

const money = (price: number, currency: string) =>
  new Intl.NumberFormat('vi-VN').format(price) + (currency === 'VND' ? 'đ' : ` ${currency}`)

export const PricingBlock = async ({ services, locale }: { services?: Service[]; locale: 'vi' | 'en' }) => {
  const items = services ?? await loadServices(locale)

  return (
    <section id="dich-vu" className="bg-[var(--color-surface-subtle)] py-24">
      <div className="mx-auto max-w-[1260px] px-5 lg:px-0">
        <div className="text-xs font-bold tracking-[0.08em] text-[var(--color-brand-primary)]">SERVICES</div>
        <h2 className="mt-3 text-4xl font-bold tracking-[-0.03em]">Chọn gói rửa phù hợp</h2>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {items.slice(0, 3).map((service, index) => (
            <ServiceCard
              key={service.id}
              name={service.name}
              price={money(service.price, service.currency)}
              description={index === 0 ? 'Rửa cơ bản' : index === 1 ? 'Gói được lựa chọn nhiều nhất' : 'Chăm sóc toàn diện'}
              popular={index === 1}
              href={pathForService(service.slug, locale)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
