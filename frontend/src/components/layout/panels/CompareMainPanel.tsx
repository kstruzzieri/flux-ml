import { useState } from 'react'

const CHART_TABS = [
  'Loss',
  'Reward',
  'KL Divergence',
  'Response Length',
  'Reward Components',
] as const
type ChartTab = (typeof CHART_TABS)[number]

interface MetricRow {
  metric: string
  exp1: string
  exp2: string
  delta: string
  deltaType: 'better' | 'worse' | 'neutral'
  ci: string
  significant: boolean
  pValue?: string
  hasHack?: boolean
}

// Placeholder data - will be replaced with actual data from backend
const MOCK_METRICS: MetricRow[] = [
  {
    metric: 'Loss',
    exp1: '0.342',
    exp2: '0.287',
    delta: '+19.2%',
    deltaType: 'worse',
    ci: '±2.1%',
    significant: true,
    pValue: 'p<0.01',
  },
  {
    metric: 'Reward',
    exp1: '0.891',
    exp2: '0.912',
    delta: '-2.3%',
    deltaType: 'worse',
    ci: '±0.8%',
    significant: true,
    pValue: 'p<0.05',
  },
  {
    metric: 'Avg Length',
    exp1: '187',
    exp2: '142',
    delta: '+32%',
    deltaType: 'worse',
    ci: '±5',
    significant: true,
    pValue: 'p<0.001',
    hasHack: true,
  },
  {
    metric: 'KL Divergence',
    exp1: '0.024',
    exp2: '0.018',
    delta: '+33%',
    deltaType: 'neutral',
    ci: '±0.012',
    significant: false,
  },
  {
    metric: 'Length-Reward Corr.',
    exp1: '0.73',
    exp2: '0.12',
    delta: '+508%',
    deltaType: 'worse',
    ci: '±0.05',
    significant: true,
    pValue: 'p<0.001',
  },
]

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function CompareMainPanel() {
  const [activeTab, setActiveTab] = useState<ChartTab>('Loss')

  return (
    <div className="panel panel--compare-main">
      <div className="compare-body">
        {/* Compare header with chips */}
        <div className="compare-header">
          <span className="compare-header__label">Comparing:</span>
          <div className="compare-chips">
            <div className="compare-chip">
              <span className="compare-chip__color" style={{ background: 'var(--color-accent)' }} />
              <span>v3.4</span>
              <span className="compare-chip__hack-indicator" title="Reward hacking detected" />
              <span className="compare-chip__remove">
                <CloseIcon />
              </span>
            </div>
            <div className="compare-chip compare-chip--baseline">
              <span
                className="compare-chip__color"
                style={{ background: 'var(--color-success)' }}
              />
              <span>v3.3</span>
              <span className="compare-chip__baseline-tag">Baseline</span>
              <span className="compare-chip__remove">
                <CloseIcon />
              </span>
            </div>
            <button className="compare-add-btn">
              <PlusIcon />
              Add
            </button>
          </div>
          <div className="compare-header__actions">
            <button className="btn btn--secondary">Export</button>
            <button className="btn btn--secondary">Share Snapshot</button>
          </div>
        </div>

        {/* Chart area with tabs */}
        <div className="compare-main-chart">
          <div className="chart-tabs">
            {CHART_TABS.map((tab) => (
              <button
                key={tab}
                className={`chart-tab ${tab === activeTab ? 'chart-tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="chart-container">
            <div className="chart-legend">
              <div className="chart-legend__item">
                <span className="chart-legend__dot" style={{ background: 'var(--color-accent)' }} />
                reward-model-v3.4 (running)
              </div>
              <div className="chart-legend__item">
                <span
                  className="chart-legend__dot"
                  style={{ background: 'var(--color-success)' }}
                />
                reward-model-v3.3 (baseline)
              </div>
            </div>
            <div className="chart-body">
              [Large Overlaid {activeTab} Chart - aligned at step 8,420]
            </div>
          </div>
        </div>

        {/* Metrics comparison table */}
        <div className="compare-table-wrapper">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>v3.4</th>
                <th>v3.3 (baseline)</th>
                <th>Δ</th>
                <th>95% CI</th>
                <th>Sig?</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_METRICS.map((row) => (
                <tr key={row.metric}>
                  <td>
                    <span className="compare-table__metric">
                      {row.metric}
                      {row.hasHack && <span className="compare-table__metric-hack">HACK</span>}
                    </span>
                  </td>
                  <td
                    className={
                      row.metric === 'Length-Reward Corr.' ? 'compare-table__value--warning' : ''
                    }
                  >
                    {row.exp1}
                  </td>
                  <td>{row.exp2}</td>
                  <td>
                    <span className={`compare-table__delta compare-table__delta--${row.deltaType}`}>
                      {row.delta}
                    </span>
                  </td>
                  <td className="compare-table__ci">{row.ci}</td>
                  <td>
                    {row.significant ? (
                      <span className="compare-table__sig compare-table__sig--yes">
                        <CheckIcon />
                        {row.pValue}
                      </span>
                    ) : (
                      <span className="compare-table__sig compare-table__sig--no">n.s.</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
