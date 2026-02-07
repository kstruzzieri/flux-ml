import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExperimentList } from '@components/Experiments/ExperimentList'
import { experiment } from '../../../__mocks__/wailsjs/go/models'

function makeExperiment(
  id: string,
  name: string,
  status: string = 'completed'
): experiment.Experiment {
  const now = Math.floor(Date.now() / 1000)
  return new experiment.Experiment({
    id,
    name,
    config: '{}',
    status,
    createdAt: now - 3600,
    updatedAt: now,
  })
}

describe('ExperimentList', () => {
  // The list is the primary way users see their experiments.
  it('renders a card for each experiment', () => {
    const experiments = [
      makeExperiment('1', 'exp-alpha'),
      makeExperiment('2', 'exp-beta'),
      makeExperiment('3', 'exp-gamma'),
    ]
    render(<ExperimentList experiments={experiments} selectedId={null} onSelect={jest.fn()} />)
    expect(screen.getByText('exp-alpha')).toBeInTheDocument()
    expect(screen.getByText('exp-beta')).toBeInTheDocument()
    expect(screen.getByText('exp-gamma')).toBeInTheDocument()
  })

  // Empty state is shown when no experiments exist yet.
  it('shows empty state when no experiments', () => {
    render(<ExperimentList experiments={[]} selectedId={null} onSelect={jest.fn()} />)
    expect(screen.getByText('No experiments yet')).toBeInTheDocument()
  })

  // Clicking a card delegates selection to the parent.
  it('calls onSelect with experiment id on card click', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    const experiments = [makeExperiment('abc-123', 'my-experiment')]
    render(<ExperimentList experiments={experiments} selectedId={null} onSelect={onSelect} />)
    await user.click(screen.getByText('my-experiment'))
    expect(onSelect).toHaveBeenCalledWith('abc-123')
  })

  // The selected experiment should be highlighted.
  it('passes isActive to the selected card', () => {
    const experiments = [makeExperiment('1', 'exp-alpha'), makeExperiment('2', 'exp-beta')]
    render(<ExperimentList experiments={experiments} selectedId="1" onSelect={jest.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveClass('experiment-item--active')
    expect(buttons[1]).not.toHaveClass('experiment-item--active')
  })
})
