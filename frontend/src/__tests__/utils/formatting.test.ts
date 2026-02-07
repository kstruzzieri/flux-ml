import { formatDuration } from '@utils/formatting'

describe('formatDuration', () => {
  // Duration is key experiment metadata shown on every card.
  // Running experiments show elapsed time from creation to now.
  it('formats running experiment duration from createdAt to now', () => {
    const now = Math.floor(Date.now() / 1000)
    const twoHoursAgo = now - 2 * 3600 - 34 * 60
    const result = formatDuration(twoHoursAgo, now, 'running')
    expect(result).toBe('2h 34m')
  })

  // Completed experiments show total duration from start to finish.
  it('formats completed experiment duration from createdAt to updatedAt', () => {
    const start = 1000000
    const end = start + 4 * 3600 + 12 * 60
    const result = formatDuration(start, end, 'completed')
    expect(result).toBe('4h 12m')
  })

  // Failed experiments also show total duration.
  it('formats failed experiment duration', () => {
    const start = 1000000
    const end = start + 12 * 60
    const result = formatDuration(start, end, 'failed')
    expect(result).toBe('12m')
  })

  // Pending experiments have no meaningful duration.
  it('returns dash for pending experiments', () => {
    const now = Math.floor(Date.now() / 1000)
    const result = formatDuration(now, now, 'pending')
    expect(result).toBe('\u2014')
  })

  // Short durations should show minutes only.
  it('formats sub-hour durations as minutes only', () => {
    const start = 1000000
    const end = start + 45 * 60
    const result = formatDuration(start, end, 'completed')
    expect(result).toBe('45m')
  })

  // Very short durations show less than a minute.
  it('formats sub-minute durations', () => {
    const start = 1000000
    const end = start + 30
    const result = formatDuration(start, end, 'completed')
    expect(result).toBe('<1m')
  })
})
