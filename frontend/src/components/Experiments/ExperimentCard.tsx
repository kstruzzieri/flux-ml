import { memo } from 'react'
import { formatDuration } from '@utils/formatting'
import type { experiment } from '../../../wailsjs/go/models'
import './ExperimentCard.css'

interface ExperimentCardProps {
  experiment: experiment.Experiment
  isActive: boolean
  onSelect: (id: string) => void
}

const STATUS_LABELS: Record<string, string> = {
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  pending: 'Pending',
}

function ExperimentCardInner({ experiment: exp, isActive, onSelect }: ExperimentCardProps) {
  const statusLabel = STATUS_LABELS[exp.status] || exp.status
  const duration = formatDuration(exp.createdAt, exp.updatedAt, exp.status)

  const className = ['experiment-item', isActive && 'experiment-item--active']
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={className}
      onClick={() => onSelect(exp.id)}
      aria-label={`${exp.name}, ${statusLabel}`}
    >
      <div className="experiment-item__row">
        <span
          className={`experiment-item__status experiment-item__status--${exp.status}`}
          title={statusLabel}
          aria-label={statusLabel}
        />
        <span className="experiment-item__name">{exp.name}</span>
        <span className="experiment-item__duration">{duration}</span>
      </div>
    </button>
  )
}

export const ExperimentCard = memo(ExperimentCardInner, (prev, next) => {
  return (
    prev.experiment.id === next.experiment.id &&
    prev.experiment.status === next.experiment.status &&
    prev.experiment.updatedAt === next.experiment.updatedAt &&
    prev.isActive === next.isActive
  )
})
