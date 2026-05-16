import { rewardDivergencePlugin } from '@components/Charts/rewardDivergencePlugin'
import type { RewardDivergenceZone } from '@utils/rewardDivergence'

const zone: RewardDivergenceZone = {
  id: 'reward-divergence-1-2',
  startStep: 15,
  endStep: 35,
  startIndex: 1,
  endIndex: 2,
  peak: {
    step: 30,
    index: 2,
    highComponent: 'Helpfulness',
    highValue: 0.84,
    lowComponent: 'Harmlessness',
    lowValue: 0.31,
    spread: 0.53,
    ratio: 2.71,
  },
  samples: [],
}

function createMockCtx() {
  return {
    save: jest.fn(),
    restore: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
  }
}

function createMockUPlot(over = document.createElement('div')) {
  const ctx = createMockCtx()
  const mockUPlot = {
    ctx,
    bbox: { left: 0, top: 10, width: 800, height: 300 },
    cursor: { left: 200 },
    over,
    valToPos: jest.fn((step: number) => step * 10),
  }
  return { ctx, mockUPlot }
}

describe('rewardDivergencePlugin', () => {
  it('draws divergence zone fills before series render', () => {
    const plugin = rewardDivergencePlugin({ zones: [zone] })
    const { ctx, mockUPlot } = createMockUPlot()

    ;(plugin.hooks.drawClear as (u: unknown) => void)(mockUPlot)

    expect(ctx.save).toHaveBeenCalledTimes(1)
    expect(ctx.fillRect).toHaveBeenCalledWith(150, 10, 200, 300)
    expect(ctx.restore).toHaveBeenCalledTimes(1)
  })

  it('draws selected zone marker with stronger stroke', () => {
    const plugin = rewardDivergencePlugin({
      zones: [zone],
      selectedZoneId: 'reward-divergence-1-2',
    })
    const { ctx, mockUPlot } = createMockUPlot()

    ;(plugin.hooks.draw as (u: unknown) => void)(mockUPlot)

    expect(ctx.fillRect).toHaveBeenCalledWith(150, 10, 200, 6)
    expect(ctx.strokeRect).toHaveBeenCalledWith(150, 10, 200, 300)
    expect(ctx.strokeStyle).toBe('#f59e0b')
    expect(ctx.lineWidth).toBe(2)
  })

  it('sets pointer cursor when hovering an anomaly zone', () => {
    const over = document.createElement('div')
    const plugin = rewardDivergencePlugin({ zones: [zone] })
    const { mockUPlot } = createMockUPlot(over)

    ;(plugin.hooks.setCursor as (u: unknown) => void)(mockUPlot)

    expect(over.style.cursor).toBe('pointer')
  })

  it('selects a zone on click and cleans up the listener on destroy', () => {
    const onSelect = jest.fn()
    const over = document.createElement('div')
    over.getBoundingClientRect = jest.fn(
      () =>
        ({
          left: 0,
          top: 0,
          width: 800,
          height: 300,
          right: 800,
          bottom: 300,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect
    )
    const plugin = rewardDivergencePlugin({ zones: [zone], onSelect })
    const { mockUPlot } = createMockUPlot(over)

    ;(plugin.hooks.ready as (u: unknown) => void)(mockUPlot)
    over.dispatchEvent(new MouseEvent('click', { clientX: 200 }))
    ;(plugin.hooks.destroy as (u: unknown) => void)(mockUPlot)
    over.dispatchEvent(new MouseEvent('click', { clientX: 200 }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(zone)
  })
})
