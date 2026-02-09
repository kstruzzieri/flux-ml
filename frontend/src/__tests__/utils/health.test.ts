import { computeTrend, assessHealth, assessRewardDivergence, deriveDetections } from '@utils/health'
import type { Point } from '@utils/downsample'

describe('computeTrend', () => {
  it('returns "insufficient" when data has fewer than 4 points', () => {
    const data: Point[] = [
      { step: 1, value: 1.0 },
      { step: 2, value: 0.9 },
    ]
    expect(computeTrend(data)).toBe('insufficient')
  })

  it('returns "down" when recent average is lower than previous average', () => {
    const data: Point[] = Array.from({ length: 20 }, (_, i) => ({
      step: i + 1,
      value: i < 10 ? 2.0 : 1.0,
    }))
    expect(computeTrend(data)).toBe('down')
  })

  it('returns "up" when recent average is higher than previous average', () => {
    const data: Point[] = Array.from({ length: 20 }, (_, i) => ({
      step: i + 1,
      value: i < 10 ? 1.0 : 2.0,
    }))
    expect(computeTrend(data)).toBe('up')
  })

  it('returns "flat" when averages are within 1% of each other', () => {
    const data: Point[] = Array.from({ length: 20 }, (_, i) => ({
      step: i + 1,
      value: 1.0,
    }))
    expect(computeTrend(data)).toBe('flat')
  })
})

describe('assessHealth', () => {
  it('returns "healthy" for decreasing loss', () => {
    expect(assessHealth('loss', 'down')).toBe('healthy')
  })

  it('returns "warning" for flat loss', () => {
    expect(assessHealth('loss', 'flat')).toBe('warning')
  })

  it('returns "critical" for increasing loss', () => {
    expect(assessHealth('loss', 'up')).toBe('critical')
  })

  it('returns "healthy" for increasing reward', () => {
    expect(assessHealth('reward', 'up')).toBe('healthy')
  })

  it('returns "critical" for decreasing reward', () => {
    expect(assessHealth('reward', 'down')).toBe('critical')
  })

  it('returns "healthy" for stable kl', () => {
    expect(assessHealth('kl', 'flat')).toBe('healthy')
  })

  it('returns "warning" for increasing kl', () => {
    expect(assessHealth('kl', 'up')).toBe('warning')
  })

  it('returns "none" for insufficient data', () => {
    expect(assessHealth('loss', 'insufficient')).toBe('none')
  })

  it('returns "none" for metrics without health rules (e.g., learning_rate)', () => {
    expect(assessHealth('learning_rate', 'up')).toBe('none')
  })

  it('returns "warning" for decreasing reward_variance', () => {
    expect(assessHealth('reward_variance', 'down')).toBe('warning')
  })

  it('returns "healthy" for stable reward_variance', () => {
    expect(assessHealth('reward_variance', 'flat')).toBe('healthy')
  })

  it('returns "warning" for decreasing policy_entropy', () => {
    expect(assessHealth('policy_entropy', 'down')).toBe('warning')
  })

  it('returns "warning" for increasing policy_entropy', () => {
    expect(assessHealth('policy_entropy', 'up')).toBe('warning')
  })

  it('returns "healthy" for stable policy_entropy', () => {
    expect(assessHealth('policy_entropy', 'flat')).toBe('healthy')
  })
})

describe('assessRewardDivergence', () => {
  it('returns "none" when components array is empty', () => {
    expect(assessRewardDivergence([])).toBe('none')
  })

  it('returns "healthy" when components are balanced', () => {
    const components = [
      { name: 'helpfulness', value: 0.8 },
      { name: 'harmlessness', value: 0.7 },
      { name: 'honesty', value: 0.75 },
    ]
    expect(assessRewardDivergence(components)).toBe('healthy')
  })

  it('returns "warning" when one component is >2x another AND spread > 0.1', () => {
    const components = [
      { name: 'helpfulness', value: 0.8 },
      { name: 'harmlessness', value: 0.3 },
      { name: 'honesty', value: 0.7 },
    ]
    expect(assessRewardDivergence(components)).toBe('warning')
  })

  it('returns "healthy" when ratio exceeds 2x but spread is under 0.1', () => {
    const components = [
      { name: 'helpfulness', value: 0.06 },
      { name: 'harmlessness', value: 0.02 },
      { name: 'honesty', value: 0.05 },
    ]
    expect(assessRewardDivergence(components)).toBe('healthy')
  })

  it('returns "warning" when negative values diverge beyond threshold', () => {
    const components = [
      { name: 'helpfulness', value: -0.8 },
      { name: 'harmlessness', value: -0.3 },
      { name: 'honesty', value: -0.7 },
    ]
    expect(assessRewardDivergence(components)).toBe('warning')
  })

  it('returns "healthy" for a single component', () => {
    const components = [{ name: 'helpfulness', value: 0.8 }]
    expect(assessRewardDivergence(components)).toBe('healthy')
  })
})

describe('deriveDetections', () => {
  const balanced = [
    { name: 'helpfulness', value: 0.8 },
    { name: 'harmlessness', value: 0.7 },
    { name: 'honesty', value: 0.75 },
  ]

  it('returns all clear when trends are healthy', () => {
    const results = deriveDetections(
      { kl: 'flat', reward: 'up', reward_variance: 'flat', policy_entropy: 'flat' },
      balanced
    )
    expect(results.every((r) => r.status === 'clear')).toBe(true)
  })

  it('elevates sycophancy when KL rising and entropy dropping', () => {
    const results = deriveDetections(
      { kl: 'up', policy_entropy: 'down', reward: 'flat', reward_variance: 'flat' },
      balanced
    )
    const syc = results.find((r) => r.pattern === 'Sycophancy')
    expect(syc?.status).toBe('elevated')
  })

  it('sets KL drift to monitoring when KL is rising', () => {
    const results = deriveDetections(
      { kl: 'up', policy_entropy: 'flat', reward: 'flat', reward_variance: 'flat' },
      balanced
    )
    const kl = results.find((r) => r.pattern === 'KL Drift')
    expect(kl?.status).toBe('monitoring')
  })

  it('elevates length gaming when reward up and variance down', () => {
    const results = deriveDetections(
      { kl: 'flat', reward: 'up', reward_variance: 'down', policy_entropy: 'flat' },
      balanced
    )
    const lg = results.find((r) => r.pattern === 'Length Gaming')
    expect(lg?.status).toBe('elevated')
  })

  it('elevates reward collapse when variance down and components diverge', () => {
    const diverged = [
      { name: 'helpfulness', value: 0.8 },
      { name: 'harmlessness', value: 0.3 },
      { name: 'honesty', value: 0.7 },
    ]
    const results = deriveDetections(
      { kl: 'flat', reward: 'flat', reward_variance: 'down', policy_entropy: 'flat' },
      diverged
    )
    const rc = results.find((r) => r.pattern === 'Reward Collapse')
    expect(rc?.status).toBe('elevated')
  })

  it('handles missing trends gracefully', () => {
    const results = deriveDetections({}, [])
    expect(results).toHaveLength(4)
    expect(results.every((r) => r.status === 'clear')).toBe(true)
  })
})
