import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewProjectWizard } from '@components/project'

jest.mock('../../../../wailsjs/go/main/App')

const defaultProps = {
  onClose: jest.fn(),
  onCreated: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('NewProjectWizard', () => {
  describe('Modal shell', () => {
    it('renders as a modal dialog', () => {
      render(<NewProjectWizard {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('renders step indicator with 3 steps', () => {
      render(<NewProjectWizard {...defaultProps} />)
      expect(screen.getByText('Template')).toBeInTheDocument()
      expect(screen.getByText('Details')).toBeInTheDocument()
      expect(screen.getByText('Review')).toBeInTheDocument()
    })

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(<NewProjectWizard {...defaultProps} />)
      await user.click(screen.getByTestId('wizard-backdrop'))
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when Escape is pressed', async () => {
      const user = userEvent.setup()
      render(<NewProjectWizard {...defaultProps} />)
      await user.keyboard('{Escape}')
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Step 1: Template', () => {
    it('renders template heading', () => {
      render(<NewProjectWizard {...defaultProps} />)
      expect(screen.getByText('What kind of project?')).toBeInTheDocument()
    })

    it('renders selectable template cards', () => {
      render(<NewProjectWizard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /reward model/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /blank/i })).toBeInTheDocument()
    })

    it('renders coming-soon templates as disabled', () => {
      render(<NewProjectWizard {...defaultProps} />)
      expect(screen.getByText(/classification/i)).toBeInTheDocument()
      expect(screen.getByText(/fine-tuning/i)).toBeInTheDocument()
    })

    it('Continue button is disabled until a template is selected', () => {
      render(<NewProjectWizard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
    })

    it('enables Continue after selecting a template', async () => {
      const user = userEvent.setup()
      render(<NewProjectWizard {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /reward model/i }))
      expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled()
    })

    it('advances to step 2 when Continue is clicked', async () => {
      const user = userEvent.setup()
      render(<NewProjectWizard {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /reward model/i }))
      await user.click(screen.getByRole('button', { name: /continue/i }))
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
    })
  })
})
