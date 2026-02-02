import { useState } from 'react'

const TABS = ['Output', 'Logs', 'Terminal'] as const
type TabId = (typeof TABS)[number]

interface OutputPanelProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
}

function CollapseUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

function ExpandDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function OutputPanel({
  collapsed = false,
  onToggleCollapse,
  className = '',
}: OutputPanelProps) {
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
        <button
          className="output-tab output-tab--collapse"
          data-testid="collapse-output"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand output panel' : 'Collapse output panel'}
        >
          {collapsed ? <ExpandDownIcon /> : <CollapseUpIcon />}
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
