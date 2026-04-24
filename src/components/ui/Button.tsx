import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg',
        'transition-all duration-150 cursor-pointer',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--orange)]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        size === 'sm' ? 'px-3 py-1.5 text-xs min-h-[30px]' : 'px-4 py-2 text-[13px] min-h-[36px]',
        variant === 'primary'   && 'btn-brand',
        variant === 'secondary' && [
          'border text-[var(--t2)] hover:text-[var(--t1)]',
          'bg-[var(--surface)] hover:bg-[var(--surface-2)]',
          'border-[var(--border)] hover:border-[var(--border-strong)]',
          'shadow-[var(--shadow-xs)]',
        ],
        variant === 'ghost'  && 'text-[var(--t2)] hover:bg-[var(--surface-2)] hover:text-[var(--t1)]',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 shadow-[0_2px_8px_rgba(220,38,38,0.22)]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
