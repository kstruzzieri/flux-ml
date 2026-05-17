import { render, screen, fireEvent } from '@testing-library/react'
import { ChartsArea } from '@components/Experiments/ChartsArea'
import { useMetricsStore, __resetMetricsStore } from '@stores/metricsStore'
import { useAnnotationStore, __resetAnnotationStore } from '@stores/annotationStore'
import { __resetMockState } from '../../../__mocks__/wailsjs/go/main/App'
import type { AlignedData } from 'uplot'

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
  __resetAnnotationStore()
  useMetricsStore.setState({
    fetchChartData: jest.fn(async () => {}),
    fetchRewardComponentChartData: jest.fn(async () => {}),
  })
  useAnnotationStore.setState({
    fetchAnnotations: jest.fn(async () => {}),
    initialize: jest.fn(),
  })
})

const OVERVIEW_CHART_DATA: AlignedData = [
  [1, 2],
  [2.5, 1.8],
  [0.1, 0.5],
]

const REWARD_COMPONENT_CHART_DATA: AlignedData = [[10], [0.8], [0.7], [0.75]]
const DIVERGENT_REWARD_COMPONENT_CHART_DATA: AlignedData = [
  [10, 20, 30],
  [0.8, 0.84, 0.86],
  [0.7, 0.31, 0.74],
  [0.75, 0.79, 0.8],
]

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

  it('renders chart when chart data is available', () => {
    useMetricsStore.setState((state) => ({
      chartData: {
        ...state.chartData,
        'exp-1': OVERVIEW_CHART_DATA,
      },
    }))

    render(<ChartsArea experimentId="exp-1" />)
    expect(screen.getByTestId('timeseries-chart')).toBeInTheDocument()
  })

  it('shows placeholder on non-Overview tabs', () => {
    useMetricsStore.setState((state) => ({
      chartData: {
        ...state.chartData,
        'exp-1': OVERVIEW_CHART_DATA,
      },
    }))

    render(<ChartsArea experimentId="exp-1" />)
    fireEvent.click(screen.getByText('Reward Components'))
    expect(screen.queryByTestId('timeseries-chart')).not.toBeInTheDocument()
  })

  it('renders MultiLineChart in Reward Components tab when data available', () => {
    useMetricsStore.setState((state) => ({
      rewardComponentChartData: {
        ...state.rewardComponentChartData,
        'exp-1': REWARD_COMPONENT_CHART_DATA,
      },
    }))
    useAnnotationStore.setState((state) => ({
      annotations: {
        ...state.annotations,
        'exp-1': [],
      },
    }))

    render(<ChartsArea experimentId="exp-1" />)
    fireEvent.click(screen.getByText('Reward Components'))
    expect(screen.getByTestId('multiline-chart')).toBeInTheDocument()
    expect(screen.getByText('Components balanced')).toBeInTheDocument()
  })

  it('shows placeholder in Reward Components tab when no data', () => {
    render(<ChartsArea experimentId="exp-empty" />)
    fireEvent.click(screen.getByText('Reward Components'))
    expect(screen.getByText('No metrics data yet')).toBeInTheDocument()
    expect(screen.queryByTestId('multiline-chart')).not.toBeInTheDocument()
  })

  it('shows reward divergence summary when components diverge', () => {
    useMetricsStore.setState((state) => ({
      rewardComponentChartData: {
        ...state.rewardComponentChartData,
        'exp-1': DIVERGENT_REWARD_COMPONENT_CHART_DATA,
      },
    }))

    render(<ChartsArea experimentId="exp-1" />)
    fireEvent.click(screen.getByText('Reward Components'))

    expect(screen.getByTestId('reward-divergence-summary')).toBeInTheDocument()
    expect(screen.getByText('Reward divergence')).toBeInTheDocument()
    expect(screen.getByText('1 zone')).toBeInTheDocument()
    expect(screen.getByText('Peak 2.7x at step 20')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Step 20 2.7x/ })).toHaveClass(
      'charts-area__divergence-zone--selected'
    )
    expect(screen.getByText('Helpfulness 0.840')).toBeInTheDocument()
    expect(screen.getByText('Harmlessness 0.310')).toBeInTheDocument()
  })
})
