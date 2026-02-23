import { render, screen } from '@testing-library/react'
import { ConfigPanel } from '@components/layout/panels/ConfigPanel'
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
    id: 'test-id-1',
    name: 'reward-model-v2-run-47',
    config: '{"learning_rate": 0.00001, "batch_size": 32, "model": "llama-7b"}',
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

describe('ConfigPanel', () => {
  it('renders placeholder when no experiment selected', () => {
    render(<ConfigPanel />)
    expect(screen.getByText('Select an experiment to view configuration')).toBeInTheDocument()
  })

  it('renders "No configuration data" when config is empty string', () => {
    const exp = makeExperiment({ config: '' })
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<ConfigPanel />)
    expect(screen.getByText('No configuration data')).toBeInTheDocument()
  })

  it('renders config key-value pairs from valid JSON', () => {
    const exp = makeExperiment()
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<ConfigPanel />)
    expect(screen.getByText('learning_rate')).toBeInTheDocument()
    expect(screen.getByText('batch_size')).toBeInTheDocument()
    expect(screen.getByText('model')).toBeInTheDocument()
    expect(screen.getByText('0.00001')).toBeInTheDocument()
    expect(screen.getByText('32')).toBeInTheDocument()
    expect(screen.getByText('llama-7b')).toBeInTheDocument()
  })

  it('config values are displayed in monospace', () => {
    const exp = makeExperiment({ config: '{"model": "llama-7b"}' })
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<ConfigPanel />)
    const valueElement = screen.getByTestId('config-value-model')
    expect(valueElement.className).toContain('config-item__value')
  })

  it('config items have pointer cursor class', () => {
    const exp = makeExperiment({ config: '{"model": "llama-7b"}' })
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<ConfigPanel />)
    const configItem = screen.getByTestId('config-item-model')
    expect(configItem.className).toContain('config-item')
  })

  it('handles invalid JSON gracefully', () => {
    const exp = makeExperiment({ config: '{not valid json}' })
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<ConfigPanel />)
    expect(screen.getByText('No configuration data')).toBeInTheDocument()
  })

  it('shows system stats placeholder section', () => {
    const exp = makeExperiment()
    useExperimentStore.setState({
      experiments: [exp],
      selectedId: exp.id,
    })
    render(<ConfigPanel />)
    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByText('GPU')).toBeInTheDocument()
    expect(screen.getByText('VRAM')).toBeInTheDocument()
  })
})
