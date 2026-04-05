import { useMemo } from 'react'
import type { AlignedData, Options } from 'uplot'
import { useUPlot } from './useUPlot'
import { buildAxes, buildCursor, buildScales } from './chartTheme'
import { annotationsPlugin } from './annotationsPlugin'
import type { Annotation } from '../../types/annotation'
import './Charts.css'

interface TimeSeriesChartProps {
  data: AlignedData
  series: Options['series']
  annotations?: Annotation[]
}

export function TimeSeriesChart({ data, series, annotations }: TimeSeriesChartProps) {
  const plugins = useMemo(
    () => (annotations?.length ? [annotationsPlugin(annotations)] : []),
    [annotations]
  )

  const containerRef = useUPlot(
    (w, h) => ({
      width: w,
      height: h,
      series: series!,
      scales: buildScales(),
      axes: buildAxes({
        xValues: (_self, ticks) => ticks.map((v) => String(Math.round(v))),
      }),
      cursor: buildCursor(),
      plugins,
    }),
    data,
    [series, plugins]
  )

  return <div ref={containerRef} data-testid="timeseries-chart" className="flux-chart" />
}
