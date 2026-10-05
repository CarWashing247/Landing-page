import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Button } from './ui/Button'
import { Footer } from './layout/Footer'
import { Header } from './layout/Header'
import { loadService, loadSiteSettings } from '../lib/content'
import type { Locale } from '../lib/locales'
import { buildMetadata } from './seo/metadata'

export const servicePageMetadata = async (slug: string, locale: Locale): Promise<Metadata> => {
  const found = await loadService(slug, locale)
  if (!found) return {}
  return buildMetadata({
    doc: { meta: found.doc.meta, title: found.doc.name },
    locale,
    paths: found.paths,
    settings: await loadSiteSettings(locale),
  })
}

export const ServicePage = async ({ locale, slug }: { locale: Locale; slug: string }) => {
  const found = await loadService(slug, locale)
  if (!found) notFound()

  const price = new Intl.NumberFormat('vi-VN').format(found.doc.price) + 'đ'

  return (
    <>
      <Header locale={locale} />
      <main>
        <section className="bg-[var(--color-surface-dark)] py-20 text-white">
          <div className="mx-auto grid max-w-[1260px] gap-12 px-5 lg:grid-cols-[1fr_480px] lg:px-0">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-brand-accent)]">SERVICE</div>
              <h1 className="mt-4 text-5xl font-bold tracking-[-0.04em] md:text-6xl">{found.doc.name}</h1>
              <p className="mt-6 text-[19px] text-[#c7d4e3]">Gói rửa tự động dành cho hành trình của bạn.</p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Button href="#chi-tiet">Xem chi tiết</Button>
                <Button href="#lien-he" variant="secondary">Tìm trạm</Button>
              </div>
            </div>
            <div className="flex min-h-[360px] items-center justify-center rounded-[28px] bg-[#141a24]">
              <span className="text-center text-3xl font-bold text-[#a6b8d1]">AUTOWASH247</span>
            </div>
          </div>
        </section>
        <section id="chi-tiet" className="bg-white py-20">
          <div className="mx-auto max-w-[1260px] px-5 lg:px-0">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl bg-[var(--color-surface-subtle)] p-6"><div className="text-sm text-[var(--color-text-muted)]">Giá</div><div className="mt-2 text-3xl font-bold">{price}</div></div>
              <div className="rounded-2xl bg-[var(--color-surface-subtle)] p-6"><div className="text-sm text-[var(--color-text-muted)]">Thời lượng</div><div className="mt-2 text-3xl font-bold">{found.doc.durationMinutes} phút</div></div>
              <div className="rounded-2xl bg-[var(--color-surface-subtle)] p-6"><div className="text-sm text-[var(--color-text-muted)]">Sẵn sàng</div><div className="mt-2 text-3xl font-bold">24/7</div></div>
            </div>
            <div className="mt-14 max-w-2xl">
              <h2 className="text-3xl font-bold">Gói này bao gồm</h2>
              <ul className="mt-6 space-y-3">{found.doc.includes.map((item) => <li key={item.id} className="rounded-xl border border-[var(--color-border-default)] px-5 py-4">{item.item}</li>)}</ul>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  )
}
