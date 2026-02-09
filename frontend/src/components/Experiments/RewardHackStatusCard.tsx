import { formatStepCount } from '@utils/formatting'
import './RewardHackStatusCard.css'

export type DetectionLevel = 'clear' | 'monitoring' | 'elevated' | 'detected'

export interface DetectionStatus {
  pattern: string
  status: DetectionLevel
  confidence: number | null
}

interface RewardHackStatusCardProps {
  detections: DetectionStatus[]
  step?: number | null
}

const STATUS_LABELS: Record<DetectionLevel, string> = {
  clear: 'No signal',
  monitoring: 'Monitoring',
  elevated: 'Elevated',
  detected: 'Detected',
}

const STATUS_DOT_CLASS: Record<DetectionLevel, string> = {
  clear: 'hack-row__dot--clear',
  monitoring: 'hack-row__dot--monitoring',
  elevated: 'hack-row__dot--elevated',
  detected: 'hack-row__dot--detected',
}

function deriveCardHealth(detections: DetectionStatus[]): string {
  if (detections.some((d) => d.status === 'detected')) return 'metric-card--critical'
  if (detections.some((d) => d.status === 'elevated' || d.status === 'monitoring'))
    return 'metric-card--warning'
  return 'metric-card--healthy'
}

function deriveSummary(detections: DetectionStatus[]): string {
  const active = detections.filter((d) => d.status !== 'clear').length
  if (active === 0) return 'All clear'
  return `${active} pattern${active > 1 ? 's' : ''} under observation`
}

export function RewardHackStatusCard({ detections, step }: RewardHackStatusCardProps) {
  const healthClass = deriveCardHealth(detections)

  return (
    <div className={`metric-card hack-status-card ${healthClass}`}>
      <div className="hack-status-card__header">
        <span className="metric-card__label">Reward Hack Detection</span>
        {step != null && step > 0 && (
          <span className="hack-status-card__step">Step {formatStepCount(step)}</span>
        )}
      </div>
      <div className="hack-status-card__rows">
        {detections.map((d) => (
          <div key={d.pattern} className="hack-row" data-testid="detection-row">
            <span className={`hack-row__dot ${STATUS_DOT_CLASS[d.status]}`} />
            <span className="hack-row__pattern">{d.pattern}</span>
            <span className={`hack-row__status hack-row__status--${d.status}`}>
              {STATUS_LABELS[d.status]}
            </span>
            <span className="hack-row__confidence" data-testid="detection-confidence">
              {d.confidence != null ? d.confidence.toFixed(2) : '\u2014'}
            </span>
          </div>
        ))}
      </div>
      <div className="hack-status-card__footer" data-testid="hack-summary">
        {deriveSummary(detections)}
      </div>
    </div>
  )
}
