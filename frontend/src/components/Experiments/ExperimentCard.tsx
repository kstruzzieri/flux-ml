import { memo } from 'react'
import { formatDuration, formatMetricValue, type ExperimentStatus } from '@utils/formatting'
import { StatusDot } from '../ui/StatusDot/StatusDot'
import type { experiment } from '../../../wailsjs/go/models'
import './ExperimentCard.css'

interface ExperimentCardProps {
  experiment: experiment.Experiment
  isActive: boolean
  onSelect: (id: string) => void
  loss?: number | null
  reward?: number | null
}

const STATUS_LABELS: Record<ExperimentStatus, string> = {
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  pending: 'Pending',
}

const VALID_STATUSES = new Set<string>(Object.keys(STATUS_LABELS))

function ExperimentCardInner({
  experiment: exp,
  isActive,
  onSelect,
  loss,
  reward,
}: ExperimentCardProps) {
  const status = VALID_STATUSES.has(exp.status) ? (exp.status as ExperimentStatus) : 'pending'
  const statusLabel = STATUS_LABELS[status]
  const duration = formatDuration(exp.createdAt, exp.updatedAt, status)

  const className = ['exp-card', isActive && 'exp-card--active'].filter(Boolean).join(' ')

  return (
    <button
      className={className}
      onClick={() => onSelect(exp.id)}
      aria-label={`${exp.name}, ${statusLabel}`}
    >
      <div className="exp-card__row">
        <StatusDot status={status} />
        <span className="exp-card__name">{exp.name}</span>
        <span className="exp-card__duration">{duration}</span>
      </div>
      <div className="exp-card__metrics" data-testid="metrics-row">
        <span className="exp-card__metric">
          <span className="exp-card__metric-label">loss</span>
          <span className="exp-card__metric-value">{formatMetricValue('loss', loss)}</span>
        </span>
        <span className="exp-card__metric">
          <span className="exp-card__metric-label">reward</span>
          <span className="exp-card__metric-value">{formatMetricValue('reward', reward)}</span>
        </span>
      </div>
    </button>
  )
}

export const ExperimentCard = memo(ExperimentCardInner, (prev, next) => {
  return (
    prev.experiment.id === next.experiment.id &&
    prev.experiment.name === next.experiment.name &&
    prev.experiment.status === next.experiment.status &&
    prev.experiment.updatedAt === next.experiment.updatedAt &&
    prev.isActive === next.isActive &&
    prev.loss === next.loss &&
    prev.reward === next.reward
  )
})
ExperimentCard.displayName = 'ExperimentCard'
