import { useState } from 'react'

const TABS = ['Output', 'Logs', 'Terminal'] as const
type TabId = (typeof TABS)[number]

interface OutputPanelProps {
  collapsed?: boolean
  className?: string
}

export function OutputPanel({ collapsed = false, className = '' }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('Output')

  const panelClasses = `panel panel--output ${className}`.trim()

  return (
    <div className={panelClasses} data-testid="output-panel">
      <div className="output-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`output-tab ${tab === activeTab ? 'output-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
        <button
          className="output-tab output-tab--add"
          title="New Terminal"
          aria-label="New Terminal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      {!collapsed && (
        <div className="output-terminal">
          <div className="panel__placeholder">No output</div>
        </div>
      )}
    </div>
  )
}
