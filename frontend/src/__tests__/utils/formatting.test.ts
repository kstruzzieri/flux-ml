import { formatDuration, formatMetricValue, formatStepCount } from '@utils/formatting'

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

describe('formatMetricValue', () => {
  // Loss metrics need higher precision (4 decimal places) for meaningful
  // comparison between training steps where differences are small.
  it('formats loss with 4 decimal places', () => {
    expect(formatMetricValue('loss', 0.123456789)).toBe('0.1235')
  })

  // Reward values use 3 decimal places — sufficient precision for
  // reward signal display without visual clutter.
  it('formats reward with 3 decimal places', () => {
    expect(formatMetricValue('reward', 0.567891)).toBe('0.568')
  })

  // Any metric not explicitly configured defaults to 2 decimal places.
  it('formats unknown metrics with 2 decimal places', () => {
    expect(formatMetricValue('accuracy', 0.987654)).toBe('0.99')
  })

  // Null values represent missing data — display as em dash.
  it('returns em dash for null', () => {
    expect(formatMetricValue('loss', null)).toBe('\u2014')
  })

  // Undefined values also represent missing data — display as em dash.
  it('returns em dash for undefined', () => {
    expect(formatMetricValue('loss', undefined)).toBe('\u2014')
  })
})

describe('formatMetricValue — extended metrics', () => {
  it('formats kl with 6 decimal places', () => {
    expect(formatMetricValue('kl', 0.0423567)).toBe('0.042357')
  })

  it('formats learning_rate in scientific notation', () => {
    expect(formatMetricValue('learning_rate', 0.00003)).toBe('3.00e-5')
  })
})

describe('formatStepCount', () => {
  it('formats step count with comma separators', () => {
    expect(formatStepCount(12400)).toBe('12,400')
  })

  it('formats small step counts without commas', () => {
    expect(formatStepCount(50)).toBe('50')
  })

  it('formats zero', () => {
    expect(formatStepCount(0)).toBe('0')
  })
})
