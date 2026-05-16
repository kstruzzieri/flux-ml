import { findRewardDivergenceZones } from '@utils/rewardDivergence'
import type { AlignedData } from 'uplot'

const LABELS = ['Helpfulness', 'Harmlessness', 'Honesty']

describe('findRewardDivergenceZones', () => {
  it('returns no zones for balanced reward components', () => {
    const data: AlignedData = [
      [10, 20, 30],
      [0.8, 0.82, 0.84],
      [0.7, 0.72, 0.74],
      [0.75, 0.77, 0.79],
    ]

    expect(findRewardDivergenceZones(data, LABELS)).toEqual([])
  })

  it('groups contiguous divergent samples into one zone', () => {
    const data: AlignedData = [
      [10, 20, 30, 40],
      [0.8, 0.82, 0.84, 0.86],
      [0.7, 0.32, 0.31, 0.74],
      [0.75, 0.78, 0.79, 0.8],
    ]

    const zones = findRewardDivergenceZones(data, LABELS)

    expect(zones).toHaveLength(1)
    expect(zones[0]).toMatchObject({
      id: 'reward-divergence-1-2',
      startIndex: 1,
      endIndex: 2,
      startStep: 15,
      endStep: 35,
    })
    expect(zones[0].samples).toHaveLength(2)
    expect(zones[0].peak.step).toBe(30)
    expect(zones[0].peak.highComponent).toBe('Helpfulness')
    expect(zones[0].peak.lowComponent).toBe('Harmlessness')
  })

  it('creates separate zones when divergence clears between samples', () => {
    const data: AlignedData = [
      [10, 20, 30, 40, 50],
      [0.8, 0.81, 0.82, 0.83, 0.84],
      [0.32, 0.72, 0.73, 0.3, 0.29],
      [0.75, 0.76, 0.77, 0.78, 0.79],
    ]

    const zones = findRewardDivergenceZones(data, LABELS)

    expect(zones).toHaveLength(2)
    expect(zones[0].id).toBe('reward-divergence-0-0')
    expect(zones[1].id).toBe('reward-divergence-3-4')
  })

  it('ignores ratios above threshold when absolute spread is too small', () => {
    const data: AlignedData = [[10], [0.06], [0.02], [0.05]]

    expect(findRewardDivergenceZones(data, LABELS)).toEqual([])
  })

  it('skips samples with missing component values', () => {
    const data: AlignedData = [
      [10, 20],
      [0.8, 0.84],
      [null, 0.31],
      [null, 0.79],
    ]

    const zones = findRewardDivergenceZones(data, LABELS)

    expect(zones).toHaveLength(1)
    expect(zones[0].startIndex).toBe(1)
  })

  it('uses absolute values for negative reward component divergence', () => {
    const data: AlignedData = [[10], [-0.8], [-0.3], [-0.7]]

    const zones = findRewardDivergenceZones(data, LABELS)

    expect(zones).toHaveLength(1)
    expect(zones[0].peak.highValue).toBe(-0.8)
    expect(zones[0].peak.lowValue).toBe(-0.3)
  })
})
