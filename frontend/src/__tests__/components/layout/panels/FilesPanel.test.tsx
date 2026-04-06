import { render, screen } from '@testing-library/react'
import { FilesPanel } from '@components/layout/panels/FilesPanel'
import { useProjectStore, __resetProjectStoreInitialized } from '@stores/projectStore'
import { project } from '../../../../__mocks__/wailsjs/go/models'

function makeProject(overrides: Partial<Record<string, unknown>> = {}): project.Project {
  const now = Math.floor(Date.now() / 1000)
  return new project.Project({
    id: 'proj-1',
    name: 'reward-lab',
    path: '/tmp/reward-lab',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  })
}

beforeEach(() => {
  __resetProjectStoreInitialized()
})

describe('FilesPanel', () => {
  it('renders placeholder when no project is open', () => {
    render(<FilesPanel />)
    expect(screen.getByText('Open a project to view files')).toBeInTheDocument()
    expect(screen.getByText('No project')).toBeInTheDocument()
  })

  it('renders active project details when a project is open', () => {
    const currentProject = makeProject()
    useProjectStore.setState({
      currentProject,
      degraded: false,
      configError: '',
      warnings: [],
    })

    render(<FilesPanel />)

    expect(screen.getAllByText('reward-lab')).toHaveLength(3)
    expect(screen.getByText('/tmp/reward-lab')).toBeInTheDocument()
    expect(
      screen.getByText('File browser is not available yet for this project.')
    ).toBeInTheDocument()
  })

  it('surfaces degraded-mode config errors and warnings', () => {
    useProjectStore.setState({
      currentProject: makeProject({ name: 'broken-project', path: '/tmp/broken-project' }),
      degraded: true,
      configError: 'invalid flux.yaml',
      warnings: ['missing required field: name'],
    })

    render(<FilesPanel />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Opened in degraded mode: invalid flux.yaml'
    )
    expect(screen.getByText('missing required field: name')).toBeInTheDocument()
    expect(screen.getAllByText('broken-project')).toHaveLength(2)
  })
})
