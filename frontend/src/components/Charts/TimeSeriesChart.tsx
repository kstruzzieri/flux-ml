import type { AlignedData, Options } from 'uplot'
import { useUPlot } from './useUPlot'
import { buildAxes, buildCursor, buildScales } from './chartTheme'
import './Charts.css'

interface TimeSeriesChartProps {
  data: AlignedData
  series: Options['series']
}

export function TimeSeriesChart({ data, series }: TimeSeriesChartProps) {
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
    }),
    data,
    [series]
  )

  return <div ref={containerRef} data-testid="timeseries-chart" className="flux-chart" />
}
