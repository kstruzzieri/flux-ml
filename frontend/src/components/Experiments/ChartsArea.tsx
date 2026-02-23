import { useState, useEffect } from 'react'
import { LineChart } from 'lucide-react'
import './ChartsArea.css'
import { useMetricsStore } from '@stores'
import { TimeSeriesChart } from '@components/Experiments/TimeSeriesChart'
import type { Options } from 'uplot'

const TABS = ['Overview', 'Reward Components', 'Diagnostics'] as const

// Static series config — defined outside component so the reference never
// changes. Moving this inline will cause the uPlot useEffect to re-fire
// on every render, destroying and recreating the chart.
const CHART_SERIES: Options['series'] = [
  {},
  { label: 'Loss', stroke: '#f59e0b', width: 2, points: { show: false }, fill: undefined },
  { label: 'Reward', stroke: '#10b981', width: 2, points: { show: false }, fill: undefined },
]

interface ChartsAreaProps {
  experimentId: string
}

export function ChartsArea({ experimentId }: ChartsAreaProps) {
  const [activeTab, setActiveTab] = useState<string>(TABS[0])

  const chartData = useMetricsStore((state) => state.chartData[experimentId])
  const fetchChartData = useMetricsStore((state) => state.fetchChartData)

  // Fetch chart data when experiment changes
  useEffect(() => {
    fetchChartData(experimentId)
  }, [experimentId, fetchChartData])

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
        <TimeSeriesChart data={chartData} series={CHART_SERIES} />
      ) : (
        <div className="charts-area__placeholder">
          <LineChart className="charts-area__placeholder-icon" />
          <span className="charts-area__placeholder-text">No metrics data yet</span>
        </div>
      )}
    </div>
  )
}
