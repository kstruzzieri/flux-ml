import { render, screen } from '@testing-library/react'
import { MultiLineChart } from '@components/Charts/MultiLineChart'
import { CHART_COLORS } from '@components/Charts/chartTheme'
import type { AlignedData } from 'uplot'

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
  [1, 2, 3],
  [0.5, 0.6, 0.7],
  [0.3, 0.4, 0.5],
  [0.1, 0.2, 0.3],
]

beforeEach(() => {
  MockUplot.mockClear()
  mockSetData.mockClear()
  mockDestroy.mockClear()
})

describe('MultiLineChart', () => {
  it('renders with multiple series', () => {
    render(
      <MultiLineChart
        data={SAMPLE_DATA}
        seriesLabels={['helpfulness', 'harmlessness', 'honesty']}
      />
    )
    expect(screen.getByTestId('multiline-chart')).toBeInTheDocument()
    expect(MockUplot).toHaveBeenCalledTimes(1)

    const [opts] = MockUplot.mock.calls[0]
    // x-axis placeholder + 3 series = 4
    expect(opts.series).toHaveLength(4)
    expect(opts.series[1].label).toBe('helpfulness')
    expect(opts.series[2].label).toBe('harmlessness')
    expect(opts.series[3].label).toBe('honesty')
  })

  it('auto-assigns palette colors when seriesColors not provided', () => {
    render(<MultiLineChart data={SAMPLE_DATA} seriesLabels={['a', 'b', 'c']} />)
    const [opts] = MockUplot.mock.calls[0]
    expect(opts.series[1].stroke).toBe(CHART_COLORS.palette[0])
    expect(opts.series[2].stroke).toBe(CHART_COLORS.palette[1])
    expect(opts.series[3].stroke).toBe(CHART_COLORS.palette[2])
  })

  it('uses custom colors when provided', () => {
    const customColors = ['#ff0000', '#00ff00', '#0000ff']
    render(
      <MultiLineChart
        data={SAMPLE_DATA}
        seriesLabels={['a', 'b', 'c']}
        seriesColors={customColors}
      />
    )
    const [opts] = MockUplot.mock.calls[0]
    expect(opts.series[1].stroke).toBe('#ff0000')
    expect(opts.series[2].stroke).toBe('#00ff00')
    expect(opts.series[3].stroke).toBe('#0000ff')
  })

  it('falls back to palette when seriesColors is an empty array', () => {
    render(<MultiLineChart data={SAMPLE_DATA} seriesLabels={['a', 'b', 'c']} seriesColors={[]} />)
    const [opts] = MockUplot.mock.calls[0]
    expect(opts.series[1].stroke).toBe(CHART_COLORS.palette[0])
    expect(opts.series[2].stroke).toBe(CHART_COLORS.palette[1])
    expect(opts.series[3].stroke).toBe(CHART_COLORS.palette[2])
  })

  it('renders empty state without creating uPlot', () => {
    const emptyData: AlignedData = [[], [], []]
    render(<MultiLineChart data={emptyData} seriesLabels={['a', 'b']} />)
    expect(screen.getByTestId('multiline-chart')).toBeInTheDocument()
    expect(MockUplot).not.toHaveBeenCalled()
  })
})
