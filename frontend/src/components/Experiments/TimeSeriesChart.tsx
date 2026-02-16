import { useRef, useEffect } from 'react'
import uPlot from 'uplot'
import type { AlignedData, Options } from 'uplot'
import 'uplot/dist/uPlot.min.css'

interface TimeSeriesChartProps {
  data: AlignedData
  series: Options['series']
}

export function TimeSeriesChart({ data, series }: TimeSeriesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<uPlot | null>(null)

  // Effect 1: create uPlot on mount, destroy on unmount
  useEffect(() => {
    if (!containerRef.current || data[0].length === 0) return

    const opts: Options = {
      width: 800,
      height: 300,
      series: series!,
    }

    chartRef.current = new uPlot(opts, data, containerRef.current)

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [series])

  // Effect 2: when data changes, update the existing chart
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setData(data)
    }
  }, [data])

  return <div ref={containerRef} data-testid="timeseries-chart" className="timeseries-chart" />
}
