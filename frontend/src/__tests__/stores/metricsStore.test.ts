import { act } from '@testing-library/react'
import { useMetricsStore, __resetMetricsStore } from '@stores/metricsStore'
import { __resetMockState } from '../../__mocks__/wailsjs/go/main/App'
import { metrics } from '../../__mocks__/wailsjs/go/models'
import { RecordMetrics, RecordRewardSignals } from '../../__mocks__/wailsjs/go/main/App'
import { EventsEmit } from '../../__mocks__/wailsjs/runtime/runtime'

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

describe('chart data support', () => {
  it('fetchChartData populates aligned data for loss and reward', async () => {
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
      new metrics.Metric({
        experiment_id: 'exp-1',
        step: 3,
        name: 'reward',
        value: 0.8,
        timestamp: 3000,
      }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchChartData('exp-1')
    })

    const chartData = useMetricsStore.getState().chartData['exp-1']
    expect(chartData).toBeDefined()
    // AlignedData: [steps[], loss[], reward[]]
    expect(chartData).toHaveLength(3)
    expect(chartData[0]).toEqual([1, 2, 3]) // steps
    expect(chartData[1]).toEqual([2.5, 1.8, 0.9]) // loss values
    expect(chartData[2]).toEqual([0.1, 0.5, 0.8]) // reward values
  })

  it('fetchChartData returns empty arrays when no data exists', async () => {
    await act(async () => {
      await useMetricsStore.getState().fetchChartData('exp-empty')
    })

    const chartData = useMetricsStore.getState().chartData['exp-empty']
    expect(chartData).toBeDefined()
    expect(chartData[0]).toEqual([]) // empty steps
    expect(chartData[1]).toEqual([]) // empty loss
    expect(chartData[2]).toEqual([]) // empty reward
  })

  it('fetchChartData handles missing reward data gracefully', async () => {
    // Only loss data, no reward
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
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchChartData('exp-1')
    })

    const chartData = useMetricsStore.getState().chartData['exp-1']
    expect(chartData).toBeDefined()
    expect(chartData[0]).toEqual([1, 2]) // steps from loss
    expect(chartData[1]).toEqual([2.5, 1.8]) // loss values
    expect(chartData[2]).toEqual([null, null]) // nulls for missing reward
  })

  it('fetchChartData aligns loss and reward on shared step axis', async () => {
    // Loss at steps 1,2,3 — reward only at steps 1,3
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
        step: 3,
        name: 'reward',
        value: 0.8,
        timestamp: 3000,
      }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchChartData('exp-1')
    })

    const chartData = useMetricsStore.getState().chartData['exp-1']
    expect(chartData[0]).toEqual([1, 2, 3]) // union of all steps
    expect(chartData[1]).toEqual([2.5, 1.8, 0.9]) // loss at all steps
    expect(chartData[2]).toEqual([0.1, null, 0.8]) // reward: null where missing
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

describe('reward component chart data', () => {
  it('fetchRewardComponentChartData populates aligned data', async () => {
    await RecordRewardSignals('exp-1', [
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 10,
        component: 'helpfulness',
        value: 0.8,
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
        step: 30,
        component: 'helpfulness',
        value: 0.9,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 10,
        component: 'harmlessness',
        value: 0.7,
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
        step: 30,
        component: 'harmlessness',
        value: 0.78,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 10,
        component: 'honesty',
        value: 0.75,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 20,
        component: 'honesty',
        value: 0.79,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 30,
        component: 'honesty',
        value: 0.83,
        distribution: '',
      }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchRewardComponentChartData('exp-1')
    })

    const data = useMetricsStore.getState().rewardComponentChartData['exp-1']
    expect(data).toBeDefined()
    expect(data).toHaveLength(4) // [steps, helpfulness, harmlessness, honesty]
    expect(data[0]).toEqual([10, 20, 30])
    expect(data[1]).toEqual([0.8, 0.85, 0.9]) // helpfulness
    expect(data[2]).toEqual([0.7, 0.74, 0.78]) // harmlessness
    expect(data[3]).toEqual([0.75, 0.79, 0.83]) // honesty
  })

  it('fetchRewardComponentChartData null-fills missing steps', async () => {
    await RecordRewardSignals('exp-1', [
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 10,
        component: 'helpfulness',
        value: 0.8,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 30,
        component: 'helpfulness',
        value: 0.9,
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
        step: 10,
        component: 'honesty',
        value: 0.75,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 20,
        component: 'honesty',
        value: 0.79,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 30,
        component: 'honesty',
        value: 0.83,
        distribution: '',
      }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchRewardComponentChartData('exp-1')
    })

    const data = useMetricsStore.getState().rewardComponentChartData['exp-1']
    expect(data[0]).toEqual([10, 20, 30]) // union of all steps
    expect(data[1]).toEqual([0.8, null, 0.9]) // helpfulness: missing at step 20
    expect(data[2]).toEqual([null, 0.74, null]) // harmlessness: only at step 20
    expect(data[3]).toEqual([0.75, 0.79, 0.83]) // honesty: all steps
  })

  it('fetchRewardComponentChartData returns empty arrays when no data', async () => {
    await act(async () => {
      await useMetricsStore.getState().fetchRewardComponentChartData('exp-empty')
    })

    const data = useMetricsStore.getState().rewardComponentChartData['exp-empty']
    expect(data).toBeDefined()
    expect(data).toHaveLength(4)
    expect(data[0]).toEqual([])
    expect(data[1]).toEqual([])
    expect(data[2]).toEqual([])
    expect(data[3]).toEqual([])
  })
})

