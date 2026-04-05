import { render, screen, fireEvent, within } from '@testing-library/react'
import App from '../components/App'

describe('Navigation', () => {
  const getWorkspaceNav = () => screen.getByRole('navigation', { name: /workspace navigation/i })

  describe('View switching via workspace tabs', () => {
    it('switches view when clicking workspace tab', () => {
      render(<App />)
      const nav = getWorkspaceNav()

      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()

      fireEvent.click(within(nav).getByRole('button', { name: /compare/i }))

      expect(screen.getByTestId('compare-view')).toBeInTheDocument()
      expect(screen.queryByTestId('experiments-view')).not.toBeInTheDocument()
    })

    it('highlights active tab', () => {
      render(<App />)
      const nav = getWorkspaceNav()

      const experimentsTab = within(nav).getByRole('button', { name: /experiments/i })
      const compareTab = within(nav).getByRole('button', { name: /compare/i })

      expect(experimentsTab).toHaveClass('titlebar__tab--active')
      expect(compareTab).not.toHaveClass('titlebar__tab--active')

      fireEvent.click(compareTab)

      expect(compareTab).toHaveClass('titlebar__tab--active')
      expect(experimentsTab).not.toHaveClass('titlebar__tab--active')
    })

    it('switches to all four views', () => {
      render(<App />)
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
    it('switches to Experiments with Cmd+1', () => {
      render(<App />)

      fireEvent.click(screen.getByTestId('activity-compare'))
      expect(screen.getByTestId('compare-view')).toBeInTheDocument()

      fireEvent.keyDown(document, { key: '1', metaKey: true })

      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()
    })

    it('switches to Compare with Cmd+2', () => {
      render(<App />)
      fireEvent.keyDown(document, { key: '2', metaKey: true })
      expect(screen.getByTestId('compare-view')).toBeInTheDocument()
    })

    it('switches to Data with Cmd+3', () => {
      render(<App />)
      fireEvent.keyDown(document, { key: '3', metaKey: true })
      expect(screen.getByTestId('data-view')).toBeInTheDocument()
    })

    it('switches to Code with Cmd+4', () => {
      render(<App />)
      fireEvent.keyDown(document, { key: '4', metaKey: true })
      expect(screen.getByTestId('code-view')).toBeInTheDocument()
    })

    it('also works with Ctrl key (for non-Mac)', () => {
      render(<App />)
      fireEvent.keyDown(document, { key: '2', ctrlKey: true })
      expect(screen.getByTestId('compare-view')).toBeInTheDocument()
    })
  })

  describe('Activity bar navigation', () => {
    it('switches view when clicking activity bar icon', () => {
      render(<App />)

      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('activity-compare'))

      expect(screen.getByTestId('compare-view')).toBeInTheDocument()
    })

    it('highlights active item in activity bar', () => {
      render(<App />)

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
