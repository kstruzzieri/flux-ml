// Mock for Wails Go bindings - used in Jest tests
import { event, experiment, main, metrics } from '../models'

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
let nextEventId = 1
let listExperimentsOverride: (() => Promise<experiment.Experiment[]>) | null = null

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

// --- Test helpers ---

export function __resetMockState(): void {
  savedLayout = { ...DEFAULT_LAYOUT } as main.LayoutState
  mockExperiments = []
  mockEvents = []
  mockMetrics = []
  mockRewardSignals = []
  nextEventId = 1
  listExperimentsOverride = null
}

export function __setListExperimentsOverride(
  fn: (() => Promise<experiment.Experiment[]>) | null,
): void {
  listExperimentsOverride = fn
}

// Keep backward-compatible alias
export function __resetMockLayout(): void {
  __resetMockState()
}
