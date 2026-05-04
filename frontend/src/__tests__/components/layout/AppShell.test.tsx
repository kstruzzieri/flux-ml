import { render, screen, waitFor, within } from '@testing-library/react'
import { AppShell } from '@components/layout'
import { __resetMockState, __setCurrentProjectStatus } from '../../../__mocks__/wailsjs/go/main/App'
import { __resetListeners } from '../../../__mocks__/wailsjs/runtime/runtime'
import { __resetProjectStoreInitialized } from '@stores/projectStore'
import { project } from '../../../__mocks__/wailsjs/go/models'

function makeProject() {
  return new project.Project({
    id: 'shell-proj',
    name: 'shell-test',
    path: '/tmp/shell-test',
    createdAt: 1000,
    updatedAt: 1000,
  })
}

beforeEach(() => {
  __resetMockState()
  __resetListeners()
  __resetProjectStoreInitialized()
  // Set a project so AppShell shows the full shell
  __setCurrentProjectStatus({ project: makeProject() })
})

async function renderAndWaitForShell() {
  render(<AppShell />)
  // Wait for hydration — experiments-view appears once hydrated with a project
  await waitFor(() => {
    expect(screen.getByTestId('experiments-view')).toBeInTheDocument()
  })
}

describe('AppShell', () => {
  it('renders all layout regions', async () => {
    await renderAndWaitForShell()

    // Title bar with workspace tabs
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /workspace navigation/i })).toBeInTheDocument()

    // Activity bar (sidebar)
    expect(screen.getByRole('navigation', { name: /activity bar/i })).toBeInTheDocument()

    // Panel titles
    expect(screen.getByText('Files')).toBeInTheDocument()
    expect(screen.getByText('Inspector')).toBeInTheDocument()
    expect(screen.getByText('Configuration')).toBeInTheDocument()
  })

  it('displays Flux branding and workspace tabs in title bar', async () => {
    await renderAndWaitForShell()

    const header = screen.getByRole('banner')
    expect(within(header).getByText('Flux')).toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: /workspace navigation/i })
    expect(within(nav).getByRole('button', { name: /experiments/i })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /compare/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    })
  })

  it('displays activity bar with navigation items', async () => {
    await renderAndWaitForShell()

    const activityBar = screen.getByRole('navigation', { name: /activity bar/i })
    expect(within(activityBar).getByRole('button', { name: /experiments/i })).toBeInTheDocument()
    expect(within(activityBar).getByRole('button', { name: /compare/i })).toBeInTheDocument()
    expect(within(activityBar).getByRole('button', { name: /data/i })).toBeInTheDocument()
    expect(within(activityBar).getByRole('button', { name: /code/i })).toBeInTheDocument()
    expect(within(activityBar).getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })

  it('fetches and displays app version from Go backend', async () => {
    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    })
  })

  it('displays output panel tabs', async () => {
    await renderAndWaitForShell()

    expect(screen.getByRole('button', { name: /^output$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^logs$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^terminal$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new terminal/i })).toBeInTheDocument()
  })
})
