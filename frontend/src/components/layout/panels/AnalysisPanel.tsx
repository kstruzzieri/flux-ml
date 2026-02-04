function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function BarChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

interface CausalItem {
  label: string
  impact: number
  level: 'high' | 'medium' | 'low'
}

interface ConfigDiff {
  key: string
  value1: string
  value2: string
}

// Placeholder data
const MOCK_CAUSAL_ITEMS: CausalItem[] = [
  { label: 'learning_rate (5e-5 → 3e-5)', impact: 85, level: 'high' },
  { label: 'warmup_steps (500 → 1000)', impact: 42, level: 'medium' },
  { label: 'dropout (0.1 → 0.05)', impact: 18, level: 'low' },
]

const MOCK_CONFIG_DIFFS: ConfigDiff[] = [
  { key: 'learning_rate', value1: '5e-5', value2: '3e-5' },
  { key: 'warmup_steps', value1: '500', value2: '1000' },
  { key: 'dropout', value1: '0.1', value2: '0.05' },
]

export function AnalysisPanel() {
  return (
    <div className="panel panel--analysis">
      <div className="panel__header">
        <span className="panel__title">Analysis</span>
      </div>
      <div className="panel__content">
        {/* Reward Hack Warning */}
        <div className="analysis-section">
          <div className="analysis-section__title">
            <WarningIcon />
            Reward Hack Detected
          </div>
          <div className="hack-warning">
            <div className="hack-warning__header">
              <div className="hack-warning__icon">⚠</div>
              <div className="hack-warning__title">LENGTH_GAMING</div>
            </div>
            <div className="hack-warning__experiment">
              <span className="hack-warning__color" style={{ background: 'var(--color-accent)' }} />
              v3.4 shows strong length-reward correlation
            </div>
            <div className="hack-warning__detail">
              <span>Correlation coefficient</span>
              <span className="hack-warning__detail-value">r = 0.73</span>
            </div>
            <div className="hack-warning__detail">
              <span>Length increase vs baseline</span>
              <span className="hack-warning__detail-value">+32% (187 tokens)</span>
            </div>
            <div className="hack-warning__detail">
              <span>Confidence</span>
              <span className="hack-warning__detail-value">94%</span>
            </div>
          </div>
        </div>

        {/* Recommended Winner */}
        <div className="analysis-section">
          <div className="analysis-section__title">
            <StarIcon />
            Recommended
          </div>
          <div className="analysis-card analysis-card--winner">
            <div className="analysis-winner">
              <div
                className="analysis-winner__color"
                style={{ background: 'var(--color-success)' }}
              />
              <div className="analysis-winner__info">
                <div className="analysis-winner__header">
                  <div className="analysis-winner__name">reward-model-v3.3</div>
                  <div className="analysis-winner__badge">Winner</div>
                </div>
                <div className="analysis-winner__confidence">
                  High confidence (p&lt;0.05 on 3/4 metrics)
                </div>
                <div className="analysis-winner__reasons">
                  <div className="analysis-winner__reason">
                    <span className="analysis-winner__reason-icon">✓</span>
                    <span>Lower loss (0.287 vs 0.342)</span>
                  </div>
                  <div className="analysis-winner__reason">
                    <span className="analysis-winner__reason-icon">✓</span>
                    <span>Higher genuine reward (+2.3%)</span>
                  </div>
                  <div className="analysis-winner__reason">
                    <span className="analysis-winner__reason-icon">✓</span>
                    <span>No reward hacking detected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Causal Attribution */}
        <div className="analysis-section">
          <div className="analysis-section__title">
            <BarChartIcon />
            Likely Impact (Config → Metrics)
          </div>
          <div className="causal-card">
            <div className="causal-card__header">
              Which config differences most explain the metric gaps?
            </div>
            {MOCK_CAUSAL_ITEMS.map((item, i) => (
              <div key={i} className="causal-item">
                <div className="causal-item__bar">
                  <div
                    className={`causal-item__bar-fill causal-item__bar-fill--${item.level}`}
                    style={{ width: `${item.impact}%` }}
                  />
                </div>
                <span className="causal-item__label">{item.label}</span>
                <span className="causal-item__impact">{item.impact}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Config Diff */}
        <div className="analysis-section">
          <div className="analysis-section__title">Config Differences</div>
          <div className="config-diff">
            {MOCK_CONFIG_DIFFS.map((diff, i) => (
              <div key={i} className="config-diff__item config-diff__item--different">
                <div className="config-diff__key">{diff.key}</div>
                <div className="config-diff__values">
                  <div className="config-diff__value">
                    <div
                      className="config-diff__color"
                      style={{ background: 'var(--color-accent)' }}
                    />
                    {diff.value1}
                  </div>
                  <div className="config-diff__value">
                    <div
                      className="config-diff__color"
                      style={{ background: 'var(--color-success)' }}
                    />
                    {diff.value2}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
