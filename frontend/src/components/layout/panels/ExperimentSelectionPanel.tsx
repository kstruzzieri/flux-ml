import { useState } from 'react'
import { StatusDot } from '@components/ui/StatusDot/StatusDot'

interface Experiment {
  id: string
  name: string
  color: string
  selected: boolean
  duration: string
  steps: string
  status: 'running' | 'completed' | 'failed'
  hasHack?: boolean
}

// Placeholder data - will be replaced with actual data from backend
const MOCK_EXPERIMENTS: Experiment[] = [
  {
    id: '1',
    name: 'reward-model-v3.4',
    color: 'var(--color-accent)',
    selected: true,
    duration: '2h 14m',
    steps: '8,420 steps',
    status: 'running',
    hasHack: true,
  },
  {
    id: '2',
    name: 'reward-model-v3.3',
    color: 'var(--color-success)',
    selected: true,
    duration: '4h 22m',
    steps: '12,000 steps',
    status: 'completed',
  },
  {
    id: '3',
    name: 'ablation-no-dropout',
    color: 'var(--color-warning)',
    selected: false,
    duration: '1h 03m',
    steps: '4,100 steps',
    status: 'running',
  },
  {
    id: '4',
    name: 'high-lr-test',
    color: '#8B5CF6',
    selected: false,
    duration: '0h 12m',
    steps: 'failed',
    status: 'failed',
  },
]

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function ExperimentSelectionPanel() {
  const [experiments, setExperiments] = useState(MOCK_EXPERIMENTS)
  const [alignBy, setAlignBy] = useState<'step' | 'final' | 'time'>('step')

  const toggleExperiment = (id: string) => {
    setExperiments((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, selected: !exp.selected } : exp))
    )
  }

  const selectedCount = experiments.filter((e) => e.selected).length

  return (
    <div className="panel panel--experiment-selection">
      <div className="panel__header">
        <span className="panel__title">Select Experiments</span>
        <span className="panel__badge">{selectedCount} selected</span>
      </div>
      <div className="panel__content">
        {/* Temporal alignment control */}
        <div className="align-control">
          <span className="align-control__label">Align by:</span>
          <div className="align-control__toggle">
            <button
              className={`align-control__option ${alignBy === 'step' ? 'align-control__option--active' : ''}`}
              onClick={() => setAlignBy('step')}
            >
              Step
            </button>
            <button
              className={`align-control__option ${alignBy === 'final' ? 'align-control__option--active' : ''}`}
              onClick={() => setAlignBy('final')}
            >
              Final
            </button>
            <button
              className={`align-control__option ${alignBy === 'time' ? 'align-control__option--active' : ''}`}
              onClick={() => setAlignBy('time')}
            >
              Time
            </button>
          </div>
        </div>

        <div className="experiment-list">
          {experiments.map((exp) => (
            <div
              key={exp.id}
              className={`experiment-item ${exp.selected ? 'experiment-item--selected' : ''}`}
              onClick={() => toggleExperiment(exp.id)}
            >
              <span
                className={`experiment-item__checkbox ${exp.selected ? 'experiment-item__checkbox--checked' : ''}`}
              >
                {exp.selected && <CheckIcon />}
              </span>
              <span className="experiment-item__color" style={{ backgroundColor: exp.color }} />
              <div className="experiment-item__info">
                <div className="experiment-item__name">
                  {exp.name}
                  {exp.hasHack && <span className="experiment-item__hack-badge">⚠ HACK</span>}
                </div>
                <div className="experiment-item__meta">
                  {exp.duration} • {exp.steps}
                </div>
              </div>
              <StatusDot status={exp.status} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
