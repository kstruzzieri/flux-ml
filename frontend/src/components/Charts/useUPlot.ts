import { useRef, useEffect } from 'react'
import uPlot from 'uplot'
import type { AlignedData, Options } from 'uplot'
import 'uplot/dist/uPlot.min.css'

/**
 * Shared hook encapsulating the uPlot lifecycle:
 *
 * - Effect 1: creates a uPlot instance, attaches a ResizeObserver, destroys on cleanup.
 *   Rebuilds when `deps` change (e.g., series config).
 * - Effect 2: calls setData() when `data` changes without recreating the chart.
 *
 * @param buildOpts - Called with container dimensions to produce uPlot Options.
 * @param data      - AlignedData to render.
 * @param deps      - Additional deps that trigger a full chart rebuild.
 * @returns A ref to attach to the container div.
 */
export function useUPlot(
  buildOpts: (width: number, height: number) => Options,
  data: AlignedData,
  deps: unknown[] = []
): React.RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<uPlot | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const hasRenderableData = data.length > 0 && data[0]?.length > 0

  // Effect 1: create/destroy uPlot instance
  useEffect(() => {
    const el = containerRef.current
    if (!el || !hasRenderableData) return

    const rect = el.getBoundingClientRect()
    // Fallback dimensions for when the container hasn't been laid out yet
    // (e.g., rendered inside a not-yet-visible panel). ResizeObserver
    // corrects to actual size on the next frame.
    const w = Math.floor(rect.width) || 800
    const h = Math.floor(rect.height) || 300
    const opts = buildOpts(w, h)

    chartRef.current = new uPlot(opts, dataRef.current, el)

    const observer = new ResizeObserver((entries) => {
      if (!chartRef.current) return
      const { width, height } = entries[0].contentRect
      chartRef.current.setSize({ width: Math.floor(width), height: Math.floor(height) })
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
      chartRef.current?.destroy()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRenderableData, ...deps])

  // Effect 2: update data without recreating the chart
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setData(data)
    }
  }, [data])

  return containerRef
}
