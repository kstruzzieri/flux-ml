import { render, screen } from '@testing-library/react'
import { InspectorPanel } from '@components/layout/panels/InspectorPanel'
import { useExperimentStore } from '@stores/experimentStore'
import { experiment } from '../../../../__mocks__/wailsjs/go/models'

// Mock the Wails runtime (EventsOn) so experimentStore can import
jest.mock('../../../../../wailsjs/runtime/runtime', () => ({
  EventsOn: jest.fn(),
}))

jest.mock('../../../../../wailsjs/go/main/App', () => ({
  ListExperiments: jest.fn().mockResolvedValue([]),
}))

function makeExperiment(overrides: Partial<Record<string, unknown>> = {}): experiment.Experiment {
  const now = Math.floor(Date.now() / 1000)
  return new experiment.Experiment({
    id: 'abc-123-def-456',
    name: 'reward-model-v2-run-47',
    config: '{"learning_rate": 1e-5}',
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

describe('InspectorPanel', () => {
  it('renders placeholder when no experiment selected', () => {
    render(<InspectorPanel />)
    expect(screen.getByText('Select an experiment to inspect')).toBeInTheDocument()
  })

  it('shows experiment name when selected', () => {
    const exp = makeExperiment()
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<InspectorPanel />)
    expect(screen.getByText('reward-model-v2-run-47')).toBeInTheDocument()
  })

  it('shows status indicator with correct label', () => {
    const exp = makeExperiment({ status: 'running' })
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<InspectorPanel />)
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('shows experiment ID in monospace', () => {
    const exp = makeExperiment({ id: 'abcdef12-3456-7890-abcd-ef1234567890' })
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<InspectorPanel />)
    const idElement = screen.getByTestId('inspector-id')
    expect(idElement).toBeInTheDocument()
    expect(idElement.className).toContain('mono')
  })

  it('shows formatted timestamps', () => {
    const now = Math.floor(Date.now() / 1000)
    const exp = makeExperiment({
      createdAt: now - 7200,
      updatedAt: now - 60,
    })
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<InspectorPanel />)
    expect(screen.getByTestId('inspector-created')).toBeInTheDocument()
    expect(screen.getByTestId('inspector-updated')).toBeInTheDocument()
  })
})
