import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx(
      'bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700/60 shadow-sm',
      className
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={clsx(
      'px-6 py-4 border-b border-gray-100 dark:border-slate-700/60',
      className
    )}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: CardProps) {
  return (
    <div className={clsx('px-6 py-4', className)}>
      {children}
    </div>
  )
}
