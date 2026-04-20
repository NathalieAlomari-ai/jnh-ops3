import { clsx } from 'clsx'

type BadgeVariant = 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  gray:   'bg-[#f0f2f5] text-[#4b5563]',
  blue:   'bg-[#e8f3ff] text-[#1a6fd4]',
  green:  'bg-[#e8f8f0] text-[#0e7a4e]',
  yellow: 'bg-[#fefce8] text-[#92670a]',
  red:    'bg-[#fff1f2] text-[#be123c]',
  purple: 'bg-[#f5f0ff] text-[#6d28d9]',
  orange: 'bg-[#fff7ed] text-[#c2460a]',
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-lg text-[11.5px] font-semibold tracking-tight',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
