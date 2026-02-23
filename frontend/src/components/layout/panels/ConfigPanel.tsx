import { useMemo } from 'react'
import { useExperimentStore } from '@stores'

function parseConfig(config: string): Record<string, unknown> | null {
  if (!config) return null
  try {
    const parsed = JSON.parse(config)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

export function ConfigPanel() {
  const selectedId = useExperimentStore((s) => s.selectedId)
  const experiments = useExperimentStore((s) => s.experiments)
  const experiment = experiments.find((e) => e.id === selectedId)

  const configEntries = useMemo(() => {
    if (!experiment) return null
    const parsed = parseConfig(experiment.config)
    if (!parsed) return null
    return Object.entries(parsed)
  }, [experiment])

  return (
    <div className="panel panel--config">
      <div className="panel__header">
        <span className="panel__title">Configuration</span>
      </div>
      <div className="panel__content">
        {!experiment ? (
          <div className="panel__placeholder">Select an experiment to view configuration</div>
        ) : (
          <div className="config-panel-content">
            <div className="config-section">
              <div className="config-section__title">Configuration</div>
              {!configEntries || configEntries.length === 0 ? (
                <div className="panel__placeholder">No configuration data</div>
              ) : (
                <div className="config-list">
                  {configEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="config-item"
                      data-testid={`config-item-${key}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="config-item__key">{key}</span>
                      <span
                        className="config-item__value"
                        data-testid={`config-value-${key}`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {formatValue(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="stats-section">
              <div className="config-section__title">System</div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-card__label">GPU</div>
                  <div className="stat-card__value">A100 80GB</div>
                  <div className="stat-card__bar">
                    <div className="stat-card__bar-fill" style={{ width: '72%' }} />
                  </div>
                  <div className="stat-card__percent">72%</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">VRAM</div>
                  <div className="stat-card__value">58 / 80 GB</div>
                  <div className="stat-card__bar">
                    <div className="stat-card__bar-fill" style={{ width: '73%' }} />
                  </div>
                  <div className="stat-card__percent">73%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
