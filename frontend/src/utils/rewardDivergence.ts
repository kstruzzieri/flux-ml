import type { AlignedData } from 'uplot'

export const REWARD_DIVERGENCE_RATIO = 2.0
export const REWARD_DIVERGENCE_MIN_SPREAD = 0.1

const EPSILON = 1e-10

export interface RewardDivergenceSample {
  step: number
  index: number
  highComponent: string
  highValue: number
  lowComponent: string
  lowValue: number
  spread: number
  ratio: number
}

export interface RewardDivergenceZone {
  id: string
  startStep: number
  endStep: number
  startIndex: number
  endIndex: number
  peak: RewardDivergenceSample
  samples: RewardDivergenceSample[]
}

interface ComponentValue {
  label: string
  value: number
  absValue: number
}

function getNumericValue(
  data: AlignedData,
  seriesIndex: number,
  pointIndex: number
): number | null {
  const value = data[seriesIndex]?.[pointIndex]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function assessSample(
  data: AlignedData,
  labels: string[],
  pointIndex: number
): RewardDivergenceSample | null {
  const step = getNumericValue(data, 0, pointIndex)
  if (step == null) return null

  const values: ComponentValue[] = []
  for (let i = 0; i < labels.length; i++) {
    const value = getNumericValue(data, i + 1, pointIndex)
    if (value == null) continue
    values.push({ label: labels[i], value, absValue: Math.abs(value) })
  }

  if (values.length < 2) return null

  const high = values.reduce((best, current) => (current.absValue > best.absValue ? current : best))
  const low = values.reduce((best, current) => (current.absValue < best.absValue ? current : best))
  const spread = high.absValue - low.absValue
  const ratio = low.absValue > EPSILON ? high.absValue / low.absValue : Number.POSITIVE_INFINITY

  if (
    spread < REWARD_DIVERGENCE_MIN_SPREAD ||
    low.absValue <= EPSILON ||
    ratio <= REWARD_DIVERGENCE_RATIO
  ) {
    return null
  }

  return {
    step,
    index: pointIndex,
    highComponent: high.label,
    highValue: high.value,
    lowComponent: low.label,
    lowValue: low.value,
    spread,
    ratio,
  }
}

function zoneStartStep(steps: number[], startIndex: number): number {
  const step = steps[startIndex]
  if (startIndex > 0) return (steps[startIndex - 1] + step) / 2
  if (steps.length > 1) return step - (steps[startIndex + 1] - step) / 2
  return step - 0.5
}

function zoneEndStep(steps: number[], endIndex: number): number {
  const step = steps[endIndex]
  if (endIndex < steps.length - 1) return (step + steps[endIndex + 1]) / 2
  if (steps.length > 1) return step + (step - steps[endIndex - 1]) / 2
  return step + 0.5
}

function choosePeak(samples: RewardDivergenceSample[]): RewardDivergenceSample {
  return samples.reduce((best, current) => {
    if (current.ratio > best.ratio) return current
    if (current.ratio === best.ratio && current.spread > best.spread) return current
    return best
  })
}

function buildZone(samples: RewardDivergenceSample[], steps: number[]): RewardDivergenceZone {
  const startIndex = samples[0].index
  const endIndex = samples[samples.length - 1].index
  const startStep = zoneStartStep(steps, startIndex)
  const endStep = Math.max(zoneEndStep(steps, endIndex), startStep + 1)
  const peak = choosePeak(samples)

  return {
    id: `reward-divergence-${startIndex}-${endIndex}`,
    startStep,
    endStep,
    startIndex,
    endIndex,
    peak,
    samples,
  }
}

export function findRewardDivergenceZones(
  data: AlignedData | undefined,
  labels: string[]
): RewardDivergenceZone[] {
  const steps = data?.[0]
    ? Array.from(data[0]).filter((step): step is number => typeof step === 'number')
    : []
  if (!data || steps.length === 0 || labels.length < 2) return []

  const zones: RewardDivergenceZone[] = []
  let current: RewardDivergenceSample[] = []

  for (let i = 0; i < steps.length; i++) {
    const sample = assessSample(data, labels, i)
    if (sample) {
      current.push(sample)
      continue
    }

    if (current.length > 0) {
      zones.push(buildZone(current, steps))
      current = []
    }
  }

  if (current.length > 0) {
    zones.push(buildZone(current, steps))
  }

  return zones
}
