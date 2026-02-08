import { useId } from 'react'
import type { Point } from '@utils/downsample'

interface SparklineProps {
  data: Point[]
  color: string
  width?: number
  height?: number
  showFill?: boolean
}

const PADDING = 2

export function Sparkline({
  data,
  color,
  width = 90,
  height = 24,
  showFill = true,
}: SparklineProps) {
  const gradientId = useId()

  if (data.length === 0) return null

  const minStep = data[0].step
  const maxStep = data[data.length - 1].step
  const stepRange = maxStep - minStep || 1

  let minValue = Infinity
  let maxValue = -Infinity
  for (const p of data) {
    if (p.value < minValue) minValue = p.value
    if (p.value > maxValue) maxValue = p.value
  }
  const valueRange = maxValue - minValue || 1

  const toX = (step: number) => ((step - minStep) / stepRange) * width
  const toY = (value: number) =>
    height - PADDING - ((value - minValue) / valueRange) * (height - PADDING * 2)

  if (data.length === 1) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <circle cx={width / 2} cy={height / 2} r={2} fill={color} />
      </svg>
    )
  }

  const points = data.map((p) => `${toX(p.step)},${toY(p.value)}`).join(' ')
  const fillPath =
    `M${toX(data[0].step)},${toY(data[0].value)} ` +
    data
      .slice(1)
      .map((p) => `L${toX(p.step)},${toY(p.value)}`)
      .join(' ') +
    ` L${toX(data[data.length - 1].step)},${height} L${toX(data[0].step)},${height} Z`

  return (
    <svg width={width} height={height} aria-hidden="true">
      {showFill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={fillPath} fill={`url(#${gradientId})`} />
        </>
      )}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
