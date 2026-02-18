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
  const dataRef = useRef(data)
  dataRef.current = data

  // Effect 1: create uPlot on mount, destroy on unmount
  useEffect(() => {
    const el = containerRef.current
    if (!el || dataRef.current[0].length === 0) return

    const rect = el.getBoundingClientRect()
    const opts: Options = {
      width: Math.floor(rect.width) || 800,
      height: Math.floor(rect.height) || 300,
      series: series!,
      scales: {
        x: { time: false },
      },
      axes: [
        {
          stroke: '#8b9eb0',
          grid: { stroke: 'rgba(139, 158, 176, 0.35)', width: 1 },
          ticks: { stroke: 'rgba(139, 158, 176, 0.5)', width: 1 },
          values: (_self: uPlot, ticks: number[]) => ticks.map((v) => String(Math.round(v))),
        },
        {
          stroke: '#8b9eb0',
          grid: { stroke: 'rgba(139, 158, 176, 0.35)', width: 1 },
          ticks: { stroke: 'rgba(139, 158, 176, 0.5)', width: 1 },
        },
      ],
      cursor: {
        drag: { x: false, y: false },
        points: {
          fill: (self: uPlot, si: number) => self.series[si].stroke as string,
          stroke: (self: uPlot, si: number) => self.series[si].stroke as string,
          size: 8,
          width: 2,
        },
      },
    }

    chartRef.current = new uPlot(opts, dataRef.current, el)

    // Resize chart when container size changes
    const observer = new ResizeObserver((entries) => {
      if (!chartRef.current) return
      const entry = entries[0]
      const { width, height } = entry.contentRect
      chartRef.current.setSize({ width: Math.floor(width), height: Math.floor(height) })
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
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
