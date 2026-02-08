import { ExperimentCard } from './ExperimentCard'
import type { Point } from '@utils/downsample'
import type { experiment } from '../../../wailsjs/go/models'
import './ExperimentList.css'

interface ExperimentListProps {
  experiments: experiment.Experiment[]
  selectedId: string | null
  onSelect: (id: string) => void
  metricsMap?: Record<string, Record<string, number>>
  sparklineDataMap?: Record<string, Record<string, Point[]>>
}

export function ExperimentList({
  experiments,
  selectedId,
  onSelect,
  metricsMap = {},
  sparklineDataMap = {},
}: ExperimentListProps) {
  if (experiments.length === 0) {
    return (
      <div className="experiment-list">
        <div className="experiment-list__empty">No experiments yet</div>
      </div>
    )
  }

  return (
    <div className="experiment-list">
      {experiments.map((exp) => {
        const expMetrics = metricsMap[exp.id]
        return (
          <ExperimentCard
            key={exp.id}
            experiment={exp}
            isActive={exp.id === selectedId}
            onSelect={onSelect}
            loss={expMetrics?.loss ?? null}
            reward={expMetrics?.reward ?? null}
            sparklineData={sparklineDataMap[exp.id]}
          />
        )
      })}
    </div>
  )
}
