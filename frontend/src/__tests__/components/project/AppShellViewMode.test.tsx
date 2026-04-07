import { render, screen, waitFor } from '@testing-library/react'
import { AppShell } from '@components/layout'
import { __resetMockState, __setCurrentProjectStatus } from '../../../__mocks__/wailsjs/go/main/App'
import { __resetListeners } from '../../../__mocks__/wailsjs/runtime/runtime'
import { useProjectStore, __resetProjectStoreInitialized } from '@stores/projectStore'
import { project } from '../../../__mocks__/wailsjs/go/models'

beforeEach(() => {
  __resetMockState()
  __resetListeners()
  __resetProjectStoreInitialized()
})

describe('AppShell view mode', () => {
  it('shows welcome screen when no project is open', async () => {
    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })
  })

  it('shows experiments view when project is open', async () => {
    const proj = new project.Project({
      id: 'p1',
      name: 'test-proj',
      path: '/tmp/test',
      createdAt: 1000,
      updatedAt: 1000,
    })
    __setCurrentProjectStatus({ project: proj })

    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('welcome-screen')).not.toBeInTheDocument()
  })

  it('disables nav tabs when in welcome mode', async () => {
    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })

    const nav = screen.getByRole('navigation', { name: /workspace navigation/i })
    const tabs = nav.querySelectorAll('button')
    tabs.forEach((tab) => {
      expect(tab).toBeDisabled()
    })
  })

  it('disables activity bar view buttons when in welcome mode', async () => {
    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })

    expect(screen.getByTestId('activity-experiments')).toBeDisabled()
    expect(screen.getByTestId('activity-compare')).toBeDisabled()
  })

  it('initializes projectStore on mount', async () => {
    render(<AppShell />)

    // projectStore.initialize() should have been called,
    // triggering fetchStatus and fetchRecentProjects
    await waitFor(() => {
      // Store is loaded (loading becomes false)
      expect(useProjectStore.getState().loading).toBe(false)
    })
  })
})
