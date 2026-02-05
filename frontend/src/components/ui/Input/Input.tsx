import './Input.css'

export interface InputProps {
  placeholder?: string
  icon?: React.ReactNode
  error?: boolean
  value?: string
  disabled?: boolean
  type?: string
  name?: string
  id?: string
  className?: string
  onChange?: (value: string) => void
}

export function Input({
  placeholder,
  icon,
  error,
  value,
  disabled,
  type = 'text',
  name,
  id,
  className: customClassName,
  onChange,
}: InputProps) {
  const wrapperClasses = ['input-wrapper', icon && 'input-wrapper--with-icon']
    .filter(Boolean)
    .join(' ')

  const inputClasses = ['input', error && 'input--error', customClassName].filter(Boolean).join(' ')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <div className={wrapperClasses}>
      {icon && <span className="input__icon">{icon}</span>}
      <input
        className={inputClasses}
        type={type}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        name={name}
        id={id}
        onChange={handleChange}
      />
    </div>
  )
}
