/**
 * Formats the duration of an experiment for display in the experiment card.
 *
 * - running: elapsed from createdAt to now
 * - completed/failed: total from createdAt to updatedAt
 * - pending: em dash
 */
export function formatDuration(createdAt: number, updatedAt: number, status: string): string {
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
