import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Header } from '@components/layout'

describe('Header (Title Bar)', () => {
  it('renders Flux logo and title', () => {
    render(<Header />)

    const header = screen.getByRole('banner')
    expect(within(header).getByText('Flux')).toBeInTheDocument()
  })

  it('renders workspace navigation tabs', () => {
    render(<Header />)

    const nav = screen.getByRole('navigation', { name: /workspace navigation/i })
    expect(within(nav).getByRole('button', { name: /experiments/i })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /compare/i })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /data/i })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /code/i })).toBeInTheDocument()
  })

  it('marks the active view tab', () => {
    render(<Header activeView="compare" />)

    const nav = screen.getByRole('navigation', { name: /workspace navigation/i })
    const compareBtn = within(nav).getByRole('button', { name: /compare/i })
    const experimentsBtn = within(nav).getByRole('button', { name: /experiments/i })

    expect(compareBtn).toHaveAttribute('aria-current', 'page')
    expect(experimentsBtn).not.toHaveAttribute('aria-current')
  })

  it('switches active view when tab is clicked', async () => {
    const user = userEvent.setup()
    const onViewChange = jest.fn()
    render(<Header activeView="experiments" onViewChange={onViewChange} />)

    const nav = screen.getByRole('navigation', { name: /workspace navigation/i })
    await user.click(within(nav).getByRole('button', { name: /compare/i }))

    expect(onViewChange).toHaveBeenCalledWith('compare')
  })

  it('displays running experiments count when greater than zero', () => {
    render(<Header runningCount={3} />)

    expect(screen.getByText('3 running')).toBeInTheDocument()
  })

  it('displays alert count with warning indicator when greater than zero', () => {
    render(<Header alertCount={2} />)

    expect(screen.getByText('2 alerts')).toBeInTheDocument()
    const alertStatus = screen.getByText('2 alerts').closest('.titlebar__status')
    expect(alertStatus).toHaveClass('titlebar__status--warning')
  })

  it('displays singular "alert" when count is 1', () => {
    render(<Header alertCount={1} />)

    expect(screen.getByText('1 alert')).toBeInTheDocument()
  })

  it('displays singular "running" when count is 1', () => {
    render(<Header runningCount={1} />)

    expect(screen.getByText('1 running')).toBeInTheDocument()
  })

  it('hides running status when count is zero', () => {
    render(<Header runningCount={0} alertCount={0} />)

    expect(screen.queryByText(/running/i)).not.toBeInTheDocument()
  })

  it('hides alert status when count is zero', () => {
    render(<Header runningCount={0} alertCount={0} />)

    expect(screen.queryByText(/alert/i)).not.toBeInTheDocument()
  })

  it('displays command palette keyboard shortcut', () => {
    render(<Header />)

    expect(screen.getByText('⌘K')).toBeInTheDocument()
  })

  it('triggers command palette callback when shortcut is clicked', async () => {
    const user = userEvent.setup()
    const onCommandPalette = jest.fn()
    render(<Header onCommandPalette={onCommandPalette} />)

    await user.click(screen.getByText('⌘K').closest('button')!)

    expect(onCommandPalette).toHaveBeenCalled()
  })

  it('displays version when provided', () => {
    render(<Header version="0.1.0" />)

    expect(screen.getByText('v0.1.0')).toBeInTheDocument()
  })
})
