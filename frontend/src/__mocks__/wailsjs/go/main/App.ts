// Mock for Wails Go bindings - used in Jest tests
import { alerts, annotation, event, experiment, main, metrics, project } from '../models'

const DEFAULT_LAYOUT: main.LayoutState = {
  leftWidth: 280,
  rightWidth: 320,
  outputHeight: 180,
  leftTopHeight: 500,
  rightTopHeight: 450,
  leftCollapsed: false,
  rightCollapsed: false,
  outputCollapsed: false,
} as main.LayoutState

let savedLayout: main.LayoutState = { ...DEFAULT_LAYOUT } as main.LayoutState
let mockExperiments: experiment.Experiment[] = []
let mockEvents: event.Event[] = []
let mockMetrics: metrics.Metric[] = []
let mockRewardSignals: metrics.RewardSignal[] = []
let mockAlerts: alerts.Alert[] = []
let mockDetections: Record<string, alerts.DetectionResult[]> = {}
let mockAnnotations: annotation.Annotation[] = []
let nextEventId = 1
let nextAlertId = 1
let nextAnnotationId = 1
let listExperimentsOverride: (() => Promise<experiment.Experiment[]>) | null = null
let mockCurrentProject: project.Project | null = null
let mockRecentProjects: project.RecentProject[] = []
let mockCurrentProjectStatus = new main.CurrentProjectStatus({
  project: null,
  config: null,
  configError: '',
  warnings: [],
  degraded: false,
} as Record<string, unknown>)

// --- New Phase A.5 methods ---

let mockOpenFolderDialogResult: string = ''
let mockOpenFolderDialogError: Error | null = null
let mockIsFluxProjectResult: boolean = false
let mockDefaultProjectsDirResult: string | Promise<string> = '/tmp/projects'
let mockRemoveRecentProjectError: Error | null = null
let mockCreateProjectError: Error | null = null
let mockOpenProjectError: unknown = null
let mockOpenFolderAsProjectError: unknown = null
let lastCreateProjectCall: {
  name: string
  dir: string
  template: string
  seedDemo: boolean
} | null = null

function addRecentProject(path: string, name: string): void {
  mockRecentProjects = [
    { path, name } as project.RecentProject,
    ...mockRecentProjects.filter((r) => r.path !== path),
  ]
}

// --- Existing methods ---

export function GetLayout(): Promise<main.LayoutState> {
  return Promise.resolve({ ...savedLayout })
}

export function SaveLayout(layout: main.LayoutState): Promise<void> {
  savedLayout = { ...layout }
  return Promise.resolve()
}

export function GetAppInfo(): Promise<main.AppInfo> {
  return Promise.resolve({
    name: 'Flux',
    version: '0.1.0',
  } as main.AppInfo)
}

export function Greet(name: string): Promise<string> {
  return Promise.resolve(`Hello ${name}, It's show time!`)
}

export function GetDBStatus(): Promise<string> {
  return Promise.resolve('')
}

// --- Experiment API ---

export function CreateExperiment(name: string, config: string): Promise<experiment.Experiment> {
  const now = Math.floor(Date.now() / 1000)
  const exp = new experiment.Experiment({
    id: crypto.randomUUID(),
    name,
    config,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  } as Record<string, unknown>)
  mockExperiments.push(exp)
  return Promise.resolve(exp)
}

export function ListExperiments(): Promise<experiment.Experiment[]> {
  if (listExperimentsOverride) return listExperimentsOverride()
  return Promise.resolve([...mockExperiments])
}

export function GetExperiment(id: string): Promise<experiment.Experiment> {
  const exp = mockExperiments.find((e) => e.id === id)
  if (!exp) return Promise.reject(new Error(`experiment not found: ${id}`))
  return Promise.resolve(exp)
}

export function UpdateExperimentStatus(id: string, status: string): Promise<void> {
  const exp = mockExperiments.find((e) => e.id === id)
  if (!exp) return Promise.reject(new Error(`experiment not found: ${id}`))
  exp.status = status
  exp.updatedAt = Math.floor(Date.now() / 1000)
  return Promise.resolve()
}

export function DeleteExperiment(id: string): Promise<void> {
  const idx = mockExperiments.findIndex((e) => e.id === id)
  if (idx === -1) return Promise.reject(new Error(`experiment not found: ${id}`))
  mockExperiments.splice(idx, 1)
  return Promise.resolve()
}

// --- Event API ---

export function AppendEvent(
  experimentID: string,
  eventType: string,
  data: string,
): Promise<event.Event> {
  const ev = new event.Event({
    id: nextEventId++,
    experiment_id: experimentID,
    timestamp: Math.floor(Date.now() / 1000),
    type: eventType,
    data,
  } as Record<string, unknown>)
  mockEvents.push(ev)
  return Promise.resolve(ev)
}

