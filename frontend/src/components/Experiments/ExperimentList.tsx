import { ExperimentCard } from './ExperimentCard'
import type { experiment } from '../../../wailsjs/go/models'
import './ExperimentList.css'

interface ExperimentListProps {
  experiments: experiment.Experiment[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ExperimentList({ experiments, selectedId, onSelect }: ExperimentListProps) {
  if (experiments.length === 0) {
    return (
      <div className="experiment-list">
        <div className="experiment-list__empty">No experiments yet</div>
      </div>
    )
  }

  return (
    <div className="experiment-list">
      {experiments.map((exp) => (
        <ExperimentCard
          key={exp.id}
          experiment={exp}
          isActive={exp.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
