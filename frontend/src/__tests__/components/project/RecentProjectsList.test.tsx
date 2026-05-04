import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecentProjectsList } from '@components/project'

const defaultProps = {
  projects: [
    { path: '/home/user/alpha', name: 'alpha' },
    { path: '/home/user/beta', name: 'beta' },
  ],
  onOpen: jest.fn(),
  onRemove: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('RecentProjectsList', () => {
  it('renders project names', () => {
    render(<RecentProjectsList {...defaultProps} />)
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('beta')).toBeInTheDocument()
  })

  it('calls onOpen when a project row is clicked', async () => {
    const user = userEvent.setup()
    render(<RecentProjectsList {...defaultProps} />)
    await user.click(screen.getByText('alpha'))
    expect(defaultProps.onOpen).toHaveBeenCalledWith('/home/user/alpha')
  })

  it('shows error state on a row', () => {
    const projects = [
      { path: '/home/user/alpha', name: 'alpha', error: 'Project not found' },
      { path: '/home/user/beta', name: 'beta' },
    ]
    render(<RecentProjectsList {...defaultProps} projects={projects} />)
    expect(screen.getByText('Project not found')).toBeInTheDocument()
  })

  it('shows remove button on error rows', async () => {
    const user = userEvent.setup()
    const projects = [{ path: '/home/user/alpha', name: 'alpha', error: 'Project not found' }]
    render(<RecentProjectsList {...defaultProps} projects={projects} />)
    const removeBtn = screen.getByRole('button', { name: /remove from list/i })
    await user.click(removeBtn)
    expect(defaultProps.onRemove).toHaveBeenCalledWith('/home/user/alpha')
  })

  it('excludes projects in excludePaths', () => {
    render(<RecentProjectsList {...defaultProps} excludePaths={new Set(['/home/user/alpha'])} />)
    expect(screen.queryByText('alpha')).not.toBeInTheDocument()
    expect(screen.getByText('beta')).toBeInTheDocument()
  })

  it('shows empty state when no projects', () => {
    render(<RecentProjectsList {...defaultProps} projects={[]} />)
    expect(screen.getByText(/no recent projects/i)).toBeInTheDocument()
  })
})
