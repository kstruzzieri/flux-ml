import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectSwitcher } from '@components/project'

const defaultProps = {
  projectName: 'reward-lab',
  degraded: false,
  recentProjects: [{ path: '/tmp/other-proj', name: 'other-proj' }],
  onNewProject: jest.fn(),
  onOpenFolder: jest.fn(),
  onOpenExisting: jest.fn(),
  onCloseProject: jest.fn(),
  onSwitchProject: jest.fn(),
  onRemoveRecentProject: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ProjectSwitcher', () => {
  it('renders the project name in the pill', () => {
    render(<ProjectSwitcher {...defaultProps} />)
    expect(screen.getByText('reward-lab')).toBeInTheDocument()
  })

  it('shows green dot when not degraded', () => {
    render(<ProjectSwitcher {...defaultProps} />)
    const dot = screen.getByTestId('project-status-dot')
    expect(dot).toHaveClass('project-switcher__dot--healthy')
  })

  it('shows amber dot when degraded', () => {
    render(<ProjectSwitcher {...defaultProps} degraded={true} />)
    const dot = screen.getByTestId('project-status-dot')
    expect(dot).toHaveClass('project-switcher__dot--degraded')
  })

  it('opens dropdown on click', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /project menu/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('renders action items in dropdown', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /project menu/i }))
    const menu = screen.getByRole('menu')
    expect(within(menu).getByText(/new project/i)).toBeInTheDocument()
    expect(within(menu).getByText(/open folder/i)).toBeInTheDocument()
    expect(within(menu).getByText(/open existing project/i)).toBeInTheDocument()
    expect(within(menu).getByText(/close project/i)).toBeInTheDocument()
  })

  it('renders recent projects in dropdown (excluding current)', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /project menu/i }))
    expect(screen.getByText('other-proj')).toBeInTheDocument()
  })

  it('closes when the trigger is clicked a second time', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)
    const trigger = screen.getByRole('button', { name: /project menu/i })
    await user.click(trigger)
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await user.click(trigger)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes dropdown on Escape', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /project menu/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('calls onCloseProject when Close Project is clicked', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /project menu/i }))
    await user.click(screen.getByText(/close project/i))
    expect(defaultProps.onCloseProject).toHaveBeenCalledTimes(1)
  })

  it('calls onSwitchProject when a recent project is clicked', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /project menu/i }))
    await user.click(screen.getByText('other-proj'))
    expect(defaultProps.onSwitchProject).toHaveBeenCalledWith('/tmp/other-proj')
  })
})
