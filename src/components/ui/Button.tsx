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
        'inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl',
        'transition-all duration-150 cursor-pointer',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#007bff]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        size === 'sm' ? 'px-3 py-1.5 text-xs min-h-[30px]' : 'px-4 py-2 text-[13px] min-h-[38px]',
        variant === 'primary'   && 'btn-brand',
        variant === 'secondary' && 'bg-white text-[#374151] border border-[#e5e9f0] hover:bg-[#f4f6f9] hover:border-[#d3d9e4] shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
        variant === 'ghost'     && 'text-[#6b7280] hover:bg-[#f4f6f9] hover:text-[#111827]',
        variant === 'danger'    && 'bg-red-600 text-white hover:bg-red-700 shadow-[0_2px_8px_rgba(220,38,38,0.25)]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
