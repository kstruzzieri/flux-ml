import { formatMetricValue } from '@utils/formatting'
import type { Point } from '@utils/downsample'
import type { Trend, HealthStatus } from '@utils/health'
import './MetricCard.css'

interface MetricCardProps {
  label: string
  value: number | null | undefined
  metricName: string
  trend: Trend
  health: HealthStatus
  sparklinePoints?: Point[]
}

const TREND_ARROWS: Record<Exclude<Trend, 'insufficient'>, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
}

function computePercentChange(
  startValue: number,
  currentValue: number | null | undefined
): string | null {
  if (currentValue == null || Math.abs(startValue) < 1e-10) return null
  const pct = ((currentValue - startValue) / Math.abs(startValue)) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

function buildSparklinePath(points: Point[], width: number, height: number): string {
  if (points.length < 2) return ''

  const steps = points.map((p) => p.step)
  const values = points.map((p) => p.value)
  const minStep = Math.min(...steps)
  const maxStep = Math.max(...steps)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)

  const stepRange = maxStep - minStep || 1
  const valRange = maxVal - minVal || 1
  const padding = 2

  return points
    .map((p, i) => {
      const x = ((p.step - minStep) / stepRange) * width
      const y = padding + ((maxVal - p.value) / valRange) * (height - padding * 2)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export function MetricCard({
  label,
  value,
  metricName,
  trend,
  health,
  sparklinePoints,
}: MetricCardProps) {
  const healthClass = health !== 'none' ? `metric-card--${health}` : ''
  const trendColorClass =
    trend !== 'insufficient' && health !== 'none' ? `metric-card__trend--${health}` : ''

  const startValue = sparklinePoints && sparklinePoints.length > 0 ? sparklinePoints[0].value : null
  const percentChange = startValue != null ? computePercentChange(startValue, value) : null

  return (
    <div className={`metric-card ${healthClass}`} aria-label={`${label}: ${health} status`}>
      {health !== 'none' && (
        <span className={`metric-card__health-dot metric-card__health-dot--${health}`} />
      )}
      <div className="metric-card__header">
        <span className="metric-card__label">{label}</span>
        {trend !== 'insufficient' && (
          <span
            className={`metric-card__trend ${trendColorClass}`}
            data-testid="trend-indicator"
            aria-label={`Trend: ${trend}`}
          >
            {TREND_ARROWS[trend]} {percentChange}
          </span>
        )}
      </div>
      <span className="metric-card__value">{formatMetricValue(metricName, value)}</span>
      {startValue != null && (
        <span className="metric-card__subtitle" data-testid="metric-subtitle">
          from {formatMetricValue(metricName, startValue)} at start
        </span>
      )}
      {sparklinePoints && sparklinePoints.length >= 2 && (
        <svg
          className="metric-card__sparkline"
          data-testid="metric-sparkline"
          viewBox="0 0 100 32"
          preserveAspectRatio="none"
        >
          <path
            d={buildSparklinePath(sparklinePoints, 100, 32)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  )
}
