import { clsx } from 'clsx'

type BadgeVariant = 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

/* Claude-style: warm/muted tones, no harsh saturation */
const variants: Record<BadgeVariant, string> = {
  gray:   'bg-[#f0ece6] text-[#5a5a5a]',
  blue:   'bg-[#eef2ff] text-[#4338ca]',
  green:  'bg-[#ecfdf5] text-[#065f46]',
  yellow: 'bg-[#fffbeb] text-[#92400e]',
  red:    'bg-[#fff1f2] text-[#9f1239]',
  purple: 'bg-[#f5f3ff] text-[#5b21b6]',
  orange: 'bg-[#fff7ed] text-[#b45309]',
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[11.5px] font-semibold tracking-tight',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
