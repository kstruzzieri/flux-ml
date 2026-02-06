import { SVGProps } from 'react'

export type IconSize = 'sm' | 'md' | 'lg'

export interface IconProps extends SVGProps<SVGSVGElement> {
  /** Icon size variant: sm (16px), md (18px), lg (24px) */
  size?: IconSize
  /** Accessible label - when provided, icon becomes accessible with role="img" */
  label?: string
  /** Additional CSS class */
  className?: string
}
