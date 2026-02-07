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
  selectExperiment: (id: string | null) => void
  initialize: () => void
}

let _initialized = false

export function __resetInitialized(): void {
  _initialized = false
}

export const useExperimentStore = create<ExperimentState>((set, get) => ({
  experiments: [],
  selectedId: null,
  loading: false,
  error: null,

  fetchExperiments: async () => {
    set({ loading: true, error: null })
    try {
      const experiments = await ListExperiments()
      set({ experiments, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      })
    }
  },

  selectExperiment: (id: string | null) => {
    set({ selectedId: id })
  },

  initialize: () => {
    if (_initialized) return
    _initialized = true

    const { fetchExperiments } = get()
    fetchExperiments()

    const events = ['experiment:created', 'experiment:updated', 'experiment:deleted']
    events.forEach((eventName) => {
      EventsOn(eventName, () => {
        fetchExperiments()
      })
    })
  },
}))
