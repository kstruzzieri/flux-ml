import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NoProjectBanner } from '@components/project'

describe('NoProjectBanner', () => {
  it('renders a message about browsing without a project', () => {
    render(<NoProjectBanner onOpenProject={jest.fn()} />)
    expect(screen.getByText(/browsing experiments without a project/i)).toBeInTheDocument()
  })

  it('has an Open Project action', async () => {
    const onOpenProject = jest.fn()
    const user = userEvent.setup()
    render(<NoProjectBanner onOpenProject={onOpenProject} />)
    await user.click(screen.getByRole('button', { name: /open a project/i }))
    expect(onOpenProject).toHaveBeenCalledTimes(1)
  })
})
