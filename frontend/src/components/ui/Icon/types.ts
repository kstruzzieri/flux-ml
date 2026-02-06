import type { SVGProps } from 'react'

/** Named size variants that map to CSS classes */
export type IconSize = 'sm' | 'md' | 'lg'

export interface IconProps extends SVGProps<SVGSVGElement> {
  /** Icon size - named variants (sm/md/lg) apply CSS classes; string/number values pass through for library compatibility */
  size?: IconSize | (string & {}) | number
  /** Accessible label - when provided, icon becomes accessible with role="img" */
  label?: string
  /** Additional CSS class */
  className?: string
}