export function ReplayEvents(
  experimentID: string,
  startTime: number,
  endTime: number,
  eventType: string,
): Promise<event.Event[]> {
  let results = mockEvents.filter((e) => e.experiment_id === experimentID)
  if (startTime > 0) results = results.filter((e) => e.timestamp >= startTime)
  if (endTime > 0) results = results.filter((e) => e.timestamp <= endTime)
  if (eventType) results = results.filter((e) => e.type === eventType)
  return Promise.resolve(results)
}

// --- Metrics API ---

export function RecordMetrics(
  experimentID: string,
  m: metrics.Metric[],
): Promise<void> {
  for (const metric of m) {
    const copy = new metrics.Metric({
      experiment_id: experimentID,
      step: metric.step,
      name: metric.name,
      value: metric.value,
      timestamp: metric.timestamp,
    } as Record<string, unknown>)
    mockMetrics.push(copy)
  }
  return Promise.resolve()
}

export function GetLatestMetrics(
  experimentID: string,
): Promise<metrics.Metric[]> {
  const expMetrics = mockMetrics.filter((m) => m.experiment_id === experimentID)
  const latestByName = new Map<string, metrics.Metric>()
  for (const m of expMetrics) {
    const existing = latestByName.get(m.name)
    if (!existing || m.step > existing.step) {
      latestByName.set(m.name, m)
    }
  }
  return Promise.resolve([...latestByName.values()])
}

export function QueryMetrics(
  experimentID: string,
  name: string,
  startStep: number,
  endStep: number,
): Promise<metrics.Metric[]> {
  let results = mockMetrics.filter((m) => m.experiment_id === experimentID)
  if (name) results = results.filter((m) => m.name === name)
  if (startStep > 0) results = results.filter((m) => m.step >= startStep)
  if (endStep > 0) results = results.filter((m) => m.step <= endStep)
  return Promise.resolve(results)
}

export function RecordRewardSignals(
  experimentID: string,
  signals: metrics.RewardSignal[],
): Promise<void> {
  for (const sig of signals) {
    const copy = new metrics.RewardSignal({
      experiment_id: experimentID,
      step: sig.step,
      component: sig.component,
      value: sig.value,
      distribution: sig.distribution,
    } as Record<string, unknown>)
    mockRewardSignals.push(copy)
  }
  return Promise.resolve()
}

export function QueryRewardSignals(
  experimentID: string,
  component: string,
  startStep: number,
  endStep: number,
): Promise<metrics.RewardSignal[]> {
  let results = mockRewardSignals.filter((s) => s.experiment_id === experimentID)
  if (component) results = results.filter((s) => s.component === component)
  if (startStep > 0) results = results.filter((s) => s.step >= startStep)
  if (endStep > 0) results = results.filter((s) => s.step <= endStep)
  return Promise.resolve(results)
}

// --- Alert API ---

function defaultDetections(): alerts.DetectionResult[] {
  return [
    new alerts.DetectionResult({
      type: 'length_gaming',
      pattern: 'Length Gaming',
      status: 'clear',
      confidence: null,
      score_kind: 'heuristic_v1',
      step: 0,
      data: '',
    } as Record<string, unknown>),
    new alerts.DetectionResult({
      type: 'sycophancy',
      pattern: 'Sycophancy',
      status: 'clear',
      confidence: null,
      score_kind: 'heuristic_v1',
      step: 0,
      data: '',
    } as Record<string, unknown>),
    new alerts.DetectionResult({
      type: 'kl_drift',
      pattern: 'KL Drift',
      status: 'clear',
      confidence: null,
      score_kind: 'heuristic_v1',
      step: 0,
      data: '',
    } as Record<string, unknown>),
    new alerts.DetectionResult({
      type: 'reward_collapse',
      pattern: 'Reward Collapse',
      status: 'clear',
      confidence: null,
      score_kind: 'heuristic_v1',
      step: 0,
      data: '',
    } as Record<string, unknown>),
  ]
}

export function GetDetections(experimentID: string): Promise<alerts.DetectionResult[]> {
  return Promise.resolve(mockDetections[experimentID] ?? defaultDetections())
}

export function GetAlerts(experimentID: string): Promise<alerts.Alert[]> {
  return Promise.resolve(mockAlerts.filter((a) => a.experiment_id === experimentID))
}

// --- Annotation API ---

export function CreateAnnotation(
  experimentID: string,
  step: number,
  annType: string,
  label: string,
  data: string,
): Promise<annotation.Annotation> {
  const ann = new annotation.Annotation({
    id: nextAnnotationId++,
    experiment_id: experimentID,
    step,
    type: annType,
    label,
    data,
    created_at: Math.floor(Date.now() / 1000),
  } as Record<string, unknown>)
  mockAnnotations.push(ann)
  return Promise.resolve(ann)
}

