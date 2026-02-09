import { useState } from 'react'
import { LineChart } from 'lucide-react'
import './ChartsArea.css'

const TABS = ['Overview', 'Reward Components', 'Diagnostics'] as const

export function ChartsArea() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0])

  return (
    <div className="charts-area">
      <div className="charts-area__tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`charts-area__tab ${activeTab === tab ? 'charts-area__tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="charts-area__placeholder">
        <LineChart className="charts-area__placeholder-icon" />
        <span className="charts-area__placeholder-text">Chart visualization coming soon</span>
        <span className="charts-area__placeholder-subtext">uPlot integration in Phase 3</span>
      </div>
    </div>
  )
}
