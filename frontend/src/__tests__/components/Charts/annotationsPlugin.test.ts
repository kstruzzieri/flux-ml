import { annotationsPlugin } from '@components/Charts/annotationsPlugin'
import type { Annotation } from '../../../types/annotation'

const mockAnnotations: Annotation[] = [
  {
    id: 1,
    experiment_id: 'exp-1',
    step: 100,
    type: 'checkpoint',
    label: 'Ckpt 100',
    data: '',
    created_at: 1000,
  },
  {
    id: 2,
    experiment_id: 'exp-1',
    step: 200,
    type: 'alert',
    label: 'Drift detected',
    data: '',
    created_at: 2000,
  },
  {
    id: 3,
    experiment_id: 'exp-1',
    step: 300,
    type: 'note',
    label: 'My note',
    data: '',
    created_at: 3000,
  },
]

function createMockCtx() {
  return {
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    setLineDash: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    strokeStyle: '',
    lineWidth: 0,
    fillStyle: '',
  }
}

describe('annotationsPlugin', () => {
  it('returns a plugin object with draw and setCursor hooks', () => {
    const plugin = annotationsPlugin(mockAnnotations)
    expect(plugin.hooks).toBeDefined()
    expect(plugin.hooks!.draw).toBeInstanceOf(Function)
    expect(plugin.hooks!.setCursor).toBeInstanceOf(Function)
  })

  it('draw hook renders dashed vertical lines and top markers for each annotation', () => {
    const plugin = annotationsPlugin(mockAnnotations)
    const mockCtx = createMockCtx()

    const mockUPlot = {
      ctx: mockCtx,
      bbox: { left: 0, top: 0, width: 800, height: 400 },
      valToPos: jest.fn().mockImplementation((val: number) => val),
    }

    ;(plugin.hooks!.draw as (u: unknown) => void)(mockUPlot)

    expect(mockCtx.save).toHaveBeenCalledTimes(1)
    expect(mockCtx.restore).toHaveBeenCalledTimes(1)
    expect(mockCtx.setLineDash).toHaveBeenCalledWith([6, 4])
    // 3 annotations × (1 line beginPath + 1 marker beginPath) = 6
    expect(mockCtx.beginPath).toHaveBeenCalledTimes(6)
    expect(mockCtx.stroke).toHaveBeenCalledTimes(3)
    // Top dot markers
    expect(mockCtx.arc).toHaveBeenCalledTimes(3)
    expect(mockCtx.fill).toHaveBeenCalledTimes(3)
  })

  it('draw hook skips annotations outside visible range', () => {
    const plugin = annotationsPlugin(mockAnnotations)
    const mockCtx = createMockCtx()

    const mockUPlot = {
      ctx: mockCtx,
      bbox: { left: 50, top: 0, width: 100, height: 400 },
      // Only step 100 is in range [50, 150]
      valToPos: jest.fn().mockImplementation((val: number) => val),
    }

    ;(plugin.hooks!.draw as (u: unknown) => void)(mockUPlot)

    // 1 line + 1 marker = 2
    expect(mockCtx.beginPath).toHaveBeenCalledTimes(2)
  })

  it('uses type-specific colors for annotation lines and markers', () => {
    const singleAnnotation: Annotation[] = [
      {
        id: 1,
        experiment_id: 'exp-1',
        step: 100,
        type: 'config_change',
        label: 'LR changed',
        data: '',
        created_at: 1000,
      },
    ]

    const plugin = annotationsPlugin(singleAnnotation)
    const mockCtx = createMockCtx()

    const mockUPlot = {
      ctx: mockCtx,
      bbox: { left: 0, top: 0, width: 800, height: 400 },
      valToPos: jest.fn().mockReturnValue(100),
    }

    ;(plugin.hooks!.draw as (u: unknown) => void)(mockUPlot)

    // Line and marker use the bright type-specific color
    expect(mockCtx.strokeStyle).toBe('#f59e0b')
    expect(mockCtx.fillStyle).toBe('#f59e0b')
  })

  it('returns empty plugin when annotations are empty', () => {
    const plugin = annotationsPlugin([])
    expect(plugin.hooks).toBeDefined()

    const mockCtx = createMockCtx()

    const mockUPlot = {
      ctx: mockCtx,
      bbox: { left: 0, top: 0, width: 800, height: 400 },
      valToPos: jest.fn(),
    }

    ;(plugin.hooks!.draw as (u: unknown) => void)(mockUPlot)

    expect(mockCtx.beginPath).not.toHaveBeenCalled()
  })

  it('setCursor hides tooltip when cursor is outside chart', () => {
    const plugin = annotationsPlugin(mockAnnotations)

    const mockWrap = document.createElement('div')

    const mockUPlot = {
      root: mockWrap,
      over: document.createElement('div'),
      cursor: { left: -1 },
      bbox: { left: 0, top: 0, width: 800, height: 400 },
      valToPos: jest.fn(),
    }

    ;(plugin.hooks!.setCursor as (u: unknown) => void)(mockUPlot)

    // Tooltip should be hidden (display:none or not visible)
    const tooltip = mockWrap.querySelector('.flux-annotation-tooltip')
    if (tooltip) {
      expect((tooltip as HTMLElement).style.display).toBe('none')
    }
  })
})
