import { useEffect } from 'react'
import { useExperimentStore } from '@stores/experimentStore'
import { useMetricsStore } from '@stores/metricsStore'
import { ExperimentList } from '../../Experiments/ExperimentList'

export function ExperimentsPanel() {
  const experiments = useExperimentStore((s) => s.experiments)
  const selectedId = useExperimentStore((s) => s.selectedId)
  const selectExperiment = useExperimentStore((s) => s.selectExperiment)
  const initialize = useExperimentStore((s) => s.initialize)
  const loading = useExperimentStore((s) => s.loading)
  const error = useExperimentStore((s) => s.error)

  const latestMetrics = useMetricsStore((s) => s.latestMetrics)
  const fetchAllLatestMetrics = useMetricsStore((s) => s.fetchAllLatestMetrics)
  const initializeMetrics = useMetricsStore((s) => s.initialize)

  useEffect(() => {
    initialize()
    initializeMetrics()
  }, [initialize, initializeMetrics])

  useEffect(() => {
    if (experiments.length > 0) {
      fetchAllLatestMetrics(experiments.map((e) => e.id))
    }
  }, [experiments, fetchAllLatestMetrics])

  return (
    <div className="panel panel--experiments">
      <div className="panel__header">
        <span className="panel__title">Experiments</span>
        <span className="panel__badge">{experiments.length}</span>
        <div className="panel__actions">
          <button className="panel__action" title="New Experiment" aria-label="New Experiment">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="panel__content">
        {error && (
          <div className="panel__error" role="alert">
            Failed to load experiments: {error}
          </div>
        )}
        {loading && experiments.length === 0 && !error && (
          <div className="panel__loading">Loading experiments…</div>
        )}
        {!error && (
          <ExperimentList
            experiments={experiments}
            selectedId={selectedId}
            onSelect={selectExperiment}
            metricsMap={latestMetrics}
          />
        )}
      </div>
    </div>
  )
}
