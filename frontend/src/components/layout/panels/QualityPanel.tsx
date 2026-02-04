interface QualityIssue {
  text: string
  count: number
}

// Placeholder data - will be replaced with actual data from backend
const MOCK_STATS = {
  samples: 45231,
  avgPrompt: 127,
  avgResp: 384,
  promptExpected: { min: 80, max: 120 },
}

const MOCK_ISSUES: QualityIssue[] = [
  { text: 'Exceeding 2048 tokens', count: 234 },
  { text: 'Duplicate prompts', count: 12 },
  { text: 'Very short responses', count: 3 },
]

// Distribution bars representing response length buckets
const MOCK_DISTRIBUTION = [
  { height: 25, isOutlier: false },
  { height: 45, isOutlier: false },
  { height: 80, isOutlier: false },
  { height: 100, isOutlier: false },
  { height: 85, isOutlier: false },
  { height: 60, isOutlier: false },
  { height: 40, isOutlier: false },
  { height: 25, isOutlier: false },
  { height: 15, isOutlier: false },
  { height: 8, isOutlier: true },
]

export function QualityPanel() {
  const totalIssues = MOCK_ISSUES.reduce((sum, issue) => sum + issue.count, 0)
  const isPromptOutOfRange =
    MOCK_STATS.avgPrompt < MOCK_STATS.promptExpected.min ||
    MOCK_STATS.avgPrompt > MOCK_STATS.promptExpected.max

  return (
    <div className="panel panel--quality">
      <div className="panel__header">
        <span className="panel__title">Dataset Quality</span>
        <span className="panel__badge">{totalIssues}</span>
      </div>
      <div className="panel__content quality-content">
        {/* Stats Grid */}
        <div className="quality-stats quality-stats--three-col">
          <div className="quality-stat">
            <div className="quality-stat__value">{MOCK_STATS.samples.toLocaleString()}</div>
            <div className="quality-stat__label">Samples</div>
          </div>
          <div className={`quality-stat ${isPromptOutOfRange ? 'quality-stat--warning' : ''}`}>
            {isPromptOutOfRange && <div className="quality-stat__indicator" />}
            <div className="quality-stat__value">{MOCK_STATS.avgPrompt}</div>
            <div className="quality-stat__label">Avg Prompt</div>
            {isPromptOutOfRange && (
              <div className="quality-stat__expected">
                exp: {MOCK_STATS.promptExpected.min}-{MOCK_STATS.promptExpected.max}
              </div>
            )}
          </div>
          <div className="quality-stat">
            <div className="quality-stat__value">{MOCK_STATS.avgResp}</div>
            <div className="quality-stat__label">Avg Resp</div>
          </div>
        </div>

        {/* Length Distribution */}
        <div className="quality-distribution">
          <div className="quality-distribution__label">Length Distribution</div>
          <div className="quality-distribution__chart">
            {MOCK_DISTRIBUTION.map((bar, i) => (
              <div
                key={i}
                className={`quality-distribution__bar ${bar.isOutlier ? 'quality-distribution__bar--outlier' : ''}`}
                style={{ height: `${bar.height}%` }}
              />
            ))}
          </div>
        </div>

        {/* Issues List */}
        {MOCK_ISSUES.length > 0 && (
          <div className="quality-issues">
            {MOCK_ISSUES.map((issue, i) => (
              <div key={i} className="quality-issue">
                <span className="quality-issue__icon">⚠</span>
                <span className="quality-issue__text">{issue.text}</span>
                <span className="quality-issue__count">{issue.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
