import { render, screen, act } from '@testing-library/react'
import { MetricsGrid } from '@components/Experiments/MetricsGrid'
import { useMetricsStore, __resetMetricsStore } from '@stores/metricsStore'
import {
  __resetMockState,
  RecordMetrics,
  RecordRewardSignals,
} from '../../../__mocks__/wailsjs/go/main/App'
import { metrics } from '../../../__mocks__/wailsjs/go/models'

beforeEach(() => {
  __resetMockState()
  __resetMetricsStore()
})

describe('MetricsGrid', () => {
  it('renders four metric cards', async () => {
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
        value: 0.3,
        timestamp: 1000,
      }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchLatestMetrics('exp-1')
      await useMetricsStore.getState().fetchSparklineData('exp-1')
    })

    render(<MetricsGrid experimentId="exp-1" />)

    expect(screen.getByText('Loss')).toBeInTheDocument()
    expect(screen.getByText('Reward')).toBeInTheDocument()
    expect(screen.getByText('KL Divergence')).toBeInTheDocument()
    expect(screen.getByText('Learning Rate')).toBeInTheDocument()
  })

  it('renders reward components card', async () => {
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

    await act(async () => {
      await useMetricsStore.getState().fetchLatestRewardSignals('exp-1')
    })

    render(<MetricsGrid experimentId="exp-1" />)

    expect(screen.getByText('Reward Components')).toBeInTheDocument()
    expect(screen.getByText('Helpfulness')).toBeInTheDocument()
  })

  it('shows em dash values when no metrics available', () => {
    render(<MetricsGrid experimentId="exp-empty" />)
    // All values should show em dash
    const dashes = screen.getAllByText('\u2014')
    expect(dashes.length).toBeGreaterThanOrEqual(4)
  })
})
