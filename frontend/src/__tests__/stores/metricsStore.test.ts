import { act } from '@testing-library/react'
import { useMetricsStore, __resetMetricsStore } from '@stores/metricsStore'
import { __resetMockState } from '../../__mocks__/wailsjs/go/main/App'
import { metrics } from '../../__mocks__/wailsjs/go/models'
import { RecordMetrics, RecordRewardSignals } from '../../__mocks__/wailsjs/go/main/App'

beforeEach(() => {
  __resetMockState()
  __resetMetricsStore()
})

describe('useMetricsStore', () => {
  it('fetchLatestMetrics populates state for an experiment', async () => {
    await RecordMetrics('exp-1', [
      new metrics.Metric({
        experiment_id: 'exp-1',
        step: 1,
        name: 'loss',
        value: 2.5,
        timestamp: 1000,
      }),
      new metrics.Metric({
        experiment_id: 'exp-1',
        step: 5,
        name: 'loss',
        value: 0.3,
        timestamp: 5000,
      }),
      new metrics.Metric({
        experiment_id: 'exp-1',
        step: 3,
        name: 'reward',
        value: 0.7,
        timestamp: 3000,
      }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchLatestMetrics('exp-1')
    })

    const metricMap = useMetricsStore.getState().latestMetrics['exp-1']
    expect(metricMap).toBeDefined()
    expect(metricMap['loss']).toBe(0.3)
    expect(metricMap['reward']).toBe(0.7)
  })

  it('returns empty object for experiment with no metrics', async () => {
    await act(async () => {
      await useMetricsStore.getState().fetchLatestMetrics('exp-no-data')
    })

    const metricMap = useMetricsStore.getState().latestMetrics['exp-no-data']
    expect(metricMap).toEqual({})
  })

  it('fetchAllLatestMetrics fetches for multiple experiments', async () => {
    await RecordMetrics('exp-a', [
      new metrics.Metric({
        experiment_id: 'exp-a',
        step: 1,
        name: 'loss',
        value: 1.0,
        timestamp: 1000,
      }),
    ])
    await RecordMetrics('exp-b', [
      new metrics.Metric({
        experiment_id: 'exp-b',
        step: 1,
        name: 'loss',
        value: 2.0,
        timestamp: 1000,
      }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchAllLatestMetrics(['exp-a', 'exp-b'])
    })

    expect(useMetricsStore.getState().latestMetrics['exp-a']['loss']).toBe(1.0)
    expect(useMetricsStore.getState().latestMetrics['exp-b']['loss']).toBe(2.0)
  })

  it('fetchSparklineData populates state for an experiment', async () => {
    await RecordMetrics('exp-1', [
      new metrics.Metric({
        experiment_id: 'exp-1',
        step: 1,
        name: 'loss',
        value: 2.5,
        timestamp: 1000,
      }),
      new metrics.Metric({
        experiment_id: 'exp-1',
        step: 2,
        name: 'loss',
        value: 1.8,
        timestamp: 2000,
      }),
      new metrics.Metric({
        experiment_id: 'exp-1',
        step: 3,
        name: 'loss',
        value: 0.9,
        timestamp: 3000,
      }),
      new metrics.Metric({
        experiment_id: 'exp-1',
        step: 1,
        name: 'reward',
        value: 0.1,
        timestamp: 1000,
      }),
      new metrics.Metric({
        experiment_id: 'exp-1',
        step: 2,
        name: 'reward',
        value: 0.5,
        timestamp: 2000,
      }),
    ])
    await act(async () => {
      await useMetricsStore.getState().fetchSparklineData('exp-1')
    })
    const sparkData = useMetricsStore.getState().sparklineData['exp-1']
    expect(sparkData).toBeDefined()
    expect(sparkData['loss']).toHaveLength(3)
    expect(sparkData['reward']).toHaveLength(2)
    expect(sparkData['loss'][0]).toEqual({ step: 1, value: 2.5 })
  })

  it('fetchSparklineData returns empty object for experiment with no metrics', async () => {
    await act(async () => {
      await useMetricsStore.getState().fetchSparklineData('exp-no-data')
    })
    const sparkData = useMetricsStore.getState().sparklineData['exp-no-data']
    expect(sparkData).toEqual({})
  })

  it('fetchAllSparklineData fetches for multiple experiments', async () => {
    await RecordMetrics('exp-a', [
      new metrics.Metric({
        experiment_id: 'exp-a',
        step: 1,
        name: 'loss',
        value: 1.0,
        timestamp: 1000,
      }),
    ])
    await RecordMetrics('exp-b', [
      new metrics.Metric({
        experiment_id: 'exp-b',
        step: 1,
        name: 'loss',
        value: 2.0,
        timestamp: 1000,
      }),
    ])
    await act(async () => {
      await useMetricsStore.getState().fetchAllSparklineData(['exp-a', 'exp-b'])
    })
    expect(useMetricsStore.getState().sparklineData['exp-a']['loss']).toHaveLength(1)
    expect(useMetricsStore.getState().sparklineData['exp-b']['loss']).toHaveLength(1)
  })
})

describe('reward signal support', () => {
  it('fetchLatestRewardSignals populates state for an experiment', async () => {
    await RecordRewardSignals('exp-1', [
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 10,
        component: 'helpfulness',
        value: 0.82,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 20,
        component: 'helpfulness',
        value: 0.85,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 20,
        component: 'harmlessness',
        value: 0.74,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 20,
        component: 'honesty',
        value: 0.79,
        distribution: '',
      }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchLatestRewardSignals('exp-1')
    })

    const signals = useMetricsStore.getState().latestRewardSignals['exp-1']
    expect(signals).toBeDefined()
    expect(signals).toHaveLength(3)
    expect(signals.find((s: { component: string }) => s.component === 'helpfulness')?.value).toBe(
      0.85
    )
    expect(signals.find((s: { component: string }) => s.component === 'harmlessness')?.value).toBe(
      0.74
    )
  })

  it('returns empty array for experiment with no reward signals', async () => {
    await act(async () => {
      await useMetricsStore.getState().fetchLatestRewardSignals('exp-none')
    })

    const signals = useMetricsStore.getState().latestRewardSignals['exp-none']
    expect(signals).toEqual([])
  })
})
