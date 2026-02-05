import './Card.css'

export interface CardProps {
  accentColor?: string
  alert?: boolean
  hoverable?: boolean
  className?: string
  children: React.ReactNode
}

export function Card({ accentColor, alert, hoverable, className, children }: CardProps) {
  const classes = [
    'card',
    accentColor && 'card--accent',
    alert && 'card--alert',
    hoverable && 'card--hoverable',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const style = accentColor
    ? ({ '--card-accent-color': accentColor } as React.CSSProperties)
    : undefined

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  )
}
