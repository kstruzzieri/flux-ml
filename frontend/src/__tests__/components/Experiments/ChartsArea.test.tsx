import { render, screen, fireEvent, act } from '@testing-library/react'
import { ChartsArea } from '@components/Experiments/ChartsArea'
import { useMetricsStore, __resetMetricsStore } from '@stores/metricsStore'
import { __resetMockState, RecordMetrics } from '../../../__mocks__/wailsjs/go/main/App'
import { metrics } from '../../../__mocks__/wailsjs/go/models'

// Mock uPlot (same pattern as TimeSeriesChart test)
const mockSetData = jest.fn()
const mockDestroy = jest.fn()

jest.mock('uplot', () => {
  const mock = jest.fn().mockImplementation(() => ({
    setData: mockSetData,
    destroy: mockDestroy,
  }))
  return { __esModule: true, default: mock }
})

jest.mock('uplot/dist/uPlot.min.css', () => ({}))

beforeEach(() => {
  __resetMockState()
  __resetMetricsStore()
})

describe('ChartsArea', () => {
  it('renders three chart tabs', () => {
    render(<ChartsArea experimentId="exp-1" />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Reward Components')).toBeInTheDocument()
    expect(screen.getByText('Diagnostics')).toBeInTheDocument()
  })

  it('has Overview tab active by default', () => {
    render(<ChartsArea experimentId="exp-1" />)
    expect(screen.getByText('Overview').closest('button')).toHaveClass('charts-area__tab--active')
  })

  it('switches active tab on click', () => {
    render(<ChartsArea experimentId="exp-1" />)
    fireEvent.click(screen.getByText('Reward Components'))
    expect(screen.getByText('Reward Components').closest('button')).toHaveClass(
      'charts-area__tab--active'
    )
    expect(screen.getByText('Overview').closest('button')).not.toHaveClass(
      'charts-area__tab--active'
    )
  })

  it('shows placeholder when no chart data exists', () => {
    render(<ChartsArea experimentId="exp-empty" />)
    expect(screen.getByText('No metrics data yet')).toBeInTheDocument()
  })

  it('renders chart when chart data is available', async () => {
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
      await useMetricsStore.getState().fetchChartData('exp-1')
    })

    render(<ChartsArea experimentId="exp-1" />)
    expect(screen.getByTestId('timeseries-chart')).toBeInTheDocument()
  })

  it('shows placeholder on non-Overview tabs', async () => {
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

    await act(async () => {
      await useMetricsStore.getState().fetchChartData('exp-1')
    })

    render(<ChartsArea experimentId="exp-1" />)
    fireEvent.click(screen.getByText('Reward Components'))
    expect(screen.queryByTestId('timeseries-chart')).not.toBeInTheDocument()
  })
})
