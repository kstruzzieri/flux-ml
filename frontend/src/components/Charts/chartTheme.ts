import uPlot from 'uplot'
import type { Options } from 'uplot'

/**
 * Semantic color constants for chart series, aligned with CSS tokens
 * (--color-chart-1 through --color-chart-5).
 */
export const CHART_COLORS = {
  loss: '#f59e0b',
  reward: '#10b981',
  kl: '#8b5cf6',
  palette: ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'],
} as const

interface BuildAxesOptions {
  yLabel?: string
  xValues?: uPlot.Axis['values']
}

// JS-side equivalents of CSS tokens from tokens.css.
// uPlot requires JS color strings — CSS custom properties don't work here.
// These MUST stay in sync with tokens.css; see chartTheme.test.ts for enforcement.
const AXIS_STROKE = '#8b9eb0' // --color-chart-axis
const GRID_STROKE = 'rgba(139, 158, 176, 0.35)' // --color-chart-grid
const TICK_STROKE = 'rgba(139, 158, 176, 0.5)' // --color-chart-tick

export function buildAxes(opts?: BuildAxesOptions): Options['axes'] {
  const xAxis: uPlot.Axis = {
    stroke: AXIS_STROKE,
    grid: { stroke: GRID_STROKE, width: 1 },
    ticks: { stroke: TICK_STROKE, width: 1 },
    ...(opts?.xValues ? { values: opts.xValues } : {}),
  }

  const yAxis: uPlot.Axis = {
    stroke: AXIS_STROKE,
    grid: { stroke: GRID_STROKE, width: 1 },
    ticks: { stroke: TICK_STROKE, width: 1 },
    ...(opts?.yLabel ? { label: opts.yLabel } : {}),
  }

  return [xAxis, yAxis]
}

/** Resolve a uPlot series stroke to a CSS color string for cursor points. */
function resolveStroke(self: uPlot, si: number): string {
  const s = self.series[si].stroke
  const resolved = typeof s === 'function' ? s(self, si) : s
  // Cursor fill/stroke requires a CSS color string; CanvasGradient/Pattern won't work
  return typeof resolved === 'string' ? resolved : AXIS_STROKE
}

export function buildCursor(): Options['cursor'] {
  return {
    drag: { x: false, y: false },
    points: {
      fill: resolveStroke,
      stroke: resolveStroke,
      size: 8,
      width: 2,
    },
  }
}

export function buildScales(): Options['scales'] {
  return {
    x: { time: false },
  }
}
