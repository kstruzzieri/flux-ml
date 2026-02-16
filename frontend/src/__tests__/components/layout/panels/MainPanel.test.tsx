import { render, screen, act } from '@testing-library/react'
import { MainPanel } from '@components/layout/panels/MainPanel'
import { useExperimentStore } from '@stores/experimentStore'
import { useMetricsStore } from '@stores/metricsStore'
import { experiment } from '../../../../__mocks__/wailsjs/go/models'

// Mock the Wails runtime (EventsOn) so experimentStore can import
jest.mock('../../../../../wailsjs/runtime/runtime', () => ({
  EventsOn: jest.fn(),
}))

jest.mock('../../../../../wailsjs/go/main/App', () => ({
  ListExperiments: jest.fn().mockResolvedValue([]),
  GetLatestMetrics: jest.fn().mockResolvedValue([]),
  QueryMetrics: jest.fn().mockResolvedValue([]),
  QueryRewardSignals: jest.fn().mockResolvedValue([]),
}))

function makeExperiment(overrides: Partial<Record<string, unknown>> = {}): experiment.Experiment {
  const now = Math.floor(Date.now() / 1000)
  return new experiment.Experiment({
    id: 'test-id-1',
    name: 'ppo-run-42',
    config: '{}',
    status: 'running',
    createdAt: now - 3600,
    updatedAt: now,
    ...overrides,
  })
}

beforeEach(() => {
  useExperimentStore.setState({
    experiments: [],
    selectedId: null,
    loading: false,
    error: null,
  })
})

describe('MainPanel', () => {
  // When no experiment is selected, the user sees the welcome banner
  // with the tagline, indicating they should select an experiment.
  it('shows welcome banner when selectedId is null', () => {
    useExperimentStore.setState({ selectedId: null, experiments: [] })
    render(<MainPanel />)
    expect(screen.getByText('The ML development environment')).toBeInTheDocument()
    expect(screen.getByText('Select an experiment to view metrics')).toBeInTheDocument()
  })

  // When an experiment is selected, the main panel should display
  // the experiment name prominently as a header.
  it('shows experiment name when an experiment is selected', () => {
    const exp = makeExperiment()
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<MainPanel />)
    expect(screen.getByText('ppo-run-42')).toBeInTheDocument()
  })

  // The status dot provides a quick visual indicator of experiment state.
  it('shows status dot with correct status when selected', () => {
    const exp = makeExperiment({ status: 'running' })
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<MainPanel />)
    expect(screen.getByRole('img', { name: 'Running' })).toBeInTheDocument()
  })

  // Duration gives temporal context — how long has this experiment been going?
  it('shows formatted duration when selected', () => {
    const now = Math.floor(Date.now() / 1000)
    const exp = makeExperiment({
      status: 'completed',
      createdAt: now - 7200,
      updatedAt: now,
    })
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<MainPanel />)
    // 7200 seconds = 2h 0m
    expect(screen.getByText('2h 0m')).toBeInTheDocument()
  })

  // When the user clicks a different experiment card, the main panel
  // should update to show the newly selected experiment's details.
  it('updates display when selection changes to a different experiment', () => {
    const exp1 = makeExperiment({ id: 'id-1', name: 'exp-alpha' })
    const exp2 = makeExperiment({ id: 'id-2', name: 'exp-beta', status: 'completed' })
    useExperimentStore.setState({
      experiments: [exp1, exp2],
      selectedId: 'id-1',
    })
    const { rerender } = render(<MainPanel />)
    expect(screen.getByText('exp-alpha')).toBeInTheDocument()

    // Simulate selection change
    act(() => {
      useExperimentStore.setState({ selectedId: 'id-2' })
    })
    rerender(<MainPanel />)
    expect(screen.getByText('exp-beta')).toBeInTheDocument()
  })

  it('shows metrics grid when experiment is selected', () => {
    const exp = makeExperiment()
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<MainPanel />)
    expect(screen.getByTestId('metrics-grid')).toBeInTheDocument()
  })

  it('shows charts area when experiment is selected', () => {
    const exp = makeExperiment()
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<MainPanel />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('No metrics data yet')).toBeInTheDocument()
  })

  it('shows step count in header when sparkline data is available', () => {
    const exp = makeExperiment()
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    useMetricsStore.setState({
      sparklineData: {
        [exp.id]: {
          loss: [
            { step: 100, value: 2.5 },
            { step: 12400, value: 0.5 },
          ],
        },
      },
    })
    render(<MainPanel />)
    expect(screen.getByTestId('step-count')).toHaveTextContent('Step 12,400')
  })

  it('does not show step count when no sparkline data', () => {
    const exp = makeExperiment()
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<MainPanel />)
    expect(screen.queryByTestId('step-count')).not.toBeInTheDocument()
  })
})
