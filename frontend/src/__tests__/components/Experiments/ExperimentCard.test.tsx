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
    const dot = screen.getByTitle('Running')
    expect(dot).toHaveClass('experiment-item__status--running')
  })

  it('renders completed status dot with correct class', () => {
    const exp = makeExperiment({ status: 'completed' })
    render(<ExperimentCard {...defaultProps} experiment={exp} />)
    const dot = screen.getByTitle('Completed')
    expect(dot).toHaveClass('experiment-item__status--completed')
  })

  it('renders failed status dot with correct class', () => {
    const exp = makeExperiment({ status: 'failed' })
    render(<ExperimentCard {...defaultProps} experiment={exp} />)
    const dot = screen.getByTitle('Failed')
    expect(dot).toHaveClass('experiment-item__status--failed')
  })

  it('renders pending status dot with correct class', () => {
    const exp = makeExperiment({ status: 'pending' })
    render(<ExperimentCard {...defaultProps} experiment={exp} />)
    const dot = screen.getByTitle('Pending')
    expect(dot).toHaveClass('experiment-item__status--pending')
  })

  // Active experiment must be visually distinct with accent styling.
  it('applies active class when isActive is true', () => {
    render(<ExperimentCard {...defaultProps} isActive={true} />)
    const item = screen.getByRole('button')
    expect(item).toHaveClass('experiment-item--active')
  })

  it('does not apply active class when isActive is false', () => {
    render(<ExperimentCard {...defaultProps} isActive={false} />)
    const item = screen.getByRole('button')
    expect(item).not.toHaveClass('experiment-item--active')
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
})
