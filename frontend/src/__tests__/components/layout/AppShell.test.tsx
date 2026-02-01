import { render, screen, waitFor } from '@testing-library/react'
import { AppShell } from '@components/layout'

// Mock Wails bindings
jest.mock('../../../../wailsjs/go/main/App', () => ({
  GetAppInfo: jest.fn().mockResolvedValue({
    name: 'Flux',
    version: '0.1.0',
  }),
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

    // Left sidebar
    expect(screen.getByRole('complementary', { name: /sidebar/i })).toBeInTheDocument()

    // Main content
    expect(screen.getByRole('main')).toBeInTheDocument()

    // Right inspector
    expect(screen.getByRole('complementary', { name: /inspector/i })).toBeInTheDocument()

    // Bottom panel (contentinfo role)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('displays Flux branding in header', async () => {
    render(<AppShell />)

    expect(screen.getByText('Flux')).toBeInTheDocument()

    // Wait for async state update to complete
    await waitFor(() => {
      expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    })
  })

  it('displays navigation items', async () => {
    render(<AppShell />)

    expect(screen.getByRole('button', { name: /experiments/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /compare/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /data/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /code/i })).toBeInTheDocument()

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

  it('displays bottom panel tabs', async () => {
    render(<AppShell />)

    expect(screen.getByRole('tab', { name: /training output/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /terminal/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /problems/i })).toBeInTheDocument()

    // Wait for async state update to complete
    await waitFor(() => {
      expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    })
  })
})
