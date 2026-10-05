import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'light'
  href?: string
}

export const Button = ({ children, variant = 'primary', href, className = '', ...props }: Props) => {
  const styles = {
    primary: 'bg-[var(--color-brand-primary)] text-white hover:opacity-90',
    secondary: 'bg-[var(--color-surface-dark)] text-white hover:bg-[#252e3c]',
    light: 'bg-white text-[var(--color-text-primary)] hover:bg-white/90',
  }[variant]
  const classes = 'inline-flex min-h-[54px] items-center justify-center rounded-full px-7 text-[15px] font-semibold transition-opacity ' + styles + ' ' + className

  if (href) return <a href={href} className={classes}>{children}</a>
  return <button className={classes} {...props}>{children}</button>
}
