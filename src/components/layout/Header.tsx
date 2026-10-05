import { Button } from '../ui/Button'

export const Header = ({ locale }: { locale: 'vi' | 'en' }) => (
  <header className="relative z-20 border-b border-black/5 bg-white">
    <div className="mx-auto flex h-[82px] max-w-[1260px] items-center justify-between px-5 lg:px-0">
      <a href={locale === 'vi' ? '/landing-page' : '/en'} className="text-2xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">AUTOWASH247</a>
      <nav className="hidden items-center gap-9 md:flex">
        <a href="#dich-vu" className="text-sm font-medium">Dịch vụ</a>
        <a href="#cach-hoat-dong" className="text-sm font-medium">Cách hoạt động</a>
        <a href="#faq" className="text-sm font-medium">FAQ</a>
        <a href="#lien-he" className="text-sm font-medium">Liên hệ</a>
      </nav>
      <Button href="#dich-vu" className="hidden min-h-11 px-6 md:inline-flex">Rửa xe ngay</Button>
      <a href="#dich-vu" className="inline-flex rounded-full bg-[var(--color-brand-primary)] px-5 py-3 text-sm font-semibold text-white md:hidden">Rửa xe</a>
    </div>
  </header>
)
