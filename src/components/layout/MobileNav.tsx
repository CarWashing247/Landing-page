'use client'

import { useState } from 'react'

export const MobileNav = () => {
  const [open, setOpen] = useState(false)
  return (
    <div className="md:hidden">
      <button type="button" aria-label="Mở menu" onClick={() => setOpen((value) => !value)} className="rounded-full border border-[var(--color-border-default)] px-4 py-2 text-sm font-semibold">
        Menu
      </button>
      {open && (
        <div className="absolute inset-x-0 top-[82px] border-b border-[var(--color-border-default)] bg-white p-5 shadow-lg">
          <nav className="flex flex-col gap-5 text-sm font-semibold">
            <a href="#dich-vu" onClick={() => setOpen(false)}>Dịch vụ</a>
            <a href="#cach-hoat-dong" onClick={() => setOpen(false)}>Cách hoạt động</a>
            <a href="#faq" onClick={() => setOpen(false)}>FAQ</a>
            <a href="#lien-he" onClick={() => setOpen(false)}>Liên hệ</a>
          </nav>
        </div>
      )}
    </div>
  )
}