describe('live updates', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('metrics:recorded event triggers chart data re-fetch', async () => {
    // Seed initial data
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
        step: 1,
        name: 'reward',
        value: 0.1,
        timestamp: 1000,
      }),
    ])

    // Initialize store (sets up event listeners)
    useMetricsStore.getState().initialize()

    // Fetch initial chart data
    await act(async () => {
      await useMetricsStore.getState().fetchChartData('exp-1')
    })

    const initialData = useMetricsStore.getState().chartData['exp-1']
    expect(initialData[0]).toEqual([1]) // 1 step

    // Add new metrics
    await RecordMetrics('exp-1', [
      new metrics.Metric({
        experiment_id: 'exp-1',
        step: 2,
        name: 'loss',
        value: 1.8,
        timestamp: 2000,
      }),
      new metrics.Metric({
        experiment_id: 'exp-1',
        step: 2,
        name: 'reward',
        value: 0.5,
        timestamp: 2000,
      }),
    ])

    // Simulate the event
    EventsEmit('metrics:recorded', { experimentId: 'exp-1' })

    // Advance past the 200ms debounce
    await act(async () => {
      jest.advanceTimersByTime(300)
      // Allow promises to resolve
      await Promise.resolve()
      await Promise.resolve()
    })

    const updatedData = useMetricsStore.getState().chartData['exp-1']
    expect(updatedData[0]).toEqual([1, 2]) // now 2 steps
    expect(updatedData[1]).toEqual([2.5, 1.8]) // loss values
    expect(updatedData[2]).toEqual([0.1, 0.5]) // reward values
  })

  it('rewards:recorded triggers reward component chart data re-fetch', async () => {
    // Seed initial reward signals
    await RecordRewardSignals('exp-1', [
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 10,
        component: 'helpfulness',
        value: 0.8,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 10,
        component: 'harmlessness',
        value: 0.7,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 10,
        component: 'honesty',
        value: 0.75,
        distribution: '',
      }),
    ])

    // Initialize store (sets up event listeners)
    useMetricsStore.getState().initialize()

    // Fetch initial data
    await act(async () => {
      await useMetricsStore.getState().fetchRewardComponentChartData('exp-1')
    })

    const initialData = useMetricsStore.getState().rewardComponentChartData['exp-1']
    expect(initialData[0]).toEqual([10]) // 1 step

    // Add new reward signals
    await RecordRewardSignals('exp-1', [
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

    // Simulate the event
    EventsEmit('rewards:recorded', { experimentId: 'exp-1' })

    // Advance past the 200ms debounce
    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve()
      await Promise.resolve()
    })

    const updatedData = useMetricsStore.getState().rewardComponentChartData['exp-1']
    expect(updatedData[0]).toEqual([10, 20]) // now 2 steps
    expect(updatedData[1]).toEqual([0.8, 0.85]) // helpfulness
    expect(updatedData[2]).toEqual([0.7, 0.74]) // harmlessness
    expect(updatedData[3]).toEqual([0.75, 0.79]) // honesty
  })
})
