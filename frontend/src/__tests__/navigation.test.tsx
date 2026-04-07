import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import App from '../components/App'
import { __resetMockState, __setCurrentProjectStatus } from '../__mocks__/wailsjs/go/main/App'
import { __resetListeners } from '../__mocks__/wailsjs/runtime/runtime'
import { __resetProjectStoreInitialized } from '@stores/projectStore'
import { project } from '../__mocks__/wailsjs/go/models'

function makeProject() {
  return new project.Project({
    id: 'nav-proj',
    name: 'nav-test',
    path: '/tmp/nav-test',
    createdAt: 1000,
    updatedAt: 1000,
  })
}

beforeEach(() => {
  __resetMockState()
  __resetListeners()
  __resetProjectStoreInitialized()
  // Set a project so AppShell shows the project view (not welcome)
  __setCurrentProjectStatus({ project: makeProject() })
})

async function renderAndWait() {
  render(<App />)
  await waitFor(() => {
    expect(screen.getByTestId('experiments-view')).toBeInTheDocument()
  })
}

describe('Navigation', () => {
  const getWorkspaceNav = () => screen.getByRole('navigation', { name: /workspace navigation/i })

  describe('View switching via workspace tabs', () => {
    it('switches view when clicking workspace tab', async () => {
      await renderAndWait()
      const nav = getWorkspaceNav()

      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()

      fireEvent.click(within(nav).getByRole('button', { name: /compare/i }))

      expect(screen.getByTestId('compare-view')).toBeInTheDocument()
      expect(screen.queryByTestId('experiments-view')).not.toBeInTheDocument()
    })

    it('highlights active tab', async () => {
      await renderAndWait()
      const nav = getWorkspaceNav()

      const experimentsTab = within(nav).getByRole('button', { name: /experiments/i })
      const compareTab = within(nav).getByRole('button', { name: /compare/i })

      expect(experimentsTab).toHaveClass('titlebar__tab--active')
      expect(compareTab).not.toHaveClass('titlebar__tab--active')

      fireEvent.click(compareTab)

      expect(compareTab).toHaveClass('titlebar__tab--active')
      expect(experimentsTab).not.toHaveClass('titlebar__tab--active')
    })

    it('switches to all four views', async () => {
      await renderAndWait()
      const nav = getWorkspaceNav()

      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()

      fireEvent.click(within(nav).getByRole('button', { name: /compare/i }))
      expect(screen.getByTestId('compare-view')).toBeInTheDocument()

      fireEvent.click(within(nav).getByRole('button', { name: /data/i }))
      expect(screen.getByTestId('data-view')).toBeInTheDocument()

      fireEvent.click(within(nav).getByRole('button', { name: /code/i }))
      expect(screen.getByTestId('code-view')).toBeInTheDocument()

      fireEvent.click(within(nav).getByRole('button', { name: /experiments/i }))
      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()
    })
  })

  describe('Keyboard shortcuts', () => {
    it('switches to Experiments with Cmd+1', async () => {
      await renderAndWait()

      fireEvent.click(screen.getByTestId('activity-compare'))
      expect(screen.getByTestId('compare-view')).toBeInTheDocument()

      fireEvent.keyDown(document, { key: '1', metaKey: true })

      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()
    })

    it('switches to Compare with Cmd+2', async () => {
      await renderAndWait()
      fireEvent.keyDown(document, { key: '2', metaKey: true })
      expect(screen.getByTestId('compare-view')).toBeInTheDocument()
    })

    it('switches to Data with Cmd+3', async () => {
      await renderAndWait()
      fireEvent.keyDown(document, { key: '3', metaKey: true })
      expect(screen.getByTestId('data-view')).toBeInTheDocument()
    })

    it('switches to Code with Cmd+4', async () => {
      await renderAndWait()
      fireEvent.keyDown(document, { key: '4', metaKey: true })
      expect(screen.getByTestId('code-view')).toBeInTheDocument()
    })

    it('also works with Ctrl key (for non-Mac)', async () => {
      await renderAndWait()
      fireEvent.keyDown(document, { key: '2', ctrlKey: true })
      expect(screen.getByTestId('compare-view')).toBeInTheDocument()
    })
  })

  describe('Activity bar navigation', () => {
    it('switches view when clicking activity bar icon', async () => {
      await renderAndWait()

      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('activity-compare'))

      expect(screen.getByTestId('compare-view')).toBeInTheDocument()
    })

    it('highlights active item in activity bar', async () => {
      await renderAndWait()

      const experimentsBtn = screen.getByTestId('activity-experiments')
      const compareBtn = screen.getByTestId('activity-compare')

      expect(experimentsBtn).toHaveClass('activity-bar__btn--active')
      expect(compareBtn).not.toHaveClass('activity-bar__btn--active')

      fireEvent.click(compareBtn)

      expect(compareBtn).toHaveClass('activity-bar__btn--active')
      expect(experimentsBtn).not.toHaveClass('activity-bar__btn--active')
    })
  })
})
