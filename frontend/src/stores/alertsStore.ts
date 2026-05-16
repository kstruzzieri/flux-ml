import { create, type StoreApi } from 'zustand'
import { GetAlerts, GetDetections } from '../../wailsjs/go/main/App'
import { EventsOn } from '../../wailsjs/runtime/runtime'
import type { DetectionLevel, DetectionStatus, PersistedAlert } from '@/types/alert'

export const DEFAULT_DETECTIONS: DetectionStatus[] = [
  {
    type: 'length_gaming',
    pattern: 'Length Gaming',
    status: 'clear',
    confidence: null,
    score_kind: 'heuristic_v1',
    step: 0,
    data: '',
  },
  {
    type: 'sycophancy',
    pattern: 'Sycophancy',
    status: 'clear',
    confidence: null,
    score_kind: 'heuristic_v1',
    step: 0,
    data: '',
  },
  {
    type: 'kl_drift',
    pattern: 'KL Drift',
    status: 'clear',
    confidence: null,
    score_kind: 'heuristic_v1',
    step: 0,
    data: '',
  },
  {
    type: 'reward_collapse',
    pattern: 'Reward Collapse',
    status: 'clear',
    confidence: null,
    score_kind: 'heuristic_v1',
    step: 0,
    data: '',
  },
]

interface AlertsState {
  detections: Record<string, DetectionStatus[]>
  alerts: Record<string, PersistedAlert[]>
  fetchDetections: (experimentId: string) => Promise<void>
  fetchAlerts: (experimentId: string) => Promise<void>
  initialize: () => void
}

let _initialized = false
let _unsubscribe: (() => void) | null = null
let _debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {}

function normalizeStatus(status: string): DetectionLevel {
  if (status === 'monitoring' || status === 'elevated' || status === 'detected') return status
  return 'clear'
}

function normalizeDetection(source: {
  type?: string
  pattern?: string
  status?: string
  confidence?: number | null
  score_kind?: string
  step?: number
  data?: string
}): DetectionStatus {
  return {
    type: source.type ?? '',
    pattern: source.pattern ?? '',
    status: normalizeStatus(source.status ?? 'clear'),
    confidence: source.confidence ?? null,
    score_kind: source.score_kind ?? 'heuristic_v1',
    step: source.step ?? 0,
    data: source.data ?? '',
  }
}

function normalizeAlert(source: {
  id?: number
  experiment_id?: string
  type?: string
  pattern?: string
  step?: number
  confidence?: number
  score_kind?: string
  status?: string
  data?: string
  acknowledged?: boolean
  created_at?: number
  resolved_at?: number
}): PersistedAlert {
  return {
    id: source.id ?? 0,
    experiment_id: source.experiment_id ?? '',
    type: source.type ?? '',
    pattern: source.pattern ?? '',
    step: source.step ?? 0,
    confidence: source.confidence ?? 0,
    score_kind: source.score_kind ?? 'heuristic_v1',
    status: normalizeStatus(source.status ?? 'monitoring'),
    data: source.data ?? '',
    acknowledged: source.acknowledged ?? false,
    created_at: source.created_at ?? 0,
    resolved_at: source.resolved_at,
  }
}

function refreshExperiment(experimentId: string, get: StoreApi<AlertsState>['getState']): void {
  if (_debounceTimers[experimentId]) clearTimeout(_debounceTimers[experimentId])
  _debounceTimers[experimentId] = setTimeout(() => {
    delete _debounceTimers[experimentId]
    void get().fetchDetections(experimentId)
    void get().fetchAlerts(experimentId)
  }, 200)
}

export function __resetAlertsStore(): void {
  _initialized = false
  Object.values(_debounceTimers).forEach(clearTimeout)
  _debounceTimers = {}
  if (_unsubscribe) {
    _unsubscribe()
    _unsubscribe = null
  }
  useAlertsStore.setState({
    detections: {},
    alerts: {},
  })
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  detections: {},
  alerts: {},

  fetchDetections: async (experimentId: string) => {
    try {
      const results = await GetDetections(experimentId)
      set((state) => ({
        detections: {
          ...state.detections,
          [experimentId]: results.map(normalizeDetection),
        },
      }))
    } catch (err) {
      console.error(`Failed to fetch detections for ${experimentId}:`, err)
      set((state) => ({
        detections: {
          ...state.detections,
          [experimentId]: DEFAULT_DETECTIONS,
        },
      }))
    }
  },

  fetchAlerts: async (experimentId: string) => {
    try {
      const results = await GetAlerts(experimentId)
      set((state) => ({
        alerts: {
          ...state.alerts,
          [experimentId]: results.map(normalizeAlert),
        },
      }))
    } catch (err) {
      console.error(`Failed to fetch alerts for ${experimentId}:`, err)
      set((state) => ({
        alerts: {
          ...state.alerts,
          [experimentId]: [],
        },
      }))
    }
  },

  initialize: () => {
    if (_initialized) return
    _initialized = true

    const unsubscribe = EventsOn('alerts:updated', (data: { experimentId?: string }) => {
      if (!data?.experimentId) return
      refreshExperiment(data.experimentId, get)
    })

    _unsubscribe = () => {
      unsubscribe()
    }
  },
}))
