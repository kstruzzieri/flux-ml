import { create } from 'zustand'
import { GetLatestMetrics } from '../../wailsjs/go/main/App'
import { EventsOn } from '../../wailsjs/runtime/runtime'

/** Map of metric name to its latest value */
type MetricMap = Record<string, number>

interface MetricsState {
  /** experimentId -> { metricName -> value } */
  latestMetrics: Record<string, MetricMap>

  fetchLatestMetrics: (experimentId: string) => Promise<void>
  fetchAllLatestMetrics: (experimentIds: string[]) => Promise<void>
  initialize: () => void
}

let _initialized = false
let _debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {}

export function __resetMetricsStore(): void {
  _initialized = false
  Object.values(_debounceTimers).forEach(clearTimeout)
  _debounceTimers = {}
  useMetricsStore.setState({ latestMetrics: {} })
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  latestMetrics: {},

  fetchLatestMetrics: async (experimentId: string) => {
    try {
      const results = await GetLatestMetrics(experimentId)
      const metricMap: MetricMap = {}
      for (const m of results) {
        metricMap[m.name] = m.value
      }
      set((state) => ({
        latestMetrics: {
          ...state.latestMetrics,
          [experimentId]: metricMap,
        },
      }))
    } catch (err) {
      console.error(`Failed to fetch metrics for ${experimentId}:`, err)
    }
  },

  fetchAllLatestMetrics: async (experimentIds: string[]) => {
    await Promise.all(experimentIds.map((id) => get().fetchLatestMetrics(id)))
  },

  initialize: () => {
    if (_initialized) return
    _initialized = true

    EventsOn('metrics:recorded', (data: { experimentId?: string }) => {
      if (!data?.experimentId) return
      const expId = data.experimentId

      if (_debounceTimers[expId]) clearTimeout(_debounceTimers[expId])
      _debounceTimers[expId] = setTimeout(() => {
        delete _debounceTimers[expId]
        get().fetchLatestMetrics(expId)
      }, 200)
    })
  },
}))
