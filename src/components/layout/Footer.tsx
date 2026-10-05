import type { Locale } from '../../lib/locales'
import { loadSiteSettings } from '../../lib/content'

export const Footer = async ({ locale }: { locale: Locale }) => {
  const [settings, business] = await Promise.all([
    loadSiteSettings(locale),
    (async () => {
      const { getPayload } = await import('../../lib/payload')
      try {
        return await (await getPayload()).findGlobal({ slug: 'business-info', depth: 0, locale })
      } catch {
        return null
      }
    })(),
  ])
  const brand = settings?.brandName || 'AutoWash247'

  return (
    <footer id="lien-he" className="bg-[var(--color-surface-dark)] text-white">
      <div className="mx-auto grid max-w-[1260px] gap-10 px-5 py-16 md:grid-cols-3 lg:px-0">
        <div>
          <div className="text-[22px] font-bold">{brand.toUpperCase()}</div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#b2c2d6]">Automated car wash, available 24/7.</p>
        </div>
        <div className="space-y-3 text-sm">
          <a href="#dich-vu" className="block">Dịch vụ</a>
          <a href="#cach-hoat-dong" className="block">Cách hoạt động</a>
          <a href="#faq" className="block">FAQ</a>
          <a href="#lien-he" className="block">Liên hệ</a>
        </div>
        <div className="space-y-3 text-sm text-[#b2c2d6]">
          <div className="text-white">OPEN 24/7</div>
          <div>{business?.locality || 'Hà Nội, Việt Nam'}</div>
          <div>{business?.phone || 'Hotline / Directions'}</div>
        </div>
      </div>
      <div className="mx-auto max-w-[1260px] border-t border-white/10 px-5 py-5 text-xs text-[#99a8bd] lg:px-0">Privacy • Terms • © {brand}</div>
    </footer>
  )
}
