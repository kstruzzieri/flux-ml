import { useState, useEffect } from 'react'
import { LineChart } from 'lucide-react'
import './ChartsArea.css'
import { useMetricsStore, useAnnotationStore } from '@stores'
import { TimeSeriesChart, MultiLineChart, CHART_COLORS } from '@components/Charts'
import type { Options } from 'uplot'

const TABS = ['Overview', 'Reward Components', 'Diagnostics'] as const

// Static series config — defined outside component so the reference never
// changes. Moving this inline will cause the uPlot useEffect to re-fire
// on every render, destroying and recreating the chart.
const CHART_SERIES: Options['series'] = [
  {},
  { label: 'Loss', stroke: CHART_COLORS.loss, width: 2, points: { show: false }, fill: undefined },
  {
    label: 'Reward',
    stroke: CHART_COLORS.reward,
    width: 2,
    points: { show: false },
    fill: undefined,
  },
]

const REWARD_COMPONENT_LABELS = ['Helpfulness', 'Harmlessness', 'Honesty']
const REWARD_COMPONENT_COLORS = [
  CHART_COLORS.palette[0],
  CHART_COLORS.palette[1],
  CHART_COLORS.palette[2],
]

interface ChartsAreaProps {
  experimentId: string
}

export function ChartsArea({ experimentId }: ChartsAreaProps) {
  const [activeTab, setActiveTab] = useState<string>(TABS[0])

  const chartData = useMetricsStore((state) => state.chartData[experimentId])
  const fetchChartData = useMetricsStore((state) => state.fetchChartData)

  const rewardComponentChartData = useMetricsStore(
    (state) => state.rewardComponentChartData[experimentId]
  )
  const fetchRewardComponentChartData = useMetricsStore(
    (state) => state.fetchRewardComponentChartData
  )

  const annotations = useAnnotationStore((state) => state.annotations[experimentId])
  const fetchAnnotations = useAnnotationStore((state) => state.fetchAnnotations)

  // Fetch chart data and annotations when experiment changes
  useEffect(() => {
    fetchChartData(experimentId)
    fetchRewardComponentChartData(experimentId)
    fetchAnnotations(experimentId)
  }, [experimentId, fetchChartData, fetchRewardComponentChartData, fetchAnnotations])

  const hasOverviewData = chartData && chartData[0]?.length > 0
  const hasRewardComponentData = rewardComponentChartData && rewardComponentChartData[0]?.length > 0

  const renderContent = () => {
    if (activeTab === 'Overview' && hasOverviewData) {
      return <TimeSeriesChart data={chartData} series={CHART_SERIES} annotations={annotations} />
    }
    if (activeTab === 'Reward Components' && hasRewardComponentData) {
      return (
        <MultiLineChart
          data={rewardComponentChartData}
          seriesLabels={REWARD_COMPONENT_LABELS}
          seriesColors={REWARD_COMPONENT_COLORS}
          annotations={annotations}
        />
      )
    }
    return (
      <div className="charts-area__placeholder">
        <LineChart className="charts-area__placeholder-icon" />
        <span className="charts-area__placeholder-text">No metrics data yet</span>
      </div>
    )
  }

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
      {renderContent()}
    </div>
  )
}
