import type uPlot from 'uplot'
import type { RewardDivergenceZone } from '@utils/rewardDivergence'

const ZONE_FILL = 'rgba(245, 158, 11, 0.08)'
const ZONE_FILL_SELECTED = 'rgba(245, 158, 11, 0.14)'
const ZONE_STROKE = 'rgba(245, 158, 11, 0.5)'
const ZONE_STROKE_SELECTED = '#f59e0b'
const MARKER_HEIGHT = 6

interface RewardDivergencePluginOptions {
  zones: RewardDivergenceZone[]
  selectedZoneId?: string | null
  onSelect?: (zone: RewardDivergenceZone) => void
}

function xCanvasForStep(u: uPlot, step: number): number {
  return u.valToPos(step, 'x', true)
}

function xPlotCssForStep(u: uPlot, step: number): number {
  const dpr = window.devicePixelRatio || 1
  return (xCanvasForStep(u, step) - u.bbox.left) / dpr
}

function zoneAtCursor(
  u: uPlot,
  zones: RewardDivergenceZone[],
  cursorLeft: number | null | undefined
) {
  if (cursorLeft == null || cursorLeft < 0) return null
  return (
    zones.find((zone) => {
      const start = xPlotCssForStep(u, zone.startStep)
      const end = xPlotCssForStep(u, zone.endStep)
      return cursorLeft >= start && cursorLeft <= end
    }) ?? null
  )
}

function eventPlotCssLeft(u: uPlot, event: MouseEvent): number {
  const rect = u.over.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  return event.clientX - rect.left - u.bbox.left / dpr
}

function drawZoneFill(
  u: uPlot,
  zone: RewardDivergenceZone,
  selectedZoneId: string | null | undefined
): void {
  const ctx = u.ctx
  const xStart = xCanvasForStep(u, zone.startStep)
  const xEnd = xCanvasForStep(u, zone.endStep)
  const width = Math.max(1, xEnd - xStart)
  const selected = zone.id === selectedZoneId

  ctx.fillStyle = selected ? ZONE_FILL_SELECTED : ZONE_FILL
  ctx.fillRect(xStart, u.bbox.top, width, u.bbox.height)
}

function drawZoneMarker(
  u: uPlot,
  zone: RewardDivergenceZone,
  selectedZoneId: string | null | undefined
): void {
  const ctx = u.ctx
  const xStart = xCanvasForStep(u, zone.startStep)
  const xEnd = xCanvasForStep(u, zone.endStep)
  const width = Math.max(1, xEnd - xStart)
  const selected = zone.id === selectedZoneId

  ctx.save()
  ctx.fillStyle = selected ? ZONE_STROKE_SELECTED : ZONE_STROKE
  ctx.fillRect(xStart, u.bbox.top, width, MARKER_HEIGHT)

  ctx.strokeStyle = selected ? ZONE_STROKE_SELECTED : ZONE_STROKE
  ctx.lineWidth = selected ? 2 : 1
  ctx.strokeRect(xStart, u.bbox.top, width, u.bbox.height)
  ctx.restore()
}

export function rewardDivergencePlugin({
  zones,
  selectedZoneId,
  onSelect,
}: RewardDivergencePluginOptions): uPlot.Plugin {
  let clickHandler: ((event: MouseEvent) => void) | null = null

  return {
    hooks: {
      drawClear(u: uPlot) {
        if (zones.length === 0) return

        u.ctx.save()
        for (const zone of zones) {
          drawZoneFill(u, zone, selectedZoneId)
        }
        u.ctx.restore()
      },

      draw(u: uPlot) {
        if (zones.length === 0) return

        for (const zone of zones) {
          drawZoneMarker(u, zone, selectedZoneId)
        }
      },

      setCursor(u: uPlot) {
        if (!u.over || zones.length === 0) return
        u.over.style.cursor = zoneAtCursor(u, zones, u.cursor.left) ? 'pointer' : ''
      },

      ready(u: uPlot) {
        if (!onSelect || !u.over || zones.length === 0) return

        clickHandler = (event: MouseEvent) => {
          const cursorLeft = eventPlotCssLeft(u, event)
          const zone = zoneAtCursor(u, zones, cursorLeft)
          if (zone) onSelect(zone)
        }

        u.over.addEventListener('click', clickHandler)
      },

      destroy(u: uPlot) {
        if (clickHandler && u.over) {
          u.over.removeEventListener('click', clickHandler)
          clickHandler = null
        }
      },
    },
  }
}
