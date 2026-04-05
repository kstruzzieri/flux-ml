import { render, screen, waitFor, within } from '@testing-library/react'
import { AppShell } from '@components/layout'

// Mock Wails bindings
jest.mock('../../../../wailsjs/go/main/App', () => ({
  GetAppInfo: jest.fn().mockResolvedValue({
    name: 'Flux',
    version: '0.1.0',
  }),
  GetLayout: jest.fn().mockResolvedValue({
    leftWidth: 280,
    rightWidth: 320,
    outputHeight: 180,
    leftTopHeight: 200,
    rightTopHeight: 200,
    leftCollapsed: false,
    rightCollapsed: false,
    outputCollapsed: false,
  }),
  SaveLayout: jest.fn().mockResolvedValue(undefined),
}))

describe('AppShell', () => {
  it('renders all layout regions', async () => {
    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    })

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
    render(<AppShell />)

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
    render(<AppShell />)

    const activityBar = screen.getByRole('navigation', { name: /activity bar/i })
    expect(within(activityBar).getByRole('button', { name: /experiments/i })).toBeInTheDocument()
    expect(within(activityBar).getByRole('button', { name: /compare/i })).toBeInTheDocument()
    expect(within(activityBar).getByRole('button', { name: /data/i })).toBeInTheDocument()
    expect(within(activityBar).getByRole('button', { name: /code/i })).toBeInTheDocument()
    expect(within(activityBar).getByRole('button', { name: /settings/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    })
  })

  it('fetches and displays app version from Go backend', async () => {
    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    })
  })

  it('displays output panel tabs', async () => {
    render(<AppShell />)

    expect(screen.getByRole('button', { name: /^output$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^logs$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^terminal$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new terminal/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    })
  })
})
