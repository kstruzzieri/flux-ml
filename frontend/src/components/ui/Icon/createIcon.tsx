import { forwardRef } from 'react'
import type { IconProps } from './types'
import './Icon.css'

interface CreateIconOptions {
  /** Display name for the component */
  displayName: string
  /** Additional CSS class for the icon type (e.g., 'icon--python') */
  iconClass?: string
  /** Default viewBox, defaults to "0 0 24 24" */
  viewBox?: string
}

/**
 * Factory function to create icon components with consistent behavior.
 * All icons share the same base props and accessibility handling.
 */
export function createIcon(path: React.ReactNode, options: CreateIconOptions) {
  const { displayName, iconClass, viewBox = '0 0 24 24' } = options

  const Icon = forwardRef<SVGSVGElement, IconProps>(({ size, label, className, ...props }, ref) => {
    const classes = [
      'icon',
      typeof size === 'string' && ['sm', 'md', 'lg'].includes(size) && `icon--${size}`,
      iconClass,
      className,
    ]
      .filter(Boolean)
      .join(' ')

    const accessibilityProps = label
      ? { role: 'img' as const, 'aria-label': label }
      : { 'aria-hidden': true as const }

    return (
      <svg
        ref={ref}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={classes}
        {...accessibilityProps}
        {...props}
      >
        {path}
      </svg>
    )
  })

  Icon.displayName = displayName
  return Icon
}

/**
 * Factory for filled icons (file type icons with custom fills).
 * These icons use fill instead of stroke.
 */
export function createFilledIcon(path: React.ReactNode, options: CreateIconOptions) {
  const { displayName, iconClass, viewBox = '0 0 24 24' } = options

  const Icon = forwardRef<SVGSVGElement, IconProps>(({ size, label, className, ...props }, ref) => {
    const classes = [
      'icon',
      typeof size === 'string' && ['sm', 'md', 'lg'].includes(size) && `icon--${size}`,
      iconClass,
      className,
    ]
      .filter(Boolean)
      .join(' ')

    const accessibilityProps = label
      ? { role: 'img' as const, 'aria-label': label }
      : { 'aria-hidden': true as const }

    return (
      <svg ref={ref} viewBox={viewBox} className={classes} {...accessibilityProps} {...props}>
        {path}
      </svg>
    )
  })

  Icon.displayName = displayName
  return Icon
}
