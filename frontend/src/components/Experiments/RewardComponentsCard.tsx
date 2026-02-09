import { assessRewardDivergence } from '@utils/health'
import './MetricCard.css'

interface RewardComponentData {
  component: string
  value: number
  step: number
}

interface RewardComponentsCardProps {
  components: RewardComponentData[]
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function RewardComponentsCard({ components }: RewardComponentsCardProps) {
  if (components.length === 0) {
    return (
      <div className="metric-card reward-components-card">
        <span className="metric-card__label">Reward Components</span>
        <span className="reward-components-card__empty">No reward signal data</span>
      </div>
    )
  }

  const health = assessRewardDivergence(
    components.map((c) => ({ name: c.component, value: c.value }))
  )
  const healthClass = health !== 'none' ? `metric-card--${health}` : ''
  const maxAbsValue = Math.max(...components.map((c) => Math.abs(c.value)), 1e-10)
  const step = Math.max(...components.map((c) => c.step))

  return (
    <div className={`metric-card reward-components-card ${healthClass}`}>
      <div className="reward-components-card__header">
        <span className="metric-card__label">Reward Components</span>
        <span className="reward-components-card__step">Step {step.toLocaleString('en-US')}</span>
      </div>
      <div className="reward-components-card__bars">
        {components.map((c) => (
          <div key={c.component} className="reward-bar" data-testid="reward-bar">
            <span className="reward-bar__label">{capitalize(c.component)}</span>
            <div className="reward-bar__track">
              <div
                className="reward-bar__fill"
                style={{ width: `${(Math.abs(c.value) / maxAbsValue) * 100}%` }}
              />
            </div>
            <span className="reward-bar__value">{c.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
