export const EXPERIMENT_STATUSES = ['pending', 'running', 'completed', 'failed'] as const
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number]

const VALID_STATUS_SET: Set<string> = new Set(EXPERIMENT_STATUSES)

export function toExperimentStatus(raw: string): ExperimentStatus {
  return VALID_STATUS_SET.has(raw) ? (raw as ExperimentStatus) : 'pending'
}

/**
 * Formats the duration of an experiment for display in the experiment card.
 *
 * - running: elapsed from createdAt to now
 * - completed/failed: total from createdAt to updatedAt
 * - pending: em dash
 */
export function formatDuration(
  createdAt: number,
  updatedAt: number,
  status: ExperimentStatus
): string {
  if (status === 'pending') {
    return '\u2014'
  }

  const endTime = status === 'running' ? Math.floor(Date.now() / 1000) : updatedAt
  const seconds = Math.max(0, endTime - createdAt)

  if (seconds < 60) {
    return '<1m'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0) {
    return `${minutes}m`
  }

  return `${hours}h ${minutes}m`
}

const METRIC_DECIMALS: Record<string, number> = {
  loss: 4,
  reward: 3,
  kl: 6,
}

/**
 * Formats a metric value for inline display.
 * Returns em dash for null/undefined values.
 */
export function formatMetricValue(name: string, value: number | null | undefined): string {
  if (value == null) {
    return '\u2014'
  }
  if (name === 'learning_rate') {
    return value.toExponential(2)
  }
  const decimals = METRIC_DECIMALS[name] ?? 2
  return value.toFixed(decimals)
}

export function formatStepCount(step: number): string {
  return step.toLocaleString('en-US')
}
