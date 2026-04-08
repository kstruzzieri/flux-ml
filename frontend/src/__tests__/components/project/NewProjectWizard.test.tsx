import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewProjectWizard } from '@components/project'
import {
  __resetMockState,
  __setCreateProjectError,
  __setOpenFolderDialogResult,
} from '../../../__mocks__/wailsjs/go/main/App'

const defaultProps = {
  onClose: jest.fn(),
  onCreated: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  __resetMockState()
  __setCreateProjectError(null)
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

  describe('Step 2: Details', () => {
    async function advanceToStep2() {
      const user = userEvent.setup()
      render(<NewProjectWizard {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /reward model/i }))
      await user.click(screen.getByRole('button', { name: /continue/i }))
      return user
    }

    it('shows project name pre-filled from template', async () => {
      await advanceToStep2()
      const nameInput = screen.getByLabelText(/project name/i)
      expect(nameInput).toHaveValue('reward-model-v1')
    })

    it('shows location field with auto-generated path', async () => {
      await advanceToStep2()
      const locationInput = screen.getByLabelText(/location/i)
      expect((locationInput as HTMLInputElement).value).toContain('reward-model-v1')
    })

    it('auto-updates location when name changes (before manual edit)', async () => {
      const user = await advanceToStep2()
      const nameInput = screen.getByLabelText(/project name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'my-custom-name')
      const locationInput = screen.getByLabelText(/location/i)
      expect((locationInput as HTMLInputElement).value).toContain('my-custom-name')
    })

    it('stops auto-sync after manual location edit', async () => {
      const user = await advanceToStep2()
      const locationInput = screen.getByLabelText(/location/i)
      await user.clear(locationInput)
      await user.type(locationInput, '/custom/path')
      const nameInput = screen.getByLabelText(/project name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'changed-name')
      expect(locationInput).toHaveValue('/custom/path')
    })

    it('shows include starter experiments toggle', async () => {
      await advanceToStep2()
      expect(screen.getByLabelText(/include starter experiments/i)).toBeInTheDocument()
    })

    it('appends the generated project directory after browsing for a parent folder', async () => {
      const user = await advanceToStep2()
      __setOpenFolderDialogResult('/custom/projects')

      await user.click(screen.getByRole('button', { name: /browse/i }))

      const locationInput = screen.getByLabelText(/location/i)
      expect(locationInput).toHaveValue('/custom/projects/reward-model-v1')

      const nameInput = screen.getByLabelText(/project name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Renamed Project')

      expect(locationInput).toHaveValue('/custom/projects/renamed-project')
    })

    it('has Back button that returns to step 1', async () => {
      const user = await advanceToStep2()
      await user.click(screen.getByRole('button', { name: /back/i }))
      expect(screen.getByText('What kind of project?')).toBeInTheDocument()
    })

    it('disables Continue when name is empty', async () => {
      const user = await advanceToStep2()
      const nameInput = screen.getByLabelText(/project name/i)
      await user.clear(nameInput)
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
    })
  })

  describe('Step 3: Review & Create', () => {
    async function advanceToStep3() {
      const user = userEvent.setup()
      render(<NewProjectWizard {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /reward model/i }))
      await user.click(screen.getByRole('button', { name: /continue/i }))
      await user.click(screen.getByRole('button', { name: /continue/i }))
      return user
    }

    it('shows summary of all choices', async () => {
      await advanceToStep3()
      expect(screen.getByText('Reward Model')).toBeInTheDocument()
      expect(screen.getByText('reward-model-v1')).toBeInTheDocument()
    })

    it('calls CreateProject on create and closes on success', async () => {
      const user = await advanceToStep3()
      await user.click(screen.getByRole('button', { name: /create project/i }))
      expect(defaultProps.onCreated).toHaveBeenCalledTimes(1)
    })

    it('shows inline error on create failure', async () => {
      __setCreateProjectError(new Error('Directory already exists'))
      const user = await advanceToStep3()
      await user.click(screen.getByRole('button', { name: /create project/i }))
      expect(await screen.findByText(/directory already exists/i)).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(defaultProps.onCreated).not.toHaveBeenCalled()
    })
  })
})
