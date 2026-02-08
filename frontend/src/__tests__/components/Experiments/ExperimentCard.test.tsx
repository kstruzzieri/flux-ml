import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExperimentCard } from '@components/Experiments/ExperimentCard'
import { experiment } from '../../../__mocks__/wailsjs/go/models'

function makeExperiment(overrides: Partial<Record<string, unknown>> = {}): experiment.Experiment {
  const now = Math.floor(Date.now() / 1000)
  return new experiment.Experiment({
    id: 'exp-1',
    name: 'reward-model-v2-run-47',
    config: '{}',
    status: 'running',
    createdAt: now - 2 * 3600 - 34 * 60,
    updatedAt: now,
    ...overrides,
  })
}

describe('ExperimentCard', () => {
  const defaultProps = {
    experiment: makeExperiment(),
    isActive: false,
    onSelect: jest.fn(),
  }

  // Name is the primary identifier for an experiment.
  it('renders experiment name', () => {
    render(<ExperimentCard {...defaultProps} />)
    expect(screen.getByText('reward-model-v2-run-47')).toBeInTheDocument()
  })

  // Status dot color must match the experiment status.
  it('renders running status dot with correct class', () => {
    render(<ExperimentCard {...defaultProps} />)
    const dot = screen.getByRole('img', { name: 'Running' })
    expect(dot).toHaveClass('status-dot--running')
  })

  it('renders completed status dot with correct class', () => {
    const exp = makeExperiment({ status: 'completed' })
    render(<ExperimentCard {...defaultProps} experiment={exp} />)
    const dot = screen.getByRole('img', { name: 'Completed' })
    expect(dot).toHaveClass('status-dot--completed')
  })

  it('renders failed status dot with correct class', () => {
    const exp = makeExperiment({ status: 'failed' })
    render(<ExperimentCard {...defaultProps} experiment={exp} />)
    const dot = screen.getByRole('img', { name: 'Failed' })
    expect(dot).toHaveClass('status-dot--failed')
  })

  it('renders pending status dot with correct class', () => {
    const exp = makeExperiment({ status: 'pending' })
    render(<ExperimentCard {...defaultProps} experiment={exp} />)
    const dot = screen.getByRole('img', { name: 'Pending' })
    expect(dot).toHaveClass('status-dot--pending')
  })

  // Active experiment must be visually distinct with accent styling.
  it('applies active class when isActive is true', () => {
    render(<ExperimentCard {...defaultProps} isActive={true} />)
    const item = screen.getByRole('button')
    expect(item).toHaveClass('exp-card--active')
  })

  it('does not apply active class when isActive is false', () => {
    render(<ExperimentCard {...defaultProps} isActive={false} />)
    const item = screen.getByRole('button')
    expect(item).not.toHaveClass('exp-card--active')
  })

  // Clicking a card selects it.
  it('calls onSelect with experiment id on click', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(<ExperimentCard {...defaultProps} onSelect={onSelect} />)
    await user.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith('exp-1')
  })

  // Duration is shown for each card.
  it('shows formatted duration', () => {
    const now = Math.floor(Date.now() / 1000)
    const exp = makeExperiment({
      status: 'completed',
      createdAt: now - 4 * 3600 - 12 * 60,
      updatedAt: now,
    })
    render(<ExperimentCard {...defaultProps} experiment={exp} />)
    expect(screen.getByText('4h 12m')).toBeInTheDocument()
  })

  // Memoization prevents unnecessary re-renders.
  it('does not re-render when props are unchanged', () => {
    const exp = makeExperiment()
    const { rerender } = render(
      <ExperimentCard experiment={exp} isActive={false} onSelect={jest.fn()} />
    )
    const firstHTML = screen.getByRole('button').innerHTML

    // Re-render with same props (new object but same values)
    const exp2 = makeExperiment()
    rerender(<ExperimentCard experiment={exp2} isActive={false} onSelect={jest.fn()} />)
    const secondHTML = screen.getByRole('button').innerHTML

    expect(firstHTML).toBe(secondHTML)
  })

  // Inline metrics display — loss and reward values shown on card.
  it('renders loss value with monospace styling', () => {
    render(<ExperimentCard {...defaultProps} loss={0.1235} reward={0.567} />)
    const lossEl = screen.getByText('0.1235')
    expect(lossEl).toBeInTheDocument()
    expect(lossEl.closest('.exp-card__metrics')).toBeInTheDocument()
  })

  it('renders reward value with monospace styling', () => {
    render(<ExperimentCard {...defaultProps} loss={0.1235} reward={0.567} />)
    const rewardEl = screen.getByText('0.567')
    expect(rewardEl).toBeInTheDocument()
  })

  it('renders em dash when no metrics provided', () => {
    render(<ExperimentCard {...defaultProps} />)
    const metricsRow = screen.getByTestId('metrics-row')
    expect(metricsRow).toHaveTextContent('\u2014')
  })

  it('renders em dash for loss when only reward is provided', () => {
    render(<ExperimentCard {...defaultProps} reward={0.5} />)
    const labels = screen.getAllByText('\u2014')
    expect(labels.length).toBeGreaterThanOrEqual(1)
  })

  // Sparkline charts display
  it('renders sparkline row when sparkline data provided', () => {
    const sparklineData = {
      loss: [
        { step: 0, value: 2.0 },
        { step: 1, value: 1.5 },
        { step: 2, value: 1.0 },
      ],
      reward: [
        { step: 0, value: 0.1 },
        { step: 1, value: 0.3 },
        { step: 2, value: 0.5 },
      ],
    }
    render(<ExperimentCard {...defaultProps} sparklineData={sparklineData} />)
    const sparklineRow = screen.getByTestId('sparkline-row')
    expect(sparklineRow).toBeInTheDocument()
    const svgs = sparklineRow.querySelectorAll('svg')
    expect(svgs).toHaveLength(2)
  })

  it('does not render sparkline row when data is absent', () => {
    render(<ExperimentCard {...defaultProps} />)
    expect(screen.queryByTestId('sparkline-row')).not.toBeInTheDocument()
  })

  it('memo comparator detects sparkline data changes', () => {
    const sparkData1 = {
      loss: [{ step: 0, value: 2.0 }],
    }
    const sparkData2 = {
      loss: [
        { step: 0, value: 2.0 },
        { step: 1, value: 1.0 },
      ],
    }
    const { rerender } = render(<ExperimentCard {...defaultProps} sparklineData={sparkData1} />)
    expect(screen.getByTestId('sparkline-row').querySelectorAll('svg')).toHaveLength(1)
    rerender(<ExperimentCard {...defaultProps} sparklineData={sparkData2} />)
    const polyline = screen.getByTestId('sparkline-row').querySelector('polyline')
    const points = polyline!.getAttribute('points')!.split(' ')
    expect(points).toHaveLength(2)
  })
})
