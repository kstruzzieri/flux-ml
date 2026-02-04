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

    // Wait for async state update to complete
    await waitFor(() => {
      expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    })

    // Header (banner role)
    expect(screen.getByRole('banner')).toBeInTheDocument()

    // Activity bar (navigation role)
    expect(screen.getByRole('navigation', { name: /activity bar/i })).toBeInTheDocument()

    // Main navigation
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()

    // Panel titles exist (use getAllByText since some names appear in multiple places)
    expect(screen.getByText('Files')).toBeInTheDocument()
    expect(screen.getByText('Inspector')).toBeInTheDocument()
    expect(screen.getByText('Configuration')).toBeInTheDocument()
  })

  it('displays Flux branding in header', async () => {
    render(<AppShell />)

    // Scope to header to avoid banner text
    const header = screen.getByRole('banner')
    expect(within(header).getByText('Flux')).toBeInTheDocument()

    // Wait for async state update to complete
    await waitFor(() => {
      expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    })
  })

  it('displays navigation items in header', async () => {
    render(<AppShell />)

    // Header nav items - scope to main navigation
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    expect(within(nav).getByRole('button', { name: /experiments/i })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /compare/i })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /data/i })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /code/i })).toBeInTheDocument()

    // Wait for async state update to complete
    await waitFor(() => {
      expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    })
  })

  it('displays activity bar items', async () => {
    render(<AppShell />)

    // Activity bar has icon buttons - scope to activity bar
    const activityBar = screen.getByRole('navigation', { name: /activity bar/i })
    expect(within(activityBar).getByRole('button', { name: /experiments/i })).toBeInTheDocument()
    expect(within(activityBar).getByRole('button', { name: /compare/i })).toBeInTheDocument()
    expect(within(activityBar).getByRole('button', { name: /data/i })).toBeInTheDocument()
    expect(within(activityBar).getByRole('button', { name: /code/i })).toBeInTheDocument()
    expect(within(activityBar).getByRole('button', { name: /settings/i })).toBeInTheDocument()

    // Wait for async state update to complete
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

    // Output panel tabs
    expect(screen.getByRole('button', { name: /^output$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^logs$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^terminal$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new terminal/i })).toBeInTheDocument()

    // Wait for async state update to complete
    await waitFor(() => {
      expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    })
  })
})
