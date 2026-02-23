import { useExperimentStore } from '@stores'

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString()
}

export function InspectorPanel() {
  const selectedId = useExperimentStore((s) => s.selectedId)
  const experiments = useExperimentStore((s) => s.experiments)
  const experiment = experiments.find((e) => e.id === selectedId)

  return (
    <div className="panel panel--inspector">
      <div className="panel__header">
        <span className="panel__title">Inspector</span>
      </div>
      <div className="panel__content">
        {!experiment ? (
          <div className="panel__placeholder">Select an experiment to inspect</div>
        ) : (
          <div className="inspector-compact">
            <div className="inspector-compact__header">
              <span className="inspector-compact__name">{experiment.name}</span>
              <span
                className={`status-dot status-dot--${experiment.status}`}
                role="img"
                aria-label={capitalize(experiment.status)}
              />
            </div>

            <div className="inspector-compact__rows">
              <div className="inspector-compact__row">
                <span className="inspector-compact__label">Status</span>
                <span className="inspector-compact__value">{capitalize(experiment.status)}</span>
              </div>
              <div className="inspector-compact__row">
                <span className="inspector-compact__label">ID</span>
                <span
                  className="inspector-compact__value inspector-compact__value--mono"
                  data-testid="inspector-id"
                >
                  {experiment.id.length > 8 ? experiment.id.slice(0, 8) + '...' : experiment.id}
                </span>
              </div>
              <div className="inspector-compact__row">
                <span className="inspector-compact__label">Created</span>
                <span className="inspector-compact__value" data-testid="inspector-created">
                  {formatTimestamp(experiment.createdAt)}
                </span>
              </div>
              <div className="inspector-compact__row">
                <span className="inspector-compact__label">Updated</span>
                <span className="inspector-compact__value" data-testid="inspector-updated">
                  {formatTimestamp(experiment.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
