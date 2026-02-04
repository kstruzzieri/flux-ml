import { render, screen, fireEvent, within } from '@testing-library/react'
import App from '../components/App'

describe('Navigation', () => {
  // Helper to get the header navigation element
  const getHeaderNav = () => screen.getByRole('navigation', { name: /main navigation/i })

  describe('View switching via header tabs', () => {
    it('switches view when clicking header tab', () => {
      render(<App />)
      const nav = getHeaderNav()

      // Initially on Experiments view
      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()

      // Click Compare tab in header nav
      fireEvent.click(within(nav).getByRole('button', { name: /compare/i }))

      // Should show Compare view
      expect(screen.getByTestId('compare-view')).toBeInTheDocument()
      expect(screen.queryByTestId('experiments-view')).not.toBeInTheDocument()
    })

    it('highlights active tab', () => {
      render(<App />)
      const nav = getHeaderNav()

      const experimentsTab = within(nav).getByRole('button', { name: /experiments/i })
      const compareTab = within(nav).getByRole('button', { name: /compare/i })

      // Initially Experiments is active
      expect(experimentsTab).toHaveClass('header__nav-item--active')
      expect(compareTab).not.toHaveClass('header__nav-item--active')

      // Click Compare
      fireEvent.click(compareTab)

      // Now Compare is active
      expect(compareTab).toHaveClass('header__nav-item--active')
      expect(experimentsTab).not.toHaveClass('header__nav-item--active')
    })

    it('switches to all four views', () => {
      render(<App />)
      const nav = getHeaderNav()

      // Start on Experiments
      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()

      // Go to Compare
      fireEvent.click(within(nav).getByRole('button', { name: /compare/i }))
      expect(screen.getByTestId('compare-view')).toBeInTheDocument()

      // Go to Data
      fireEvent.click(within(nav).getByRole('button', { name: /data/i }))
      expect(screen.getByTestId('data-view')).toBeInTheDocument()

      // Go to Code
      fireEvent.click(within(nav).getByRole('button', { name: /code/i }))
      expect(screen.getByTestId('code-view')).toBeInTheDocument()

      // Back to Experiments
      fireEvent.click(within(nav).getByRole('button', { name: /experiments/i }))
      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()
    })
  })

  describe('Keyboard shortcuts', () => {
    it('switches to Experiments with Cmd+1', () => {
      render(<App />)
      const nav = getHeaderNav()

      // Go to Compare first
      fireEvent.click(within(nav).getByRole('button', { name: /compare/i }))
      expect(screen.getByTestId('compare-view')).toBeInTheDocument()

      // Press Cmd+1 to go to Experiments
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

      // Initially on Experiments view
      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()

      // Click Compare icon in activity bar
      fireEvent.click(screen.getByTestId('activity-compare'))

      // Should show Compare view
      expect(screen.getByTestId('compare-view')).toBeInTheDocument()
    })

    it('highlights active item in activity bar', () => {
      render(<App />)

      const experimentsBtn = screen.getByTestId('activity-experiments')
      const compareBtn = screen.getByTestId('activity-compare')

      // Initially Experiments is active
      expect(experimentsBtn).toHaveClass('activity-bar__btn--active')
      expect(compareBtn).not.toHaveClass('activity-bar__btn--active')

      // Click Compare
      fireEvent.click(compareBtn)

      // Now Compare is active
      expect(compareBtn).toHaveClass('activity-bar__btn--active')
      expect(experimentsBtn).not.toHaveClass('activity-bar__btn--active')
    })
  })
})
