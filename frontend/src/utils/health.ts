import type { Point } from '@utils/downsample'

export type Trend = 'up' | 'down' | 'flat' | 'insufficient'
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'none'

const FLAT_THRESHOLD = 0.01
const MIN_POINTS = 4

export function computeTrend(data: Point[]): Trend {
  if (data.length < MIN_POINTS) return 'insufficient'

  const mid = Math.floor(data.length / 2)
  const prevSlice = data.slice(0, mid)
  const recentSlice = data.slice(mid)

  const prevAvg = prevSlice.reduce((s, p) => s + p.value, 0) / prevSlice.length
  const recentAvg = recentSlice.reduce((s, p) => s + p.value, 0) / recentSlice.length

  const denom = Math.abs(prevAvg) > 1e-10 ? Math.abs(prevAvg) : 1
  const relativeChange = (recentAvg - prevAvg) / denom

  if (Math.abs(relativeChange) <= FLAT_THRESHOLD) return 'flat'
  return relativeChange > 0 ? 'up' : 'down'
}

type HealthRule = Record<Exclude<Trend, 'insufficient'>, HealthStatus>

const HEALTH_RULES: Record<string, HealthRule> = {
  loss: { down: 'healthy', flat: 'warning', up: 'critical' },
  reward: { up: 'healthy', flat: 'warning', down: 'critical' },
  kl: { flat: 'healthy', up: 'warning', down: 'healthy' },
  reward_variance: { flat: 'healthy', down: 'warning', up: 'healthy' },
  policy_entropy: { flat: 'healthy', down: 'warning', up: 'warning' },
}

export function assessHealth(metricName: string, trend: Trend): HealthStatus {
  if (trend === 'insufficient') return 'none'
  const rule = HEALTH_RULES[metricName]
  if (!rule) return 'none'
  return rule[trend]
}

interface RewardComponent {
  name: string
  value: number
}

const DIVERGENCE_RATIO = 2.0
const DIVERGENCE_MIN_SPREAD = 0.1

export function assessRewardDivergence(components: RewardComponent[]): HealthStatus {
  if (components.length === 0) return 'none'

  const absValues = components.map((c) => Math.abs(c.value))
  const maxAbs = Math.max(...absValues)
  const minAbs = Math.min(...absValues)
  const spread = maxAbs - minAbs

  if (spread < DIVERGENCE_MIN_SPREAD) return 'healthy'
  if (minAbs > 1e-10 && maxAbs / minAbs > DIVERGENCE_RATIO) return 'warning'

  return 'healthy'
}
