import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportDialog } from '@components/project'

const defaultProps = {
  folderPath: '/home/user/ml-project',
  folderName: 'ml-project',
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ImportDialog', () => {
  it('renders the folder path context', () => {
    render(<ImportDialog {...defaultProps} />)
    expect(screen.getByText(/flux.yaml/)).toBeInTheDocument()
  })

  it('shows editable project name pre-filled with folder basename', () => {
    render(<ImportDialog {...defaultProps} />)
    expect(screen.getByLabelText(/project name/i)).toHaveValue('ml-project')
  })

  it('shows demo experiments toggle defaulting to off', () => {
    render(<ImportDialog {...defaultProps} />)
    const toggle = screen.getByLabelText(/add demo experiments to flux/i)
    expect(toggle).not.toBeChecked()
  })

  it('calls onConfirm with name and seedDemo on Create & Open', async () => {
    const user = userEvent.setup()
    render(<ImportDialog {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /create & open/i }))
    expect(defaultProps.onConfirm).toHaveBeenCalledWith('ml-project', false)
  })

  it('calls onConfirm with edited name', async () => {
    const user = userEvent.setup()
    render(<ImportDialog {...defaultProps} />)
    const nameInput = screen.getByLabelText(/project name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'custom-name')
    await user.click(screen.getByRole('button', { name: /create & open/i }))
    expect(defaultProps.onConfirm).toHaveBeenCalledWith('custom-name', false)
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<ImportDialog {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows inline error text when provided', () => {
    render(<ImportDialog {...defaultProps} error="Folder is read-only" />)
    expect(screen.getByText(/folder is read-only/i)).toBeInTheDocument()
  })

  it('shows loading state while submitting', () => {
    render(<ImportDialog {...defaultProps} submitting={true} />)
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    expect(screen.getByLabelText(/project name/i)).toBeDisabled()
  })
})
