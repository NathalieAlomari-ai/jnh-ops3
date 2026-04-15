import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
        size === 'sm' ? 'px-3 py-1.5 text-sm min-h-[36px]' : 'px-4 py-2 text-sm min-h-[40px]',
        variant === 'primary'   && 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
        variant === 'secondary' && 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100',
        variant === 'ghost'     && 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
        variant === 'danger'    && 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

