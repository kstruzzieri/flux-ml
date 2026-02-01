import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Header } from '@components/layout'

describe('Header', () => {
  // The logo and title establish brand identity and should always be visible
  // as the primary landmark users see when opening the app.
  it('renders logo and title', () => {
    render(<Header />)

    const header = screen.getByRole('banner')
    expect(within(header).getByText('Flux')).toBeInTheDocument()
  })

  // Navigation tabs are the primary way users switch between views.
  // All four views must be accessible from the header.
  it('renders all navigation tabs', () => {
    render(<Header />)

    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    expect(within(nav).getByRole('button', { name: /experiments/i })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /compare/i })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /data/i })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /code/i })).toBeInTheDocument()
  })

  // Visual indication of the current view is essential for user orientation.
  // The aria-current attribute provides accessibility support for screen readers.
  it('marks the active view tab', () => {
    render(<Header activeView="compare" />)

    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    const compareBtn = within(nav).getByRole('button', { name: /compare/i })
    const experimentsBtn = within(nav).getByRole('button', { name: /experiments/i })

    expect(compareBtn).toHaveAttribute('aria-current', 'page')
    expect(experimentsBtn).not.toHaveAttribute('aria-current')
  })

  // Users must be able to switch views by clicking navigation tabs.
  // The callback pattern allows the parent component to manage view state.
  it('switches active view when nav tab is clicked', async () => {
    const user = userEvent.setup()
    const onViewChange = jest.fn()
    render(<Header activeView="experiments" onViewChange={onViewChange} />)

    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    await user.click(within(nav).getByRole('button', { name: /compare/i }))

    expect(onViewChange).toHaveBeenCalledWith('compare')
  })

  // Running experiments are the primary activity in Flux.
  // Users need at-a-glance visibility of active training runs.
  it('displays running experiments count when greater than zero', () => {
    render(<Header runningCount={3} />)

    expect(screen.getByText('3 running')).toBeInTheDocument()
  })

  // Alerts require visual urgency through warning styling.
  // This draws immediate attention to potential reward hacking or anomalies.
  it('displays alert count with warning indicator when greater than zero', () => {
    render(<Header alertCount={2} />)

    expect(screen.getByText('2 alerts')).toBeInTheDocument()
    // Should have warning styling (status dot with warning class or similar)
    const alertStatus = screen.getByText('2 alerts').closest('.header__status')
    expect(alertStatus).toHaveClass('header__status--warning')
  })

  // Proper grammar improves perceived quality and professionalism.
  // Singular form prevents awkward "1 alerts" display.
  it('displays singular "alert" when count is 1', () => {
    render(<Header alertCount={1} />)

    expect(screen.getByText('1 alert')).toBeInTheDocument()
  })

  // Consistent grammar for running count matches the alert singular handling.
  // Ensures uniform language treatment across all status indicators.
  it('displays singular "running" when count is 1', () => {
    render(<Header runningCount={1} />)

    expect(screen.getByText('1 running')).toBeInTheDocument()
  })

  // Zero-count status indicators add visual noise without value.
  // Hiding them keeps the header clean when there's nothing to report.
  it('hides running status when count is zero', () => {
    render(<Header runningCount={0} alertCount={0} />)

    expect(screen.queryByText(/running/i)).not.toBeInTheDocument()
  })

  // Same principle as hiding running status - reduce visual clutter.
  // Users should only see alerts when there are actual issues.
  it('hides alert status when count is zero', () => {
    render(<Header runningCount={0} alertCount={0} />)

    expect(screen.queryByText(/alert/i)).not.toBeInTheDocument()
  })

  // Command palette is a power-user feature for quick actions.
  // The keyboard shortcut hint teaches users the ⌘K workflow.
  it('displays command palette keyboard shortcut', () => {
    render(<Header />)

    expect(screen.getByText('⌘K')).toBeInTheDocument()
  })

  // The shortcut display should be clickable as an alternative to keyboard.
  // This accommodates users who prefer mouse interaction.
  it('triggers command palette callback when shortcut is clicked', async () => {
    const user = userEvent.setup()
    const onCommandPalette = jest.fn()
    render(<Header onCommandPalette={onCommandPalette} />)

    await user.click(screen.getByText('⌘K').closest('button')!)

    expect(onCommandPalette).toHaveBeenCalled()
  })

  // Version display helps users identify which build they're running.
  // Essential for bug reports and ensuring users have the latest features.
  it('displays version when provided', () => {
    render(<Header version="0.1.0" />)

    expect(screen.getByText('v0.1.0')).toBeInTheDocument()
  })
})
