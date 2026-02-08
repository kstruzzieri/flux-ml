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
  const trendClass = trend !== 'insufficient' ? `metric-card__trend--${trend}` : ''

  return (
    <div className={`metric-card ${healthClass}`}>
      <span className="metric-card__label">{label.toUpperCase()}</span>
      <span className="metric-card__value">{formatMetricValue(metricName, value)}</span>
      {trend !== 'insufficient' && (
        <span className={`metric-card__trend ${trendClass}`} data-testid="trend-indicator">
          {TREND_ARROWS[trend]}
        </span>
      )}
    </div>
  )
}
