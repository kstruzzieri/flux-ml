import { useMemo } from 'react'
import { useExperimentStore } from '@stores'

function parseConfig(config: string): Record<string, unknown> | null {
  if (!config) return null
  try {
    const parsed = JSON.parse(config)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
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
  const experiment = useExperimentStore((s) => s.experiments.find((e) => e.id === s.selectedId))
  const config = experiment?.config

  const configEntries = useMemo(() => {
    if (!config) return null
    const parsed = parseConfig(config)
    if (!parsed) return null
    return Object.entries(parsed)
  }, [config])

  return (
    <div className="panel panel--config">
      <div className="panel__header">
        <span className="panel__title">Configuration</span>
      </div>
      <div className="panel__content">
        {!experiment ? (
          <div className="panel__placeholder">Select an experiment to view configuration</div>
        ) : !configEntries || configEntries.length === 0 ? (
          <div className="panel__placeholder">No configuration data</div>
        ) : (
          <div className="config-list">
            {configEntries.map(([key, value]) => (
              <div key={key} className="config-item" data-testid={`config-item-${key}`}>
                <span className="config-item__key">{key}</span>
                <span className="config-item__value" data-testid={`config-value-${key}`}>
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
