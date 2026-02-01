export function ExperimentsPanel() {
  return (
    <div className="panel panel--experiments">
      <div className="panel__header">
        <span className="panel__title">Experiments</span>
        <span className="panel__badge">0</span>
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
        <div className="panel__placeholder">No experiments yet</div>
      </div>
    </div>
  )
}
