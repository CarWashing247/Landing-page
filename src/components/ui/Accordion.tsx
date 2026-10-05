type Item = { question: string; answer: string }
export const Accordion = ({ items }: { items: Item[] }) => (
  <div className="space-y-2.5">
    {items.map((item) => (
      <details key={item.question} className="group rounded-[10px] border border-[var(--color-border-default)] bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-[15px] font-semibold text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
          {item.question}<span className="text-[22px] font-normal text-[var(--color-brand-primary)] transition-transform group-open:rotate-45">+</span>
        </summary>
        <p className="px-6 pb-5 text-sm leading-6 text-[var(--color-text-muted)]">{item.answer}</p>
      </details>
    ))}
  </div>
)
