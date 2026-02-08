import { downsampleLTTB, type Point } from '@utils/downsample'

describe('downsampleLTTB', () => {
  it('returns original data when length is under target size', () => {
    const data: Point[] = [
      { step: 1, value: 1.0 },
      { step: 2, value: 2.0 },
      { step: 3, value: 1.5 },
    ]
    const result = downsampleLTTB(data, 10)
    expect(result).toEqual(data)
  })

  it('downsamples to target size preserving first and last points', () => {
    const data: Point[] = Array.from({ length: 100 }, (_, i) => ({
      step: i,
      value: Math.sin(i / 10),
    }))
    const result = downsampleLTTB(data, 20)
    expect(result).toHaveLength(20)
    expect(result[0]).toEqual(data[0])
    expect(result[result.length - 1]).toEqual(data[data.length - 1])
  })

  it('preserves peaks and valleys', () => {
    const data: Point[] = Array.from({ length: 100 }, (_, i) => ({
      step: i,
      value: i === 50 ? 100.0 : 1.0,
    }))
    const result = downsampleLTTB(data, 20)
    const hasSpike = result.some((p) => p.value === 100.0)
    expect(hasSpike).toBe(true)
  })

  it('handles edge cases: empty, single, two points', () => {
    expect(downsampleLTTB([], 10)).toEqual([])
    const single: Point[] = [{ step: 1, value: 5.0 }]
    expect(downsampleLTTB(single, 10)).toEqual(single)
    const two: Point[] = [
      { step: 1, value: 1.0 },
      { step: 2, value: 2.0 },
    ]
    expect(downsampleLTTB(two, 10)).toEqual(two)
  })
})
