const TABS = [
  { id: 'output', label: 'Training Output' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'problems', label: 'Problems' },
] as const

export function BottomPanel() {
  return (
    <footer className="bottom-panel" role="contentinfo">
      <div className="bottom-panel__tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`bottom-panel__tab ${tab.id === 'output' ? 'bottom-panel__tab--active' : ''}`}
            role="tab"
            aria-selected={tab.id === 'output'}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="bottom-panel__content" role="tabpanel">
        <div className="bottom-panel__placeholder">No training output</div>
      </div>
    </footer>
  )
}
