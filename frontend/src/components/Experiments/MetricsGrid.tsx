import { useEffect } from 'react'
import { useMetricsStore } from '@stores/metricsStore'
import { computeTrend, assessHealth } from '@utils/health'
import { MetricCard } from './MetricCard'
import { RewardComponentsCard } from './RewardComponentsCard'

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
      <RewardComponentsCard components={latestRewardSignals ?? []} />
    </div>
  )
}