export function QueryAnnotations(
  experimentID: string,
  annType: string,
  startStep: number,
  endStep: number,
): Promise<annotation.Annotation[]> {
  let results = mockAnnotations.filter((a) => a.experiment_id === experimentID)
  if (annType) results = results.filter((a) => a.type === annType)
  if (startStep > 0) results = results.filter((a) => a.step >= startStep)
  if (endStep > 0) results = results.filter((a) => a.step <= endStep)
  return Promise.resolve(results.sort((a, b) => a.step - b.step))
}

export function DeleteAnnotation(
  _experimentID: string,
  id: number,
): Promise<void> {
  const idx = mockAnnotations.findIndex((a) => a.id === id)
  if (idx === -1) return Promise.reject(new Error(`annotation not found: ${id}`))
  mockAnnotations.splice(idx, 1)
  return Promise.resolve()
}

// --- Window management ---

export function ToggleMaximize(): Promise<void> {
  return Promise.resolve()
}

// --- Project API ---

export function CreateProject(
  name: string,
  _dir: string,
  _template: string,
  _seedDemo: boolean,
): Promise<project.Project> {
  if (mockCreateProjectError) return Promise.reject(mockCreateProjectError)
  lastCreateProjectCall = {
    name,
    dir: _dir,
    template: _template,
    seedDemo: _seedDemo,
  }
  const proj = new project.Project({
    id: crypto.randomUUID(),
    name,
    path: _dir,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  } as Record<string, unknown>)
  mockCurrentProject = proj
  addRecentProject(_dir, name)
  mockCurrentProjectStatus = new main.CurrentProjectStatus({
    project: proj,
    config: null,
    configError: '',
    warnings: [],
    degraded: false,
  } as Record<string, unknown>)
  return Promise.resolve(proj)
}

export function OpenProject(dir: string): Promise<project.Project> {
  if (mockOpenProjectError) return Promise.reject(mockOpenProjectError)
  const proj = new project.Project({
    id: crypto.randomUUID(),
    name: 'opened-project',
    path: dir,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  } as Record<string, unknown>)
  mockCurrentProject = proj
  addRecentProject(dir, proj.name)
  mockCurrentProjectStatus = new main.CurrentProjectStatus({
    project: proj,
    config: null,
    configError: '',
    warnings: [],
    degraded: false,
  } as Record<string, unknown>)
  return Promise.resolve(proj)
}

export function OpenFolderAsProject(
  dir: string,
  name: string,
  _seedDemo: boolean,
): Promise<project.Project> {
  if (mockOpenFolderAsProjectError) return Promise.reject(mockOpenFolderAsProjectError)
  const proj = new project.Project({
    id: crypto.randomUUID(),
    name,
    path: dir,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  } as Record<string, unknown>)
  mockCurrentProject = proj
  addRecentProject(dir, name)
  mockCurrentProjectStatus = new main.CurrentProjectStatus({
    project: proj,
    config: null,
    configError: '',
    warnings: [],
    degraded: false,
  } as Record<string, unknown>)
  return Promise.resolve(proj)
}

export function CloseProject(): Promise<void> {
  mockCurrentProject = null
  mockCurrentProjectStatus = new main.CurrentProjectStatus({
    project: null,
    config: null,
    configError: '',
    warnings: [],
    degraded: false,
  } as Record<string, unknown>)
  return Promise.resolve()
}

export function GetCurrentProject(): Promise<project.Project | null> {
  return Promise.resolve(mockCurrentProject)
}

export function GetCurrentProjectStatus(): Promise<main.CurrentProjectStatus> {
  return Promise.resolve(mockCurrentProjectStatus)
}

export function ListRecentProjects(): Promise<project.RecentProject[]> {
  return Promise.resolve([...mockRecentProjects])
}

export function GetDefaultProjectsDir(): Promise<string> {
  return Promise.resolve(mockDefaultProjectsDirResult)
}

export function OpenFolderDialog(): Promise<string> {
  if (mockOpenFolderDialogError) return Promise.reject(mockOpenFolderDialogError)
  return Promise.resolve(mockOpenFolderDialogResult)
}

export function RemoveRecentProject(dir: string): Promise<void> {
  if (mockRemoveRecentProjectError) return Promise.reject(mockRemoveRecentProjectError)
  mockRecentProjects = mockRecentProjects.filter((r) => r.path !== dir)
  return Promise.resolve()
}

export function ListUnscopedExperiments(): Promise<experiment.Experiment[]> {
  return Promise.resolve(mockExperiments.filter((e) => !e.projectId))
}

