import type uPlot from 'uplot'
import type { Annotation } from '../../types/annotation'
import { ANNOTATION_COLORS } from '../../types/annotation'

const HOVER_THRESHOLD_PX = 10
const DASH_PATTERN = [6, 4]
const LINE_WIDTH = 2
const MARKER_RADIUS = 5

const TYPE_LABELS: Record<string, string> = {
  checkpoint: 'Checkpoint',
  config_change: 'Config Change',
  alert: 'Alert',
  note: 'Note',
}

function getAnnotationColor(type: string): string {
  return ANNOTATION_COLORS[type as keyof typeof ANNOTATION_COLORS] || '#a78bfa'
}

function buildTooltipContent(tip: HTMLDivElement, ann: Annotation): void {
  tip.textContent = ''

  const color = getAnnotationColor(ann.type)

  // Line 1: ● Type Label
  const typeLine = document.createElement('div')
  typeLine.style.cssText = 'display:flex;align-items:center;gap:6px;'

  const dot = document.createElement('span')
  dot.style.cssText =
    `display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0;` +
    `background:${color};`
  typeLine.appendChild(dot)

  const typeText = document.createElement('span')
  typeText.style.cssText =
    'font-weight:600;color:var(--color-text-primary, #e6edf3);white-space:nowrap;'
  typeText.textContent = TYPE_LABELS[ann.type] || ann.type
  typeLine.appendChild(typeText)

  tip.appendChild(typeLine)

  // Line 2: Step N
  const stepLine = document.createElement('div')
  stepLine.style.cssText =
    'color:var(--color-text-muted, #8b9eb0);padding-left:14px;margin-top:2px;'
  stepLine.textContent = `Step ${ann.step}`
  tip.appendChild(stepLine)

  // Line 3: description label
  if (ann.label) {
    const labelLine = document.createElement('div')
    labelLine.style.cssText =
      'color:var(--color-text-secondary, #a0b0c0);' +
      'padding-left:14px;line-height:1.4;margin-top:2px;'
    labelLine.textContent = ann.label
    tip.appendChild(labelLine)
  }
}

export function annotationsPlugin(annotations: Annotation[]): uPlot.Plugin {
  let tooltip: HTMLDivElement | null = null

  function ensureTooltip(wrap: HTMLElement): HTMLDivElement {
    if (tooltip && tooltip.parentElement === wrap) return tooltip
    tooltip = document.createElement('div')
    tooltip.className = 'flux-annotation-tooltip'
    tooltip.style.cssText =
      'position:absolute;display:none;pointer-events:none;z-index:100;' +
      'padding:8px 12px;border-radius:6px;font-size:11px;line-height:1.3;' +
      'background:var(--color-bg-panel, #0d1117);' +
      'color:var(--color-text-primary, #e6edf3);' +
      'border:1px solid var(--color-border-muted, #21262d);' +
      'box-shadow:0 2px 8px rgba(0,0,0,0.4);' +
      'white-space:nowrap;'
    wrap.appendChild(tooltip)
    return tooltip
  }

  return {
    hooks: {
      draw(u: uPlot) {
        const ctx = u.ctx
        const { top, height } = u.bbox
        ctx.save()

        for (const ann of annotations) {
          const xPos = u.valToPos(ann.step, 'x', true)
          if (xPos < u.bbox.left || xPos > u.bbox.left + u.bbox.width) continue

          const color = getAnnotationColor(ann.type)

          // Draw dashed vertical line, color-coded by type
          ctx.strokeStyle = color
          ctx.lineWidth = LINE_WIDTH
          ctx.setLineDash(DASH_PATTERN)
          ctx.beginPath()
          ctx.moveTo(xPos, top)
          ctx.lineTo(xPos, top + height)
          ctx.stroke()

          // Draw colored dot marker at top of line
          ctx.setLineDash([])
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(xPos, top + MARKER_RADIUS + 2, MARKER_RADIUS, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
      },

      setCursor(u: uPlot) {
        const over = u.over
        if (!over) return
        const tip = ensureTooltip(over)

        const cursorLeft = u.cursor.left
        if (cursorLeft == null || cursorLeft < 0) {
          tip.style.display = 'none'
          return
        }

        // All coordinates in CSS pixels, relative to the plot area (u.over)
        const dpr = devicePixelRatio
        let closest: Annotation | null = null
        let closestDist = Infinity
        let closestLineX = 0

        for (const ann of annotations) {
          // valToPos returns canvas pixels from canvas left; convert to
          // CSS pixels relative to the plot area (u.over)
          const xCanvas = u.valToPos(ann.step, 'x', true)
          const xInPlot = (xCanvas - u.bbox.left) / dpr
          const dist = Math.abs(xInPlot - cursorLeft)
          if (dist < closestDist) {
            closestDist = dist
            closest = ann
            closestLineX = xInPlot
          }
        }

        if (closest && closestDist <= HOVER_THRESHOLD_PX) {
          buildTooltipContent(tip, closest)
          tip.style.display = 'block'

          const plotWidth = u.bbox.width / dpr
          const plotHeight = u.bbox.height / dpr
          const tipWidth = 180
          const tipOffset = 10

          // Position to the right of line; flip left if near right edge
          if (closestLineX + tipOffset + tipWidth > plotWidth) {
            tip.style.left = `${closestLineX - tipOffset}px`
            tip.style.transform = 'translateX(-100%)'
          } else {
            tip.style.left = `${closestLineX + tipOffset}px`
            tip.style.transform = 'none'
          }

          // Position vertically at 1/3 of the plot height (near annotation marker)
          tip.style.top = `${plotHeight / 3}px`
        } else {
          tip.style.display = 'none'
        }
      },
    },
  }
}
