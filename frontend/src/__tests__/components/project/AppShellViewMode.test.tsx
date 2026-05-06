import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell } from '@components/layout'
import {
  __resetMockState,
  __setCurrentProjectStatus,
  __setOpenFolderDialogResult,
  __setIsFluxProjectResult,
  __setOpenFolderAsProjectError,
} from '../../../__mocks__/wailsjs/go/main/App'
import { __resetListeners } from '../../../__mocks__/wailsjs/runtime/runtime'
import { useProjectStore, __resetProjectStoreInitialized } from '@stores/projectStore'
import {
  useExperimentStore,
  __resetInitialized as __resetExperimentStoreInitialized,
} from '@stores/experimentStore'
import { project } from '../../../__mocks__/wailsjs/go/models'

beforeEach(() => {
  __resetMockState()
  __resetListeners()
  __resetProjectStoreInitialized()
  __resetExperimentStoreInitialized()
  useExperimentStore.setState({
    experiments: [],
    selectedId: null,
    loading: false,
    error: null,
  })
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

  it('shows a visible error when Open Existing selects a non-Flux directory', async () => {
    const user = userEvent.setup()
    __setOpenFolderDialogResult('/tmp/not-a-project')
    __setIsFluxProjectResult(false)

    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /open existing project/i }))

    expect(
      screen.getByText(/no flux\.yaml found in this directory\. use "open folder" to import/i)
    ).toBeInTheDocument()
  })

  it('shows inline import errors instead of silently swallowing them', async () => {
    const user = userEvent.setup()
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    __setOpenFolderDialogResult('/tmp/raw-data')
    __setIsFluxProjectResult(false)
    __setOpenFolderAsProjectError('Folder is read-only')

    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /open folder/i }))
    await user.click(screen.getByRole('button', { name: /create & open/i }))

    expect(await screen.findByText(/folder is read-only/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /import folder/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create & open/i })).not.toBeDisabled()
    errorSpy.mockRestore()
  })

  it('does not fire open-existing shortcut while typing in a text field', async () => {
    __setOpenFolderDialogResult('/tmp/not-a-project')
    __setIsFluxProjectResult(false)

    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    fireEvent.keyDown(input, { key: 'O', metaKey: true, shiftKey: true })

    expect(
      screen.queryByText(/no flux\.yaml found in this directory\. use "open folder" to import/i)
    ).not.toBeInTheDocument()

    input.remove()
  })

  it('does not open a second modal from project shortcuts while a modal is already open', async () => {
    const user = userEvent.setup()
    __setOpenFolderDialogResult('/tmp/raw-data')
    __setIsFluxProjectResult(false)

    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new project/i }))
    expect(screen.getByRole('dialog', { name: /new project/i })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'o', metaKey: true })

    expect(screen.queryByRole('dialog', { name: /import folder/i })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /new project/i })).toBeInTheDocument()
  })
})
