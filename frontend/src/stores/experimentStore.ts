import { create } from 'zustand'
import { ListExperiments } from '../../wailsjs/go/main/App'
import { EventsOn } from '../../wailsjs/runtime/runtime'
import type { experiment } from '../../wailsjs/go/models'

interface ExperimentState {
  experiments: experiment.Experiment[]
  selectedId: string | null
  loading: boolean
  error: string | null

  fetchExperiments: () => Promise<void>
  selectExperiment: (id: string) => void
  initialize: () => void
}

let _initialized = false
let _fetchSeq = 0
let _debounceTimer: ReturnType<typeof setTimeout> | null = null

export function __resetInitialized(): void {
  _initialized = false
  _fetchSeq = 0
  if (_debounceTimer) {
    clearTimeout(_debounceTimer)
    _debounceTimer = null
  }
}

export const useExperimentStore = create<ExperimentState>((set, get) => ({
  experiments: [],
  selectedId: null,
  loading: false,
  error: null,

  fetchExperiments: async () => {
    const seq = ++_fetchSeq
    set({ loading: true, error: null })
    try {
      const experiments = await ListExperiments()
      if (seq !== _fetchSeq) return // stale response, discard
      const { selectedId } = get()
      const selectionValid = selectedId != null && experiments.some((e) => e.id === selectedId)
      const nextSelectedId = selectionValid ? selectedId : (experiments[0]?.id ?? null)
      set({ experiments, loading: false, selectedId: nextSelectedId })
    } catch (err) {
      if (seq !== _fetchSeq) return // stale response, discard
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      })
    }
  },

  selectExperiment: (id: string) => {
    set({ selectedId: id })
  },

  initialize: () => {
    if (_initialized) return
    _initialized = true

    const { fetchExperiments } = get()
    fetchExperiments()

    const debouncedFetch = () => {
      if (_debounceTimer) clearTimeout(_debounceTimer)
      _debounceTimer = setTimeout(() => {
        _debounceTimer = null
        fetchExperiments()
      }, 100)
    }

    const events = [
      'experiment:created',
      'experiment:updated',
      'experiment:deleted',
      'project:created',
      'project:opened',
      'project:imported',
      'project:closed',
    ]
    events.forEach((eventName) => {
      EventsOn(eventName, debouncedFetch)
    })
  },
}))
