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
    expect(buttons[0]).toHaveClass('exp-card--active')
    expect(buttons[1]).not.toHaveClass('exp-card--active')
  })

  // Metrics map passes loss/reward values to cards.
  it('passes metrics to cards from metricsMap prop', () => {
    const experiments = [makeExperiment('exp-1', 'exp-alpha', 'running')]
    const metricsMap: Record<string, Record<string, number>> = {
      'exp-1': { loss: 0.1234, reward: 0.567 },
    }
    render(
      <ExperimentList
        experiments={experiments}
        selectedId={null}
        onSelect={jest.fn()}
        metricsMap={metricsMap}
      />
    )
    expect(screen.getByText('0.1234')).toBeInTheDocument()
    expect(screen.getByText('0.567')).toBeInTheDocument()
  })

  it('renders em dashes when metricsMap has no data for experiment', () => {
    const experiments = [makeExperiment('exp-1', 'exp-alpha')]
    render(
      <ExperimentList
        experiments={experiments}
        selectedId={null}
        onSelect={jest.fn()}
        metricsMap={{}}
      />
    )
    const dashes = screen.getAllByText('\u2014')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('passes sparkline data from sparklineDataMap prop to cards', () => {
    const experiments = [makeExperiment('exp-1', 'exp-alpha', 'running')]
    const sparklineDataMap: Record<string, Record<string, { step: number; value: number }[]>> = {
      'exp-1': {
        loss: [
          { step: 0, value: 2.0 },
          { step: 1, value: 1.0 },
        ],
        reward: [
          { step: 0, value: 0.1 },
          { step: 1, value: 0.5 },
        ],
      },
    }
    render(
      <ExperimentList
        experiments={experiments}
        selectedId={null}
        onSelect={jest.fn()}
        metricsMap={{}}
        sparklineDataMap={sparklineDataMap}
      />
    )
    expect(screen.getByTestId('sparkline-row')).toBeInTheDocument()
  })
})
