export type TemplateId = 'reward-model' | 'blank'

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  'reward-model': 'Reward Model',
  blank: 'Blank',
}

export interface WizardState {
  step: 1 | 2 | 3
  template: TemplateId | null
  projectName: string
  location: string
  locationManuallyEdited: boolean
  seedDemo: boolean
  creating: boolean
  error: string | null
}

export type WizardAction =
  | { type: 'SET_TEMPLATE'; template: TemplateId }
  | { type: 'SET_PROJECT_NAME'; name: string }
  | { type: 'SET_LOCATION'; location: string; manual: boolean }
  | { type: 'SET_SEED_DEMO'; include: boolean }
  | { type: 'GO_TO_STEP'; step: 1 | 2 | 3 }
  | { type: 'CREATE_START' }
  | { type: 'CREATE_ERROR'; error: string }
  | { type: 'CREATE_SUCCESS' }

const DEFAULT_NAMES: Record<TemplateId, string> = {
  'reward-model': 'reward-model-v1',
  blank: 'my-project',
}

function sanitizeForPath(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function defaultParent(): string {
  return '~/projects'
}

function buildLocation(name: string): string {
  const slug = sanitizeForPath(name) || 'untitled'
  return `${defaultParent()}/${slug}`
}

export function createInitialState(): WizardState {
  return {
    step: 1,
    template: null,
    projectName: '',
    location: '',
    locationManuallyEdited: false,
    seedDemo: true,
    creating: false,
    error: null,
  }
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_TEMPLATE': {
      const name = DEFAULT_NAMES[action.template]
      return {
        ...state,
        template: action.template,
        projectName: name,
        location: buildLocation(name),
        locationManuallyEdited: false,
      }
    }
    case 'SET_PROJECT_NAME': {
      const next: WizardState = { ...state, projectName: action.name }
      if (!state.locationManuallyEdited) {
        next.location = buildLocation(action.name)
      }
      return next
    }
    case 'SET_LOCATION':
      return { ...state, location: action.location, locationManuallyEdited: action.manual }
    case 'SET_SEED_DEMO':
      return { ...state, seedDemo: action.include }
    case 'GO_TO_STEP':
      return { ...state, step: action.step, error: null }
    case 'CREATE_START':
      return { ...state, creating: true, error: null }
    case 'CREATE_ERROR':
      return { ...state, creating: false, error: action.error }
    case 'CREATE_SUCCESS':
      return { ...state, creating: false }
    default:
      return state
  }
}
