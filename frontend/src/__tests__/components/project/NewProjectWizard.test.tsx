import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewProjectWizard } from '@components/project'
import {
  __resetMockState,
  __getLastCreateProjectCall,
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

async function renderWizard() {
  await act(async () => {
    render(<NewProjectWizard {...defaultProps} />)
    await Promise.resolve()
  })
}

function expectProjectPath(path: string) {
  expect(screen.getAllByText(path).length).toBeGreaterThan(0)
}

describe('NewProjectWizard', () => {
  describe('Modal shell', () => {
    it('renders as a modal dialog', async () => {
      await renderWizard()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('renders step indicator with 3 steps', async () => {
      await renderWizard()
      expect(screen.getByText('Template')).toBeInTheDocument()
      expect(screen.getByText('Details')).toBeInTheDocument()
      expect(screen.getByText('Review')).toBeInTheDocument()
    })

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()
      await renderWizard()
      await user.click(screen.getByTestId('wizard-backdrop'))
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when Escape is pressed', async () => {
      const user = userEvent.setup()
      await renderWizard()
      await user.keyboard('{Escape}')
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup()
      await renderWizard()
      await user.click(screen.getByRole('button', { name: /cancel/i }))
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Step 1: Template', () => {
    it('renders template heading', async () => {
      await renderWizard()
      expect(screen.getByText('What kind of project?')).toBeInTheDocument()
    })

    it('renders selectable template cards', async () => {
      await renderWizard()
      expect(screen.getByRole('button', { name: /reward model/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /blank/i })).toBeInTheDocument()
    })

    it('renders coming-soon templates as disabled', async () => {
      await renderWizard()
      expect(screen.getByText(/classification/i)).toBeInTheDocument()
      expect(screen.getByText(/fine-tuning/i)).toBeInTheDocument()
    })

    it('Continue button is disabled until a template is selected', async () => {
      await renderWizard()
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
    })

    it('enables Continue after selecting a template', async () => {
      const user = userEvent.setup()
      await renderWizard()
      await user.click(screen.getByRole('button', { name: /reward model/i }))
      expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled()
    })

    it('advances to step 2 when Continue is clicked', async () => {
      const user = userEvent.setup()
      await renderWizard()
      await user.click(screen.getByRole('button', { name: /reward model/i }))
      await user.click(screen.getByRole('button', { name: /continue/i }))
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
    })
  })

  describe('Step 2: Details', () => {
    async function advanceToStep2() {
      const user = userEvent.setup()
      await renderWizard()
      await user.click(screen.getByRole('button', { name: /reward model/i }))
      await user.click(screen.getByRole('button', { name: /continue/i }))
      return user
    }

    it('shows project name pre-filled from template', async () => {
      await advanceToStep2()
      const nameInput = screen.getByLabelText(/project name/i)
      expect(nameInput).toHaveValue('reward-model-v1')
    })

    it('shows projects folder with auto-generated project path', async () => {
      await advanceToStep2()
      const projectsFolderInput = screen.getByLabelText(/projects folder/i)
      expect(projectsFolderInput).toHaveValue('/tmp/projects')
      expectProjectPath('/tmp/projects/reward-model-v1')
    })

    it('auto-updates location when name changes (before manual edit)', async () => {
      const user = await advanceToStep2()
      const nameInput = screen.getByLabelText(/project name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'my-custom-name')
      expectProjectPath('/tmp/projects/my-custom-name')
    })

    it('uses the projects folder as the base path', async () => {
      const user = await advanceToStep2()
      const projectsFolderInput = screen.getByLabelText(/projects folder/i)
      await user.clear(projectsFolderInput)
      await user.type(projectsFolderInput, '/custom/projects')
      const nameInput = screen.getByLabelText(/project name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'changed-name')
      expect(projectsFolderInput).toHaveValue('/custom/projects')
      expectProjectPath('/custom/projects/changed-name')
    })

    it('shows add demo experiments toggle', async () => {
      await advanceToStep2()
      expect(screen.getByLabelText(/add demo experiments to flux/i)).toBeInTheDocument()
      expect(
        screen.getByText(/seeds flux's local database with sample runs for this project/i)
      ).toBeInTheDocument()
    })

    it('appends the generated project directory after browsing for a parent folder', async () => {
      const user = await advanceToStep2()
      __setOpenFolderDialogResult('/custom/projects')

      await user.click(screen.getByRole('button', { name: /browse/i }))

      const projectsFolderInput = screen.getByLabelText(/projects folder/i)
      expect(projectsFolderInput).toHaveValue('/custom/projects')
      expectProjectPath('/custom/projects/reward-model-v1')

      const nameInput = screen.getByLabelText(/project name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Renamed Project')

      expectProjectPath('/custom/projects/renamed-project')
    })

    it('has Back button that returns to step 1', async () => {
      const user = await advanceToStep2()
      await user.click(screen.getByRole('button', { name: /back/i }))
      expect(screen.getByText('What kind of project?')).toBeInTheDocument()
    })

    it('defaults blank projects to no demo experiments', async () => {
      const user = userEvent.setup()
      await renderWizard()
      await user.click(screen.getByRole('button', { name: /blank empty project/i }))
      await user.click(screen.getByRole('button', { name: /continue/i }))

      expect(screen.getByLabelText(/add demo experiments to flux/i)).not.toBeChecked()
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
      await renderWizard()
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

    it('creates blank projects without demo experiments by default', async () => {
      const user = userEvent.setup()
      await renderWizard()
      await user.click(screen.getByRole('button', { name: /blank empty project/i }))
      await user.click(screen.getByRole('button', { name: /continue/i }))
      await user.click(screen.getByRole('button', { name: /continue/i }))
      await user.click(screen.getByRole('button', { name: /create project/i }))

      expect(__getLastCreateProjectCall()).toMatchObject({
        template: 'blank',
        seedDemo: false,
      })
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
