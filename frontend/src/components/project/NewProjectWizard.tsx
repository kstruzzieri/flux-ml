import { useReducer, useEffect, useCallback } from 'react'
import { wizardReducer, createInitialState, buildLocation } from './wizardReducer'
import { WizardStepTemplate } from './WizardStepTemplate'
import { WizardStepDetails } from './WizardStepDetails'
import { WizardStepReview } from './WizardStepReview'
import { WizardSummaryRail } from './WizardSummaryRail'
import {
  CreateProject,
  OpenFolderDialog,
  GetDefaultProjectsDir,
} from '../../../wailsjs/go/main/App'
import './NewProjectWizard.css'

const STEP_LABELS = ['Template', 'Details', 'Review'] as const

interface NewProjectWizardProps {
  onClose: () => void
  onCreated: () => void
}

export function NewProjectWizard({ onClose, onCreated }: NewProjectWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, '', createInitialState)

  useEffect(() => {
    GetDefaultProjectsDir()
      .then((dir) => {
        dispatch({ type: 'SET_DEFAULT_DIR', dir })
      })
      .catch(() => {
        // Fall back to empty — user will need to browse
      })
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !state.creating) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, state.creating])

  const handleBackdropClick = useCallback(() => {
    if (!state.creating) onClose()
  }, [onClose, state.creating])

  const handleContinue = useCallback(() => {
    if (state.step < 3) {
      dispatch({ type: 'GO_TO_STEP', step: (state.step + 1) as 1 | 2 | 3 })
    }
  }, [state.step])

  const handleBack = useCallback(() => {
    if (state.step > 1) {
      dispatch({ type: 'GO_TO_STEP', step: (state.step - 1) as 1 | 2 | 3 })
    }
  }, [state.step])

  const handleCreate = useCallback(async () => {
    if (!state.template) return
    dispatch({ type: 'CREATE_START' })
    try {
      await CreateProject(state.projectName, state.location, state.template, state.seedDemo)
      dispatch({ type: 'CREATE_SUCCESS' })
      onCreated()
    } catch (err) {
      dispatch({
        type: 'CREATE_ERROR',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }, [state.template, state.projectName, state.location, state.seedDemo, onCreated])

  const canContinue =
    (state.step === 1 && state.template !== null) ||
    (state.step === 2 && state.projectName.trim() !== '' && state.location.trim() !== '')

  const handleBrowseLocation = useCallback(async () => {
    try {
      const dir = await OpenFolderDialog()
      if (!dir) return

      dispatch({ type: 'SET_DEFAULT_DIR', dir })
      dispatch({
        type: 'SET_LOCATION',
        location: buildLocation(state.projectName, dir),
        manual: false,
      })
    } catch (err) {
      console.error('Browse location failed:', err)
    }
  }, [state.projectName])

  return (
    <div className="wizard-overlay">
      <div
        className="wizard-overlay__backdrop"
        data-testid="wizard-backdrop"
        onClick={handleBackdropClick}
      />
      <div className="wizard" role="dialog" aria-modal="true" aria-label="New Project">
        <div className="wizard__steps">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1
            const isCompleted = stepNum < state.step
            const isActive = stepNum === state.step
            return (
              <button
                key={label}
                className={`wizard__step-indicator ${isCompleted ? 'wizard__step-indicator--completed' : ''} ${isActive ? 'wizard__step-indicator--active' : ''}`}
                disabled={stepNum > state.step}
                onClick={() =>
                  stepNum <= state.step &&
                  dispatch({ type: 'GO_TO_STEP', step: stepNum as 1 | 2 | 3 })
                }
              >
                <span className="wizard__step-dot" />
                <span className="wizard__step-label">{label}</span>
              </button>
            )
          })}
        </div>

        <div className="wizard__body">
          <div className="wizard__content">
            {state.step === 1 && (
              <WizardStepTemplate
                selectedTemplate={state.template}
                onSelectTemplate={(t) => dispatch({ type: 'SET_TEMPLATE', template: t })}
              />
            )}
            {state.step === 2 && (
              <WizardStepDetails
                projectName={state.projectName}
                location={state.location}
                seedDemo={state.seedDemo}
                onNameChange={(name) => dispatch({ type: 'SET_PROJECT_NAME', name })}
                onLocationChange={(location, manual) =>
                  dispatch({ type: 'SET_LOCATION', location, manual })
                }
                onIncludeStarterChange={(include) => dispatch({ type: 'SET_SEED_DEMO', include })}
                onBrowseLocation={handleBrowseLocation}
              />
            )}
            {state.step === 3 && state.template && (
              <WizardStepReview
                template={state.template}
                projectName={state.projectName}
                location={state.location}
                seedDemo={state.seedDemo}
              />
            )}
          </div>
          {state.step === 2 && (
            <WizardSummaryRail
              template={state.template}
              projectName={state.projectName}
              location={state.location}
              seedDemo={state.seedDemo}
            />
          )}
        </div>

        <div className="wizard__footer">
          {state.step > 1 && (
            <button
              className="button button--secondary button--md"
              onClick={handleBack}
              disabled={state.creating}
            >
              Back
            </button>
          )}
          <div className="wizard__footer-spacer" />
          {state.step < 3 ? (
            <button
              className="button button--primary button--md"
              onClick={handleContinue}
              disabled={!canContinue}
            >
              Continue
            </button>
          ) : (
            <button
              className="button button--primary button--md"
              onClick={handleCreate}
              disabled={state.creating || !state.projectName.trim()}
            >
              {state.creating ? 'Creating...' : 'Create Project'}
            </button>
          )}
        </div>

        {state.error && (
          <div className="wizard__error" role="alert">
            {state.error}
          </div>
        )}
      </div>
    </div>
  )
}
