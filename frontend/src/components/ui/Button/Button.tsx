import './Button.css'

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  className: customClassName,
  children,
  onClick,
}: ButtonProps) {
  const className = ['button', `button--${variant}`, `button--${size}`, customClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={className} disabled={disabled} type={type} onClick={onClick}>
      {children}
    </button>
  )
}
