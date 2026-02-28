import { render, screen } from '@testing-library/react'
import { HistogramChart } from '@components/Charts/HistogramChart'
import { CHART_COLORS } from '@components/Charts/chartTheme'
import type { Options } from 'uplot'

const mockSetData = jest.fn()
const mockDestroy = jest.fn()

jest.mock('uplot', () => {
  const mock = jest.fn().mockImplementation(() => ({
    setData: mockSetData,
    destroy: mockDestroy,
  }))
  // Provide the paths.bars factory used by HistogramChart
  Object.assign(mock, {
    paths: {
      bars: jest.fn().mockReturnValue(() => null),
    },
  })
  return { __esModule: true, default: mock }
})

jest.mock('uplot/dist/uPlot.min.css', () => ({}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MockUplot = require('uplot').default as jest.Mock

const SAMPLE_BINS = [0, 1, 2, 3, 4]
const SAMPLE_COUNTS = [10, 25, 15, 5, 2]

beforeEach(() => {
  MockUplot.mockClear()
  mockSetData.mockClear()
  mockDestroy.mockClear()
})

describe('HistogramChart', () => {
  it('renders bars with bins and counts', () => {
    render(<HistogramChart bins={SAMPLE_BINS} counts={SAMPLE_COUNTS} />)
    expect(screen.getByTestId('histogram-chart')).toBeInTheDocument()
    expect(MockUplot).toHaveBeenCalledTimes(1)

    const [opts, data] = MockUplot.mock.calls[0]
    expect(data[0]).toBe(SAMPLE_BINS)
    expect(data[1]).toBe(SAMPLE_COUNTS)
    expect(opts.series).toHaveLength(2) // x placeholder + bars
  })

  it('handles empty data without creating uPlot', () => {
    render(<HistogramChart bins={[]} counts={[]} />)
    expect(screen.getByTestId('histogram-chart')).toBeInTheDocument()
    expect(MockUplot).not.toHaveBeenCalled()
  })

  it('applies custom color', () => {
    render(<HistogramChart bins={SAMPLE_BINS} counts={SAMPLE_COUNTS} color="#ff6600" />)
    const [opts] = MockUplot.mock.calls[0]
    expect(opts.series[1].stroke).toBe('#ff6600')
    expect((opts.series[1] as Options['series'][number] & { fill: string }).fill).toContain(
      '#ff6600'
    )
  })

  it('uses default palette color when no custom color', () => {
    render(<HistogramChart bins={SAMPLE_BINS} counts={SAMPLE_COUNTS} />)
    const [opts] = MockUplot.mock.calls[0]
    expect(opts.series[1].stroke).toBe(CHART_COLORS.palette[0])
  })
})
