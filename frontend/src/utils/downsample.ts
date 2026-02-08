export interface Point {
  step: number
  value: number
}

/**
 * Largest Triangle Three Buckets (LTTB) downsampling.
 * Reduces time-series data to targetSize points while preserving visual shape.
 * Always keeps first and last points. Returns original data if length <= targetSize.
 */
export function downsampleLTTB(data: Point[], targetSize: number): Point[] {
  if (data.length <= targetSize || targetSize < 3) {
    return data
  }

  const sampled: Point[] = [data[0]]
  const bucketSize = (data.length - 2) / (targetSize - 2)

  let prevIndex = 0

  for (let i = 0; i < targetSize - 2; i++) {
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1
    const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length - 1)

    const nextBucketStart = Math.floor((i + 2) * bucketSize) + 1
    const nextBucketEnd = Math.min(Math.floor((i + 3) * bucketSize) + 1, data.length - 1)
    let avgStep = 0
    let avgValue = 0
    let count = 0
    for (let j = nextBucketStart; j < nextBucketEnd && j < data.length; j++) {
      avgStep += data[j].step
      avgValue += data[j].value
      count++
    }
    if (count > 0) {
      avgStep /= count
      avgValue /= count
    }

    let maxArea = -1
    let maxIndex = bucketStart
    const prevPoint = data[prevIndex]

    for (let j = bucketStart; j < bucketEnd && j < data.length; j++) {
      const area = Math.abs(
        (prevPoint.step - avgStep) * (data[j].value - prevPoint.value) -
          (prevPoint.step - data[j].step) * (avgValue - prevPoint.value)
      )
      if (area > maxArea) {
        maxArea = area
        maxIndex = j
      }
    }

    sampled.push(data[maxIndex])
    prevIndex = maxIndex
  }

  sampled.push(data[data.length - 1])
  return sampled
}
