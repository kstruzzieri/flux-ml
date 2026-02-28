import { render, screen, cleanup } from '@testing-library/react'
import { TimeSeriesChart } from '@components/Charts/TimeSeriesChart'
import type { AlignedData, Options } from 'uplot'

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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MockUplot = require('uplot').default as jest.Mock

const SAMPLE_DATA: AlignedData = [
  [1, 2, 3, 4, 5],
  [0.9, 0.7, 0.5, 0.3, 0.2],
  [0.1, 0.3, 0.5, 0.7, 0.8],
]

const SAMPLE_SERIES: Options['series'] = [
  {},
  { label: 'Loss', stroke: '#06b6d4' },
  { label: 'Reward', stroke: '#10b981' },
]

beforeEach(() => {
  MockUplot.mockClear()
  mockSetData.mockClear()
  mockDestroy.mockClear()
})

describe('TimeSeriesChart', () => {
  it('renders a container div with flux-chart class', () => {
    render(<TimeSeriesChart data={SAMPLE_DATA} series={SAMPLE_SERIES} />)
    expect(screen.getByTestId('timeseries-chart')).toBeInTheDocument()
    expect(screen.getByTestId('timeseries-chart')).toHaveClass('flux-chart')
  })

  it('creates a uPlot instance on mount', () => {
    render(<TimeSeriesChart data={SAMPLE_DATA} series={SAMPLE_SERIES} />)
    expect(MockUplot).toHaveBeenCalledTimes(1)
  })

  it('passes series and data to uPlot constructor', () => {
    render(<TimeSeriesChart data={SAMPLE_DATA} series={SAMPLE_SERIES} />)
    const [opts, data] = MockUplot.mock.calls[0]
    expect(opts.series).toEqual(SAMPLE_SERIES)
    expect(data).toBe(SAMPLE_DATA)
  })

  it('calls uPlot.destroy on unmount', () => {
    render(<TimeSeriesChart data={SAMPLE_DATA} series={SAMPLE_SERIES} />)
    expect(mockDestroy).not.toHaveBeenCalled()
    cleanup()
    expect(mockDestroy).toHaveBeenCalledTimes(1)
  })

  it('calls setData when data prop changes', () => {
    const { rerender } = render(<TimeSeriesChart data={SAMPLE_DATA} series={SAMPLE_SERIES} />)
    mockSetData.mockClear()

    const newData: AlignedData = [
      [1, 2, 3, 4, 5, 6],
      [0.9, 0.7, 0.5, 0.3, 0.2, 0.15],
      [0.1, 0.3, 0.5, 0.7, 0.8, 0.85],
    ]
    rerender(<TimeSeriesChart data={newData} series={SAMPLE_SERIES} />)
    expect(mockSetData).toHaveBeenCalledWith(newData)
  })

  it('does not render uPlot when data is empty', () => {
    const emptyData: AlignedData = [[], [], []]
    render(<TimeSeriesChart data={emptyData} series={SAMPLE_SERIES} />)
    expect(MockUplot).not.toHaveBeenCalled()
  })
})
