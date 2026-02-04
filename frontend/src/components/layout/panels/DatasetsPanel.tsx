import { useState } from 'react'

interface ExperimentRef {
  id: string
  color: string
}

interface Dataset {
  id: string
  name: string
  samples: number
  size: string
  usedBy: ExperimentRef[]
}

// Placeholder data - will be replaced with actual data from backend
const MOCK_DATASETS: Dataset[] = [
  {
    id: '1',
    name: 'preference-data-v2',
    samples: 45231,
    size: '12.4 MB',
    usedBy: [
      { id: '1', color: 'var(--color-accent)' },
      { id: '2', color: 'var(--color-success)' },
    ],
  },
  {
    id: '2',
    name: 'preference-data-v1',
    samples: 38102,
    size: '9.1 MB',
    usedBy: [],
  },
  {
    id: '3',
    name: 'helpfulness-eval',
    samples: 2500,
    size: '892 KB',
    usedBy: [],
  },
]

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
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

export function DatasetsPanel() {
  const [selectedId, setSelectedId] = useState<string | null>('1')

  return (
    <div className="panel panel--datasets">
      <div className="panel__header">
        <span className="panel__title">Datasets</span>
        <span className="panel__badge">{MOCK_DATASETS.length}</span>
      </div>
      <div className="panel__content">
        <div className="dataset-list">
          {MOCK_DATASETS.map((dataset) => (
            <div
              key={dataset.id}
              className={`dataset-item ${selectedId === dataset.id ? 'dataset-item--active' : ''}`}
              onClick={() => setSelectedId(dataset.id)}
            >
              <div className="dataset-item__header">
                <DatabaseIcon />
                <span className="dataset-item__name">{dataset.name}</span>
              </div>
              <div className="dataset-item__meta">
                <span>{dataset.samples.toLocaleString()} samples</span>
                <span>{dataset.size}</span>
              </div>
              {dataset.usedBy.length > 0 && (
                <div className="dataset-item__experiments">
                  Used by:
                  {dataset.usedBy.map((exp) => (
                    <span
                      key={exp.id}
                      className="dataset-item__experiment-dot"
                      style={{ backgroundColor: exp.color }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="import-btn">
          <PlusIcon />
          Import Dataset
        </button>
      </div>
    </div>
  )
}
