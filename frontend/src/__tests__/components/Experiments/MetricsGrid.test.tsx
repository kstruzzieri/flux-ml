import { render, screen, act } from '@testing-library/react'
import { MetricsGrid } from '@components/Experiments/MetricsGrid'
import { useMetricsStore, __resetMetricsStore } from '@stores/metricsStore'
import { __resetMockState, RecordMetrics } from '../../../__mocks__/wailsjs/go/main/App'
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
        name: 'kl',
        value: 0.045,
        timestamp: 1000,
      }),
      new metrics.Metric({
        experiment_id: 'exp-1',
        step: 1,
        name: 'learning_rate',
        value: 0.0003,
        timestamp: 1000,
      }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchLatestMetrics('exp-1')
      await useMetricsStore.getState().fetchSparklineData('exp-1')
    })

    render(<MetricsGrid experimentId="exp-1" />)

    expect(screen.getByText('KL Divergence')).toBeInTheDocument()
    expect(screen.getByText('Learning Rate')).toBeInTheDocument()
    expect(screen.getByText('Reward Variance')).toBeInTheDocument()
    expect(screen.getByText('Policy Entropy')).toBeInTheDocument()
  })

  it('renders reward hack status card', () => {
    render(<MetricsGrid experimentId="exp-1" />)

    expect(screen.getByText('Reward Hack Detection')).toBeInTheDocument()
    expect(screen.getByText('Length Gaming')).toBeInTheDocument()
    expect(screen.getByText('Sycophancy')).toBeInTheDocument()
    expect(screen.getByText('KL Drift')).toBeInTheDocument()
    expect(screen.getByText('Reward Collapse')).toBeInTheDocument()
  })

  it('shows em dash values when no metrics available', () => {
    render(<MetricsGrid experimentId="exp-empty" />)
    // All values should show em dash
    const dashes = screen.getAllByText('\u2014')
    expect(dashes.length).toBeGreaterThanOrEqual(4)
  })
})
