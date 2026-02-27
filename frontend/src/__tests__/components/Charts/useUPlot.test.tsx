import { render, cleanup } from '@testing-library/react'
import type { AlignedData, Options } from 'uplot'
import { useUPlot } from '@components/Charts/useUPlot'

const mockSetData = jest.fn()
const mockDestroy = jest.fn()
const mockSetSize = jest.fn()

jest.mock('uplot', () => {
  const mock = jest.fn().mockImplementation(() => ({
    setData: mockSetData,
    destroy: mockDestroy,
    setSize: mockSetSize,
  }))
  return { __esModule: true, default: mock }
})

jest.mock('uplot/dist/uPlot.min.css', () => ({}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MockUplot = require('uplot').default as jest.Mock

const SAMPLE_DATA: AlignedData = [
  [1, 2, 3],
  [0.5, 0.3, 0.1],
]

function buildOpts(w: number, h: number): Options {
  return {
    width: w,
    height: h,
    series: [{}, { label: 'Test', stroke: '#06b6d4' }],
    scales: { x: { time: false } },
    axes: [],
    cursor: {},
  }
}

// Test wrapper that consumes the hook
function TestChart({ data, deps }: { data: AlignedData; deps?: unknown[] }) {
  const ref = useUPlot(buildOpts, data, deps)
  return <div ref={ref} data-testid="test-chart" style={{ width: 800, height: 300 }} />
}

beforeEach(() => {
  MockUplot.mockClear()
  mockSetData.mockClear()
  mockDestroy.mockClear()
  mockSetSize.mockClear()
})

describe('useUPlot', () => {
  it('creates a uPlot instance on mount', () => {
    render(<TestChart data={SAMPLE_DATA} />)
    expect(MockUplot).toHaveBeenCalledTimes(1)
  })

  it('destroys the instance on unmount', () => {
    render(<TestChart data={SAMPLE_DATA} />)
    expect(mockDestroy).not.toHaveBeenCalled()
    cleanup()
    expect(mockDestroy).toHaveBeenCalledTimes(1)
  })

  it('calls setData when data changes', () => {
    const { rerender } = render(<TestChart data={SAMPLE_DATA} />)
    mockSetData.mockClear()

    const newData: AlignedData = [
      [1, 2, 3, 4],
      [0.5, 0.3, 0.1, 0.05],
    ]
    rerender(<TestChart data={newData} />)
    expect(mockSetData).toHaveBeenCalledWith(newData)
  })

  it('does not create uPlot when data is empty', () => {
    const emptyData: AlignedData = [[], []]
    render(<TestChart data={emptyData} />)
    expect(MockUplot).not.toHaveBeenCalled()
  })

  it('creates uPlot when data transitions from empty to non-empty', () => {
    const emptyData: AlignedData = [[], []]
    const { rerender } = render(<TestChart data={emptyData} deps={['stable']} />)
    expect(MockUplot).not.toHaveBeenCalled()

    rerender(<TestChart data={SAMPLE_DATA} deps={['stable']} />)
    expect(MockUplot).toHaveBeenCalledTimes(1)
  })

  it('rebuilds chart when deps change', () => {
    const { rerender } = render(<TestChart data={SAMPLE_DATA} deps={['a']} />)
    expect(MockUplot).toHaveBeenCalledTimes(1)

    rerender(<TestChart data={SAMPLE_DATA} deps={['b']} />)
    // Old instance destroyed, new one created
    expect(mockDestroy).toHaveBeenCalledTimes(1)
    expect(MockUplot).toHaveBeenCalledTimes(2)
  })
})
