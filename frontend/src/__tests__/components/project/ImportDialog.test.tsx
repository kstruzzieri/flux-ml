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

  it('shows starter experiments toggle defaulting to off', () => {
    render(<ImportDialog {...defaultProps} />)
    const toggle = screen.getByLabelText(/include starter experiments/i)
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
})
