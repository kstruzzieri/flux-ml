import { useEffect } from 'react'
import { DEFAULT_DETECTIONS, useAlertsStore } from '@stores/alertsStore'
import { useMetricsStore } from '@stores/metricsStore'
import { computeTrend, assessHealth } from '@utils/health'
import { MetricCard } from './MetricCard'
import { RewardHackStatusCard } from './RewardHackStatusCard'

interface MetricsGridProps {
  experimentId: string
}

const METRIC_CARDS = [
  { label: 'KL Divergence', name: 'kl' },
  { label: 'Learning Rate', name: 'learning_rate' },
  { label: 'Reward Variance', name: 'reward_variance' },
  { label: 'Policy Entropy', name: 'policy_entropy' },
] as const

export function MetricsGrid({ experimentId }: MetricsGridProps) {
  const latestMetrics = useMetricsStore((s) => s.latestMetrics[experimentId])
  const sparklineData = useMetricsStore((s) => s.sparklineData[experimentId])
  const detections = useAlertsStore((s) => s.detections[experimentId] ?? DEFAULT_DETECTIONS)
  const fetchLatestMetrics = useMetricsStore((s) => s.fetchLatestMetrics)
  const fetchSparklineData = useMetricsStore((s) => s.fetchSparklineData)
  const fetchDetections = useAlertsStore((s) => s.fetchDetections)

  useEffect(() => {
    fetchLatestMetrics(experimentId)
    fetchSparklineData(experimentId)
    fetchDetections(experimentId)
  }, [experimentId, fetchLatestMetrics, fetchSparklineData, fetchDetections])

  // Derive latest step from sparkline data
  let latestStep: number | null = null
  if (sparklineData) {
    for (const points of Object.values(sparklineData)) {
      for (const p of points) {
        if (latestStep === null || p.step > latestStep) latestStep = p.step
      }
    }
  }
  const detectionStep = detections.reduce<number | null>((max, detection) => {
    if (!detection.step) return max
    return max === null || detection.step > max ? detection.step : max
  }, null)

  return (
    <div className="metrics-grid" data-testid="metrics-grid">
      {METRIC_CARDS.map(({ label, name }) => {
        const value = latestMetrics?.[name] ?? null
        const points = sparklineData?.[name]
        const trend = points ? computeTrend(points) : 'insufficient'
        const health = assessHealth(name, trend)

        return (
          <MetricCard
            key={name}
            label={label}
            value={value}
            metricName={name}
            trend={trend}
            health={health}
            sparklinePoints={points}
          />
        )
      })}
      <RewardHackStatusCard detections={detections} step={detectionStep ?? latestStep} />
    </div>
  )
}
