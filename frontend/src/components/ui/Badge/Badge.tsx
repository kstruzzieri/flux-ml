import './Badge.css'

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'muted'
  className?: string
  children: React.ReactNode
}

export function Badge({ variant = 'default', className: customClassName, children }: BadgeProps) {
  const className = ['badge', `badge--${variant}`, customClassName].filter(Boolean).join(' ')

  return <span className={className}>{children}</span>
}
