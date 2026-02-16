import { useState } from 'react'
import { LineChart } from 'lucide-react'
import './ChartsArea.css'
import { useMetricsStore } from '@stores'
import { TimeSeriesChart } from '@components/Experiments/TimeSeriesChart'
import type { Options } from 'uplot'

const TABS = ['Overview', 'Reward Components', 'Diagnostics'] as const

interface ChartsAreaProps {
  experimentId: string
}

export function ChartsArea({ experimentId }: ChartsAreaProps) {
  const [activeTab, setActiveTab] = useState<string>(TABS[0])

  const chartData = useMetricsStore((state) => state.chartData[experimentId])

  const series: Options['series'] = [
    {},
    { label: 'Loss', stroke: '#06b6d4' },
    { label: 'Reward', stroke: '#10b981' },
  ]

  const hasData = chartData && chartData[0]?.length > 0

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
      {activeTab === 'Overview' && hasData ? (
        <TimeSeriesChart data={chartData} series={series} />
      ) : (
        <div className="charts-area__placeholder">
          <LineChart className="charts-area__placeholder-icon" />
          <span className="charts-area__placeholder-text">No metrics data yet</span>
        </div>
      )}
    </div>
  )
}
