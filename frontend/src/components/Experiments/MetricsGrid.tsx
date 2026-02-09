import { useEffect } from 'react'
import { useMetricsStore } from '@stores/metricsStore'
import { computeTrend, assessHealth, deriveDetections } from '@utils/health'
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
  const latestRewardSignals = useMetricsStore((s) => s.latestRewardSignals[experimentId])
  const fetchLatestMetrics = useMetricsStore((s) => s.fetchLatestMetrics)
  const fetchSparklineData = useMetricsStore((s) => s.fetchSparklineData)
  const fetchLatestRewardSignals = useMetricsStore((s) => s.fetchLatestRewardSignals)

  useEffect(() => {
    fetchLatestMetrics(experimentId)
    fetchSparklineData(experimentId)
    fetchLatestRewardSignals(experimentId)
  }, [experimentId, fetchLatestMetrics, fetchSparklineData, fetchLatestRewardSignals])

  // Compute trends for cross-metric detection
  const trends = {
    kl: sparklineData?.kl ? computeTrend(sparklineData.kl) : undefined,
    reward: sparklineData?.reward ? computeTrend(sparklineData.reward) : undefined,
    reward_variance: sparklineData?.reward_variance
      ? computeTrend(sparklineData.reward_variance)
      : undefined,
    policy_entropy: sparklineData?.policy_entropy
      ? computeTrend(sparklineData.policy_entropy)
      : undefined,
  }

  const rewardComponents = (latestRewardSignals ?? []).map((s) => ({
    name: s.component,
    value: s.value,
  }))

  const detections = deriveDetections(trends, rewardComponents)

  // Derive latest step from sparkline data
  let latestStep: number | null = null
  if (sparklineData) {
    for (const points of Object.values(sparklineData)) {
      for (const p of points) {
        if (latestStep === null || p.step > latestStep) latestStep = p.step
      }
    }
  }

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
      <RewardHackStatusCard detections={detections} step={latestStep} />
    </div>
  )
}
