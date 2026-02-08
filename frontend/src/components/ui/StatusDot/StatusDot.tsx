import type { LucideIcon } from 'lucide-react'
import type { ExperimentStatus } from '@utils/formatting'
import {
  StatusRunningIcon,
  StatusCompletedIcon,
  StatusFailedIcon,
  StatusPendingIcon,
} from '../Icon/icons'
import './StatusDot.css'

interface StatusDotProps {
  status: ExperimentStatus
  size?: 'sm' | 'md'
  className?: string
}

const STATUS_LABELS: Record<ExperimentStatus, string> = {
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  pending: 'Pending',
}

const STATUS_ICONS: Record<ExperimentStatus, LucideIcon> = {
  running: StatusRunningIcon,
  completed: StatusCompletedIcon,
  failed: StatusFailedIcon,
  pending: StatusPendingIcon,
}

const SIZE_PX: Record<'sm' | 'md', number> = {
  sm: 12,
  md: 14,
}

export function StatusDot({ status, size = 'md', className }: StatusDotProps) {
  const Icon = STATUS_ICONS[status]

  const classes = [
    'status-dot',
    `status-dot--${status}`,
    `status-dot--${size}`,
    status === 'running' && 'status-dot--spin',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      className={classes}
      role="img"
      aria-label={STATUS_LABELS[status]}
      title={STATUS_LABELS[status]}
    >
      <Icon size={SIZE_PX[size]} />
    </span>
  )
}
