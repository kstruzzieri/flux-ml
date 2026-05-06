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
  defaultProjectsDir: string
  locationManuallyEdited: boolean
  projectsDirManuallyEdited: boolean
  seedDemo: boolean
  creating: boolean
  error: string | null
}

export type WizardAction =
  | { type: 'SET_TEMPLATE'; template: TemplateId }
  | { type: 'SET_PROJECT_NAME'; name: string }
  | { type: 'SET_LOCATION'; location: string; manual: boolean }
  | { type: 'SET_SEED_DEMO'; include: boolean }
  | { type: 'SET_DEFAULT_DIR'; dir: string }
  | { type: 'SET_PROJECTS_DIR'; dir: string; manual: boolean }
  | { type: 'GO_TO_STEP'; step: 1 | 2 | 3 }
  | { type: 'CREATE_START' }
  | { type: 'CREATE_ERROR'; error: string }
  | { type: 'CREATE_SUCCESS' }

const DEFAULT_NAMES: Record<TemplateId, string> = {
  'reward-model': 'reward-model-v1',
  blank: 'my-project',
}

const DEFAULT_SEED_DEMO: Record<TemplateId, boolean> = {
  'reward-model': true,
  blank: false,
}

function sanitizeForPath(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildLocation(name: string, parentDir: string): string {
  const slug = sanitizeForPath(name) || 'untitled'
  return parentDir ? `${parentDir}/${slug}` : slug
}

export function createInitialState(defaultProjectsDir = ''): WizardState {
  return {
    step: 1,
    template: null,
    projectName: '',
    location: '',
    defaultProjectsDir,
    locationManuallyEdited: false,
    projectsDirManuallyEdited: false,
    seedDemo: false,
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
        location: buildLocation(name, state.defaultProjectsDir),
        locationManuallyEdited: false,
        seedDemo: DEFAULT_SEED_DEMO[action.template],
      }
    }
    case 'SET_PROJECT_NAME': {
      const next: WizardState = { ...state, projectName: action.name }
      if (!state.locationManuallyEdited) {
        next.location = buildLocation(action.name, state.defaultProjectsDir)
      }
      return next
    }
    case 'SET_DEFAULT_DIR': {
      if (state.projectsDirManuallyEdited) return state
      const next: WizardState = { ...state, defaultProjectsDir: action.dir }
      if (!state.locationManuallyEdited && state.projectName.trim() !== '') {
        next.location = buildLocation(state.projectName, action.dir)
      }
      return next
    }
    case 'SET_PROJECTS_DIR': {
      const next: WizardState = {
        ...state,
        defaultProjectsDir: action.dir,
        projectsDirManuallyEdited: action.manual || state.projectsDirManuallyEdited,
      }
      if (!state.locationManuallyEdited && state.projectName.trim() !== '') {
        next.location = buildLocation(state.projectName, action.dir)
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
