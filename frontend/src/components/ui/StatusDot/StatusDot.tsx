import type { ExperimentStatus } from '@utils/formatting'
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

export function StatusDot({ status, size = 'md', className }: StatusDotProps) {
  const classes = [
    'status-dot',
    `status-dot--${status}`,
    `status-dot--${size}`,
    status === 'running' && 'status-dot--pulse',
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
    />
  )
}
