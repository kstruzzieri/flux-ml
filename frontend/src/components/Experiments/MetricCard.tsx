import { formatMetricValue } from '@utils/formatting'
import type { Trend, HealthStatus } from '@utils/health'
import './MetricCard.css'

interface MetricCardProps {
  label: string
  value: number | null | undefined
  metricName: string
  trend: Trend
  health: HealthStatus
}

const TREND_ARROWS: Record<Exclude<Trend, 'insufficient'>, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
}

export function MetricCard({ label, value, metricName, trend, health }: MetricCardProps) {
  const healthClass = health !== 'none' ? `metric-card--${health}` : ''
  const trendColorClass =
    trend !== 'insufficient' && health !== 'none' ? `metric-card__trend--${health}` : ''

  return (
    <div className={`metric-card ${healthClass}`} aria-label={`${label}: ${health} status`}>
      {health !== 'none' && (
        <span className={`metric-card__health-dot metric-card__health-dot--${health}`} />
      )}
      <span className="metric-card__label">{label}</span>
      <span className="metric-card__value">{formatMetricValue(metricName, value)}</span>
      {trend !== 'insufficient' && (
        <span
          className={`metric-card__trend ${trendColorClass}`}
          data-testid="trend-indicator"
          aria-label={`Trend: ${trend}`}
        >
          {TREND_ARROWS[trend]}
        </span>
      )}
    </div>
  )
}
