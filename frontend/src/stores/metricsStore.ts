import { create } from 'zustand'
import { GetLatestMetrics, QueryMetrics, QueryRewardSignals } from '../../wailsjs/go/main/App'
import { EventsOn } from '../../wailsjs/runtime/runtime'
import { downsampleLTTB, type Point } from '@utils/downsample'

/** Map of metric name to its latest value */
type MetricMap = Record<string, number>

export interface LatestRewardSignal {
  component: string
  value: number
  step: number
}

interface MetricsState {
  /** experimentId -> { metricName -> value } */
  latestMetrics: Record<string, MetricMap>
  /** experimentId -> { metricName -> Point[] } */
  sparklineData: Record<string, Record<string, Point[]>>
  /** experimentId -> LatestRewardSignal[] */
  latestRewardSignals: Record<string, LatestRewardSignal[]>

  fetchLatestMetrics: (experimentId: string) => Promise<void>
  fetchAllLatestMetrics: (experimentIds: string[]) => Promise<void>
  fetchSparklineData: (experimentId: string) => Promise<void>
  fetchAllSparklineData: (experimentIds: string[]) => Promise<void>
  fetchLatestRewardSignals: (experimentId: string) => Promise<void>
  initialize: () => void
}

let _initialized = false
let _debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {}
let _unsubscribe: (() => void) | null = null

export function __resetMetricsStore(): void {
  _initialized = false
  Object.values(_debounceTimers).forEach(clearTimeout)
  _debounceTimers = {}
  if (_unsubscribe) {
    _unsubscribe()
    _unsubscribe = null
  }
  useMetricsStore.setState({ latestMetrics: {}, sparklineData: {}, latestRewardSignals: {} })
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  latestMetrics: {},
  sparklineData: {},
  latestRewardSignals: {},

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

  fetchSparklineData: async (experimentId: string) => {
    try {
      const metricNames = ['loss', 'reward', 'kl', 'learning_rate']
      const results = await Promise.all(
        metricNames.map((name) => QueryMetrics(experimentId, name, 0, 0))
      )

      const sparkData: Record<string, Point[]> = {}
      let hasData = false

      for (let i = 0; i < metricNames.length; i++) {
        const raw = results[i]
        if (raw.length > 0) {
          hasData = true
          const points: Point[] = raw.map((m) => ({ step: m.step, value: m.value }))
          sparkData[metricNames[i]] = downsampleLTTB(points, 60)
        }
      }

      set((state) => ({
        sparklineData: {
          ...state.sparklineData,
          [experimentId]: hasData ? sparkData : {},
        },
      }))
    } catch (err) {
      console.error(`Failed to fetch sparkline data for ${experimentId}:`, err)
    }
  },

  fetchAllSparklineData: async (experimentIds: string[]) => {
    await Promise.all(experimentIds.map((id) => get().fetchSparklineData(id)))
  },

  fetchLatestRewardSignals: async (experimentId: string) => {
    try {
      const results = await QueryRewardSignals(experimentId, '', 0, 0)
      const latestByComponent = new Map<string, LatestRewardSignal>()
      for (const s of results) {
        const existing = latestByComponent.get(s.component)
        if (!existing || s.step > existing.step) {
          latestByComponent.set(s.component, {
            component: s.component,
            value: s.value,
            step: s.step,
          })
        }
      }
      set((state) => ({
        latestRewardSignals: {
          ...state.latestRewardSignals,
          [experimentId]: [...latestByComponent.values()],
        },
      }))
    } catch (err) {
      console.error(`Failed to fetch reward signals for ${experimentId}:`, err)
      set((state) => ({
        latestRewardSignals: {
          ...state.latestRewardSignals,
          [experimentId]: [],
        },
      }))
    }
  },

  initialize: () => {
    if (_initialized) return
    _initialized = true

    const unsubMetrics = EventsOn('metrics:recorded', (data: { experimentId?: string }) => {
      if (!data?.experimentId) return
      const key = `metrics:${data.experimentId}`

      if (_debounceTimers[key]) clearTimeout(_debounceTimers[key])
      _debounceTimers[key] = setTimeout(() => {
        delete _debounceTimers[key]
        get().fetchLatestMetrics(data.experimentId!)
        get().fetchSparklineData(data.experimentId!)
      }, 200)
    })

    const unsubRewards = EventsOn('rewards:recorded', (data: { experimentId?: string }) => {
      if (!data?.experimentId) return
      const key = `rewards:${data.experimentId}`

      if (_debounceTimers[key]) clearTimeout(_debounceTimers[key])
      _debounceTimers[key] = setTimeout(() => {
        delete _debounceTimers[key]
        get().fetchLatestRewardSignals(data.experimentId!)
      }, 200)
    })

    _unsubscribe = () => {
      unsubMetrics()
      unsubRewards()
    }
  },
}))
