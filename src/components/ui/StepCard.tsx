type Props = { number: string; title: string; description: string }
export const StepCard = ({ number, title, description }: Props) => (
  <article className="min-h-[220px] rounded-[18px] bg-[var(--color-surface-subtle)] p-6">
    <span className="text-sm font-bold text-[var(--color-brand-primary)]">{number}</span>
    <h3 className="mt-8 text-[22px] font-bold text-[var(--color-text-primary)]">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{description}</p>
  </article>
)
