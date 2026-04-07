import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WelcomeScreen } from '@components/project'

const defaultProps = {
  recentProjects: [],
  onNewProject: jest.fn(),
  onOpenFolder: jest.fn(),
  onOpenExisting: jest.fn(),
  onBrowseExperiments: jest.fn(),
  onOpenRecentProject: jest.fn(),
  onRemoveRecentProject: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('WelcomeScreen', () => {
  it('renders the Flux branding and tagline', () => {
    render(<WelcomeScreen {...defaultProps} />)
    expect(screen.getByText('Flux')).toBeInTheDocument()
    expect(screen.getByText('The ML development environment')).toBeInTheDocument()
  })

  it('renders all action buttons', () => {
    render(<WelcomeScreen {...defaultProps} />)
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open folder/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open existing project/i })).toBeInTheDocument()
  })

  it('renders shortcut hints on action buttons', () => {
    render(<WelcomeScreen {...defaultProps} />)
    expect(screen.getByText('⌘N')).toBeInTheDocument()
    expect(screen.getByText('⌘O')).toBeInTheDocument()
    expect(screen.getByText('⇧⌘O')).toBeInTheDocument()
  })

  it('calls onNewProject when New Project is clicked', async () => {
    const user = userEvent.setup()
    render(<WelcomeScreen {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /new project/i }))
    expect(defaultProps.onNewProject).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenFolder when Open Folder is clicked', async () => {
    const user = userEvent.setup()
    render(<WelcomeScreen {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /open folder/i }))
    expect(defaultProps.onOpenFolder).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenExisting when Open Existing Project is clicked', async () => {
    const user = userEvent.setup()
    render(<WelcomeScreen {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /open existing project/i }))
    expect(defaultProps.onOpenExisting).toHaveBeenCalledTimes(1)
  })

  it('renders Browse Existing Experiments link', async () => {
    const user = userEvent.setup()
    render(<WelcomeScreen {...defaultProps} />)
    const link = screen.getByRole('button', { name: /browse existing experiments/i })
    await user.click(link)
    expect(defaultProps.onBrowseExperiments).toHaveBeenCalledTimes(1)
  })

  it('shows empty state when no recent projects', () => {
    render(<WelcomeScreen {...defaultProps} />)
    expect(screen.getByText(/no recent projects/i)).toBeInTheDocument()
  })

  it('renders recent projects list', () => {
    const recents = [
      { path: '/home/user/project-a', name: 'project-a' },
      { path: '/home/user/project-b', name: 'project-b' },
    ]
    render(<WelcomeScreen {...defaultProps} recentProjects={recents} />)
    expect(screen.getByText('project-a')).toBeInTheDocument()
    expect(screen.getByText('project-b')).toBeInTheDocument()
  })
})