export function ClaimExperimentToProject(
  experimentID: string,
  projectID: string,
): Promise<void> {
  const exp = mockExperiments.find((e) => e.id === experimentID)
  if (!exp) return Promise.reject(new Error(`experiment not found: ${experimentID}`))
  exp.projectId = projectID
  return Promise.resolve()
}

export function ClaimExperimentToCurrentProject(experimentID: string): Promise<void> {
  if (!mockCurrentProject) return Promise.reject(new Error('no project is currently open'))
  return ClaimExperimentToProject(experimentID, mockCurrentProject.id)
}

export function GetProjectConfig(_dir: string): Promise<project.FluxConfig> {
  return Promise.resolve(new project.FluxConfig({
    version: 1,
    name: 'mock-project',
  } as Record<string, unknown>))
}

export function IsFluxProject(_dir: string): Promise<boolean> {
  return Promise.resolve(mockIsFluxProjectResult)
}

// --- Test helpers ---

export function __resetMockState(): void {
  savedLayout = { ...DEFAULT_LAYOUT } as main.LayoutState
  mockExperiments = []
  mockEvents = []
  mockMetrics = []
  mockRewardSignals = []
  mockAlerts = []
  mockDetections = {}
  mockAnnotations = []
  nextEventId = 1
  nextAlertId = 1
  nextAnnotationId = 1
  listExperimentsOverride = null
  mockCurrentProject = null
  mockRecentProjects = []
  mockCurrentProjectStatus = new main.CurrentProjectStatus({
    project: null,
    config: null,
    configError: '',
    warnings: [],
    degraded: false,
  } as Record<string, unknown>)
  mockOpenFolderDialogResult = ''
  mockOpenFolderDialogError = null
  mockIsFluxProjectResult = false
  mockDefaultProjectsDirResult = '/tmp/projects'
  mockRemoveRecentProjectError = null
  mockCreateProjectError = null
  mockOpenProjectError = null
  mockOpenFolderAsProjectError = null
  lastCreateProjectCall = null
}

export function __setListExperimentsOverride(
  fn: (() => Promise<experiment.Experiment[]>) | null,
): void {
  listExperimentsOverride = fn
}

export function __setCurrentProjectStatus(
  status: Partial<main.CurrentProjectStatus>,
): void {
  mockCurrentProjectStatus = new main.CurrentProjectStatus({
    project: null,
    config: null,
    configError: '',
    warnings: [],
    degraded: false,
    ...status,
  } as Record<string, unknown>)
  mockCurrentProject = mockCurrentProjectStatus.project ?? null
}

export function __setRecentProjects(recents: project.RecentProject[]): void {
  mockRecentProjects = [...recents]
}

export function __setOpenFolderDialogResult(result: string, error?: Error): void {
  mockOpenFolderDialogResult = result
  mockOpenFolderDialogError = error ?? null
}

export function __setIsFluxProjectResult(result: boolean): void {
  mockIsFluxProjectResult = result
}

export function __setDefaultProjectsDirResult(result: string | Promise<string>): void {
  mockDefaultProjectsDirResult = result
}

export function __setRemoveRecentProjectError(error: Error | null): void {
  mockRemoveRecentProjectError = error
}

export function __setCreateProjectError(error: Error | null): void {
  mockCreateProjectError = error
}

export function __getLastCreateProjectCall(): {
  name: string
  dir: string
  template: string
  seedDemo: boolean
} | null {
  return lastCreateProjectCall ? { ...lastCreateProjectCall } : null
}

export function __setOpenProjectError(error: unknown): void {
  mockOpenProjectError = error
}

export function __setOpenFolderAsProjectError(error: unknown): void {
  mockOpenFolderAsProjectError = error
}

export function __setMockDetections(
  experimentID: string,
  detections: Array<Partial<alerts.DetectionResult>>,
): void {
  mockDetections[experimentID] = detections.map(
    (d) => new alerts.DetectionResult(d as Record<string, unknown>)
  )
}

export function __addMockAlert(
  experimentID: string,
  alert: Partial<alerts.Alert>,
): alerts.Alert {
  const created = new alerts.Alert({
    id: nextAlertId++,
    experiment_id: experimentID,
    type: alert.type ?? 'kl_drift',
    pattern: alert.pattern ?? 'KL Drift',
    step: alert.step ?? 1,
    confidence: alert.confidence ?? 0.72,
    score_kind: alert.score_kind ?? 'heuristic_v1',
    status: alert.status ?? 'elevated',
    data: alert.data ?? '',
    acknowledged: alert.acknowledged ?? false,
    created_at: alert.created_at ?? Math.floor(Date.now() / 1000),
  } as Record<string, unknown>)
  mockAlerts.push(created)
  return created
}

// Keep backward-compatible alias
export function __resetMockLayout(): void {
  __resetMockState()
}
