import { create } from 'zustand'
import { GetLatestMetrics, QueryMetrics } from '../../wailsjs/go/main/App'
import { EventsOn } from '../../wailsjs/runtime/runtime'
import { downsampleLTTB, type Point } from '@utils/downsample'

/** Map of metric name to its latest value */
type MetricMap = Record<string, number>

interface MetricsState {
  /** experimentId -> { metricName -> value } */
  latestMetrics: Record<string, MetricMap>
  /** experimentId -> { metricName -> Point[] } */
  sparklineData: Record<string, Record<string, Point[]>>

  fetchLatestMetrics: (experimentId: string) => Promise<void>
  fetchAllLatestMetrics: (experimentIds: string[]) => Promise<void>
  fetchSparklineData: (experimentId: string) => Promise<void>
  fetchAllSparklineData: (experimentIds: string[]) => Promise<void>
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
  useMetricsStore.setState({ latestMetrics: {}, sparklineData: {} })
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  latestMetrics: {},
  sparklineData: {},

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
      const [lossMetrics, rewardMetrics] = await Promise.all([
        QueryMetrics(experimentId, 'loss', 0, 0),
        QueryMetrics(experimentId, 'reward', 0, 0),
      ])

      if (lossMetrics.length === 0 && rewardMetrics.length === 0) {
        set((state) => ({
          sparklineData: {
            ...state.sparklineData,
            [experimentId]: {},
          },
        }))
        return
      }

      const sparkData: Record<string, Point[]> = {}

      if (lossMetrics.length > 0) {
        const lossPoints: Point[] = lossMetrics.map((m) => ({ step: m.step, value: m.value }))
        sparkData['loss'] = downsampleLTTB(lossPoints, 60)
      }

      if (rewardMetrics.length > 0) {
        const rewardPoints: Point[] = rewardMetrics.map((m) => ({ step: m.step, value: m.value }))
        sparkData['reward'] = downsampleLTTB(rewardPoints, 60)
      }

      set((state) => ({
        sparklineData: {
          ...state.sparklineData,
          [experimentId]: sparkData,
        },
      }))
    } catch (err) {
      console.error(`Failed to fetch sparkline data for ${experimentId}:`, err)
    }
  },

  fetchAllSparklineData: async (experimentIds: string[]) => {
    await Promise.all(experimentIds.map((id) => get().fetchSparklineData(id)))
  },

  initialize: () => {
    if (_initialized) return
    _initialized = true

    _unsubscribe = EventsOn('metrics:recorded', (data: { experimentId?: string }) => {
      if (!data?.experimentId) return
      const expId = data.experimentId

      if (_debounceTimers[expId]) clearTimeout(_debounceTimers[expId])
      _debounceTimers[expId] = setTimeout(() => {
        delete _debounceTimers[expId]
        get().fetchLatestMetrics(expId)
        get().fetchSparklineData(expId)
      }, 200)
    })
  },
}))
