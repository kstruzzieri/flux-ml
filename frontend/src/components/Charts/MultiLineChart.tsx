import { useMemo } from 'react'
import type { AlignedData, Options } from 'uplot'
import { useUPlot } from './useUPlot'
import { buildAxes, buildCursor, buildScales, CHART_COLORS } from './chartTheme'
import { annotationsPlugin } from './annotationsPlugin'
import { rewardDivergencePlugin } from './rewardDivergencePlugin'
import type { Annotation } from '../../types/annotation'
import type { RewardDivergenceZone } from '@utils/rewardDivergence'
import './Charts.css'

interface MultiLineChartProps {
  data: AlignedData
  seriesLabels: string[]
  seriesColors?: string[]
  height?: number
  annotations?: Annotation[]
  anomalyZones?: RewardDivergenceZone[]
  selectedAnomalyZoneId?: string | null
  onAnomalyZoneSelect?: (zone: RewardDivergenceZone) => void
}

export function MultiLineChart({
  data,
  seriesLabels,
  seriesColors,
  height,
  annotations,
  anomalyZones,
  selectedAnomalyZoneId,
  onAnomalyZoneSelect,
}: MultiLineChartProps) {
  if (process.env.NODE_ENV !== 'production' && data.length > 0) {
    const expectedDataArrays = seriesLabels.length + 1 // +1 for x-axis
    if (data.length !== expectedDataArrays) {
      console.warn(
        `MultiLineChart: seriesLabels has ${seriesLabels.length} entries but data has ${data.length} arrays (expected ${expectedDataArrays}). Series/data mismatch may cause invisible lines.`
      )
    }
  }

  const series = useMemo<Options['series']>(() => {
    const colors = seriesColors?.length ? seriesColors : CHART_COLORS.palette
    return [
      {}, // x-axis placeholder
      ...seriesLabels.map((label, i) => ({
        label,
        stroke: colors[i % colors.length],
        width: 2,
        points: { show: false },
        fill: undefined,
      })),
    ]
  }, [seriesLabels, seriesColors])

  const plugins = useMemo(() => {
    const configuredPlugins = []
    if (anomalyZones?.length) {
      configuredPlugins.push(
        rewardDivergencePlugin({
          zones: anomalyZones,
          selectedZoneId: selectedAnomalyZoneId,
          onSelect: onAnomalyZoneSelect,
        })
      )
    }
    if (annotations?.length) configuredPlugins.push(annotationsPlugin(annotations))
    return configuredPlugins
  }, [annotations, anomalyZones, selectedAnomalyZoneId, onAnomalyZoneSelect])

  const containerRef = useUPlot(
    (w, h) => ({
      width: w,
      height: h,
      series,
      scales: buildScales(),
      axes: buildAxes(),
      cursor: buildCursor(),
      plugins,
    }),
    data,
    [series, plugins]
  )

  return (
    <div
      ref={containerRef}
      data-testid="multiline-chart"
      className="flux-chart"
      style={height ? { height } : undefined}
    />
  )
}
