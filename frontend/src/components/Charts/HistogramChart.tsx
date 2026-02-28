import { useMemo } from 'react'
import uPlot from 'uplot'
import type { AlignedData, Options } from 'uplot'
import { useUPlot } from './useUPlot'
import { buildAxes, buildCursor, buildScales, CHART_COLORS } from './chartTheme'
import './Charts.css'

interface HistogramChartProps {
  bins: number[]
  counts: number[]
  color?: string
  height?: number
}

/**
 * Append 50% alpha to a hex color string for bar fills.
 * Only accepts hex colors (#RGB, #RRGGBB, #RRGGBBAA) since that's
 * what CHART_COLORS provides and the `color` prop documents.
 * Returns the input unchanged if it's already 8-char hex.
 */
function toFillColor(hexColor: string): string {
  // 6-char hex: append 50% alpha
  if (/^#[0-9a-f]{6}$/i.test(hexColor)) return hexColor + '80'
  // 3-char hex: expand then append alpha
  if (/^#[0-9a-f]{3}$/i.test(hexColor)) {
    const [, r, g, b] = hexColor
    return `#${r}${r}${g}${g}${b}${b}80`
  }
  // 8-char hex (already has alpha): use as-is
  if (/^#[0-9a-f]{8}$/i.test(hexColor)) return hexColor
  // Non-hex input: return as-is (uPlot will render opaque fill)
  return hexColor
}

// Computed once at module level — uPlot.paths.bars is a static factory
const barsPaths = uPlot.paths?.bars?.({ size: [0.8, 64] })

export function HistogramChart({ bins, counts, color, height }: HistogramChartProps) {
  const barColor = color ?? CHART_COLORS.palette[0]

  const data = useMemo<AlignedData>(() => [bins, counts], [bins, counts])

  const series = useMemo<Options['series']>(
    () => [
      {},
      {
        label: 'Count',
        stroke: barColor,
        fill: toFillColor(barColor),
        width: 1,
        ...(barsPaths ? { paths: barsPaths } : {}),
        points: { show: false },
      },
    ],
    [barColor]
  )

  const containerRef = useUPlot(
    (w, h) => ({
      width: w,
      height: h,
      series,
      scales: buildScales(),
      axes: buildAxes({ yLabel: 'Count' }),
      cursor: buildCursor(),
    }),
    data,
    [series]
  )

  return (
    <div
      ref={containerRef}
      data-testid="histogram-chart"
      className="flux-chart"
      style={height ? { height } : undefined}
    />
  )
}
