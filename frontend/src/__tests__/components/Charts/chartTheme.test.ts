import * as fs from 'fs'
import * as path from 'path'
import { buildAxes, buildCursor, buildScales, CHART_COLORS } from '@components/Charts/chartTheme'

jest.mock('uplot', () => {
  const mock = jest.fn().mockImplementation(() => ({
    setData: jest.fn(),
    destroy: jest.fn(),
  }))
  return { __esModule: true, default: mock }
})

describe('chartTheme', () => {
  describe('buildAxes', () => {
    it('returns an array with x and y axis config', () => {
      const axes = buildAxes()
      expect(axes).toHaveLength(2)
      expect(axes![0]).toHaveProperty('stroke')
      expect(axes![0]).toHaveProperty('grid')
      expect(axes![0]).toHaveProperty('ticks')
      expect(axes![1]).toHaveProperty('stroke')
    })

    it('does not force a shared x-axis value formatter by default', () => {
      const axes = buildAxes()
      expect(axes![0]).not.toHaveProperty('values')
    })

    it('applies x-axis values formatter when provided', () => {
      const xValues = jest.fn()
      const axes = buildAxes({ xValues })
      expect(axes![0]).toHaveProperty('values', xValues)
    })

    it('applies yLabel when provided', () => {
      const axes = buildAxes({ yLabel: 'Loss' })
      expect(axes![1]).toHaveProperty('label', 'Loss')
    })
  })

  describe('buildCursor', () => {
    it('returns cursor config with drag disabled', () => {
      const cursor = buildCursor()
      expect(cursor!.drag).toEqual({ x: false, y: false })
      expect(cursor!.points).toBeDefined()
      expect(cursor!.points!.size).toBe(8)
    })
  })

  describe('buildScales', () => {
    it('returns scales with non-time x axis', () => {
      const scales = buildScales()
      expect(scales!.x).toEqual({ time: false })
    })
  })

  describe('CHART_COLORS', () => {
    it('has a 5-color palette matching CSS chart tokens', () => {
      expect(CHART_COLORS.palette).toHaveLength(5)
      expect(CHART_COLORS.palette[0]).toBe('#06b6d4') // --color-chart-1
      expect(CHART_COLORS.palette[1]).toBe('#8b5cf6') // --color-chart-2
      expect(CHART_COLORS.palette[2]).toBe('#f59e0b') // --color-chart-3
      expect(CHART_COLORS.palette[3]).toBe('#10b981') // --color-chart-4
      expect(CHART_COLORS.palette[4]).toBe('#ec4899') // --color-chart-5
    })
  })

  describe('token sync — chartTheme.ts values must match tokens.css', () => {
    const tokensCSS = fs.readFileSync(
      path.resolve(__dirname, '../../../styles/tokens.css'),
      'utf-8'
    )

    function extractToken(name: string): string | undefined {
      const pattern = new RegExp(name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + ':\\s*(.+?)\\s*;')
      const match = pattern.test(tokensCSS) ? tokensCSS.match(pattern) : null
      return match?.[1]
    }

    it('palette colors match --color-chart-N tokens', () => {
      CHART_COLORS.palette.forEach((color, i) => {
        expect(extractToken(`--color-chart-${i + 1}`)).toBe(color)
      })
    })

    it('axis/grid/tick colors match tokens', () => {
      const axes = buildAxes()!
      const xAxis = axes[0] as Record<string, unknown>
      expect(extractToken('--color-chart-axis')).toBe(xAxis.stroke)
      expect(extractToken('--color-chart-grid')).toBe(
        (xAxis.grid as Record<string, unknown>).stroke
      )
      expect(extractToken('--color-chart-tick')).toBe(
        (xAxis.ticks as Record<string, unknown>).stroke
      )
    })
  })
})
