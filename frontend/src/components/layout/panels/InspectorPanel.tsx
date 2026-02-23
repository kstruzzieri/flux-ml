import { useExperimentStore } from '@stores'

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const timestampFormat = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function formatTimestamp(unix: number): string {
  return timestampFormat.format(new Date(unix * 1000))
}

export function InspectorPanel() {
  const experiment = useExperimentStore((s) => s.experiments.find((e) => e.id === s.selectedId))

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
