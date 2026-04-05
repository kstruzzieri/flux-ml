import { useMemo } from 'react'
import type { AlignedData, Options } from 'uplot'
import { useUPlot } from './useUPlot'
import { buildAxes, buildCursor, buildScales, CHART_COLORS } from './chartTheme'
import { annotationsPlugin } from './annotationsPlugin'
import type { Annotation } from '../../types/annotation'
import './Charts.css'

interface MultiLineChartProps {
  data: AlignedData
  seriesLabels: string[]
  seriesColors?: string[]
  height?: number
  annotations?: Annotation[]
}

export function MultiLineChart({
  data,
  seriesLabels,
  seriesColors,
  height,
  annotations,
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

  const plugins = useMemo(
    () => (annotations?.length ? [annotationsPlugin(annotations)] : []),
    [annotations]
  )

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
