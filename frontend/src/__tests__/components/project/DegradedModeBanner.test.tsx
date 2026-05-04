import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DegradedModeBanner } from '@components/project'

describe('DegradedModeBanner', () => {
  it('renders warning message', () => {
    render(<DegradedModeBanner />)
    expect(screen.getByText(/flux\.yaml has errors/i)).toBeInTheDocument()
  })

  it('is dismissible', async () => {
    const user = userEvent.setup()
    render(<DegradedModeBanner />)
    const dismiss = screen.getByRole('button', { name: /dismiss/i })
    await user.click(dismiss)
    expect(screen.queryByText(/flux\.yaml has errors/i)).not.toBeInTheDocument()
  })

  it('has role=alert for accessibility', () => {
    render(<DegradedModeBanner />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
