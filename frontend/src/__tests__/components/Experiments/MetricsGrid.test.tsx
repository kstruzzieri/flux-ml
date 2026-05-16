import { render, screen } from '@testing-library/react'
import { MetricsGrid } from '@components/Experiments/MetricsGrid'
import { useAlertsStore, __resetAlertsStore } from '@stores/alertsStore'
import { useMetricsStore, __resetMetricsStore } from '@stores/metricsStore'
import { __resetMockState } from '../../../__mocks__/wailsjs/go/main/App'

beforeEach(() => {
  __resetMockState()
  __resetAlertsStore()
  __resetMetricsStore()
  useAlertsStore.setState({
    fetchDetections: jest.fn(async () => {}),
  })
  useMetricsStore.setState({
    fetchLatestMetrics: jest.fn(async () => {}),
    fetchSparklineData: jest.fn(async () => {}),
  })
})

describe('MetricsGrid', () => {
  it('renders four metric cards', () => {
    useMetricsStore.setState({
      latestMetrics: {
        'exp-1': {
          kl: 0.045,
          learning_rate: 0.0003,
        },
      },
      sparklineData: {
        'exp-1': {
          kl: [{ step: 1, value: 0.045 }],
          learning_rate: [{ step: 1, value: 0.0003 }],
        },
      },
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
