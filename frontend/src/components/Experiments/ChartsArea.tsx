import { useState, useEffect, useMemo, useCallback } from 'react'
import { LineChart } from 'lucide-react'
import './ChartsArea.css'
import { useMetricsStore, useAnnotationStore } from '@stores'
import { TimeSeriesChart, MultiLineChart, CHART_COLORS } from '@components/Charts'
import type { Options } from 'uplot'
import { findRewardDivergenceZones, type RewardDivergenceZone } from '@utils/rewardDivergence'
import { formatMetricValue, formatStepCount } from '@utils/formatting'

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

interface RewardDivergenceSummaryProps {
  zones: RewardDivergenceZone[]
  selectedZoneId: string | null
  onSelect: (zone: RewardDivergenceZone) => void
}

function formatRatio(value: number): string {
  return `${value.toFixed(1)}x`
}

function formatSpread(value: number): string {
  return formatMetricValue('reward', value)
}

function formatZoneRange(zone: RewardDivergenceZone): string {
  const firstStep = zone.samples[0]?.step ?? zone.peak.step
  const lastStep = zone.samples[zone.samples.length - 1]?.step ?? zone.peak.step
  if (firstStep === lastStep) return `Step ${formatStepCount(firstStep)}`
  return `Steps ${formatStepCount(firstStep)}-${formatStepCount(lastStep)}`
}

function selectDefaultZone(zones: RewardDivergenceZone[]): RewardDivergenceZone | null {
  if (zones.length === 0) return null
  return zones.reduce((best, current) => (current.peak.ratio > best.peak.ratio ? current : best))
}

function RewardDivergenceSummary({
  zones,
  selectedZoneId,
  onSelect,
}: RewardDivergenceSummaryProps) {
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? selectDefaultZone(zones)

  if (!selectedZone) {
    return (
      <div
        className="charts-area__divergence-summary charts-area__divergence-summary--clear"
        data-testid="reward-divergence-summary"
      >
        <span className="charts-area__divergence-status">Components balanced</span>
        <span className="charts-area__divergence-meta">No divergence zones detected</span>
      </div>
    )
  }

  const zoneCount = `${zones.length} ${zones.length === 1 ? 'zone' : 'zones'}`

  return (
    <div className="charts-area__divergence-summary" data-testid="reward-divergence-summary">
      <div className="charts-area__divergence-header">
        <span className="charts-area__divergence-status">Reward divergence</span>
        <span className="charts-area__divergence-meta">{zoneCount}</span>
        <span className="charts-area__divergence-meta">
          Peak {formatRatio(selectedZone.peak.ratio)} at step{' '}
          {formatStepCount(selectedZone.peak.step)}
        </span>
      </div>

      <div className="charts-area__divergence-zones" aria-label="Reward divergence zones">
        {zones.map((zone) => {
          const selected = zone.id === selectedZone.id
          return (
            <button
              key={zone.id}
              type="button"
              className={`charts-area__divergence-zone ${
                selected ? 'charts-area__divergence-zone--selected' : ''
              }`}
              aria-pressed={selected}
              onClick={() => onSelect(zone)}
            >
              <span>{formatZoneRange(zone)}</span>
              <span>{formatRatio(zone.peak.ratio)}</span>
            </button>
          )
        })}
      </div>

      <dl className="charts-area__divergence-details">
        <div>
          <dt>High</dt>
          <dd>
            {selectedZone.peak.highComponent}{' '}
            {formatMetricValue('reward', selectedZone.peak.highValue)}
          </dd>
        </div>
        <div>
          <dt>Low</dt>
          <dd>
            {selectedZone.peak.lowComponent}{' '}
            {formatMetricValue('reward', selectedZone.peak.lowValue)}
          </dd>
        </div>
        <div>
          <dt>Spread</dt>
          <dd>{formatSpread(selectedZone.peak.spread)}</dd>
        </div>
      </dl>
    </div>
  )
}

export function ChartsArea({ experimentId }: ChartsAreaProps) {
  const [activeTab, setActiveTab] = useState<string>(TABS[0])
  const [selectedRewardZoneId, setSelectedRewardZoneId] = useState<string | null>(null)

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
  const initAnnotations = useAnnotationStore((state) => state.initialize)

  // Wire up annotation event listeners (idempotent, runs once)
  useEffect(() => {
    initAnnotations()
  }, [initAnnotations])

  // Fetch chart data and annotations when experiment changes
  useEffect(() => {
    fetchChartData(experimentId)
    fetchRewardComponentChartData(experimentId)
    fetchAnnotations(experimentId)
  }, [experimentId, fetchChartData, fetchRewardComponentChartData, fetchAnnotations])

  const hasOverviewData = chartData && chartData[0]?.length > 0
  const hasRewardComponentData = rewardComponentChartData && rewardComponentChartData[0]?.length > 0
  const rewardDivergenceZones = useMemo(
    () => findRewardDivergenceZones(rewardComponentChartData, REWARD_COMPONENT_LABELS),
    [rewardComponentChartData]
  )
  const handleRewardZoneSelect = useCallback((zone: RewardDivergenceZone) => {
    setSelectedRewardZoneId(zone.id)
  }, [])

  useEffect(() => {
    setSelectedRewardZoneId(null)
  }, [experimentId])

  useEffect(() => {
    if (
      selectedRewardZoneId &&
      !rewardDivergenceZones.some((zone) => zone.id === selectedRewardZoneId)
    ) {
      setSelectedRewardZoneId(null)
    }
  }, [rewardDivergenceZones, selectedRewardZoneId])

  const renderContent = () => {
    if (activeTab === 'Overview' && hasOverviewData) {
      return <TimeSeriesChart data={chartData} series={CHART_SERIES} annotations={annotations} />
    }
    if (activeTab === 'Reward Components' && hasRewardComponentData) {
      return (
        <>
          <MultiLineChart
            data={rewardComponentChartData}
            seriesLabels={REWARD_COMPONENT_LABELS}
            seriesColors={REWARD_COMPONENT_COLORS}
            annotations={annotations}
            anomalyZones={rewardDivergenceZones}
            selectedAnomalyZoneId={selectedRewardZoneId}
            onAnomalyZoneSelect={handleRewardZoneSelect}
          />
          <RewardDivergenceSummary
            zones={rewardDivergenceZones}
            selectedZoneId={selectedRewardZoneId}
            onSelect={handleRewardZoneSelect}
          />
        </>
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
