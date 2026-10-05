export const Badge = ({ children, dark = false }: { children: string; dark?: boolean }) => (
  <span className={dark ? 'text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--color-brand-accent)]' : 'text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--color-brand-primary)]'}>{children}</span>
)
