import { useExperimentStore } from '@stores/experimentStore'
import { useMetricsStore } from '@stores/metricsStore'
import { StatusDot } from '@components/ui/StatusDot/StatusDot'
import { formatDuration, formatStepCount, toExperimentStatus } from '@utils/formatting'
import { MetricsGrid } from '@components/Experiments/MetricsGrid'
import { ChartsArea } from '@components/Experiments/ChartsArea'

function FluxBanner() {
  return (
    <svg
      className="main-content__banner"
      viewBox="0 0 1280 640"
      aria-label="Flux - The ML Development Environment"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Divergent lines passing through text */}
      {/* Green - curves up */}
      <path
        d="M260 340 Q500 340 700 260 Q900 180 1020 120"
        stroke="#10B981"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />

      {/* Amber - curves down */}
      <path
        d="M260 340 Q500 360 700 440 Q900 520 1020 540"
        stroke="#F59E0B"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />

      {/* Cyan - stays relatively level */}
      <path
        d="M260 340 Q500 340 700 330 Q900 320 1020 310"
        stroke="#06B6D4"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />

      {/* Starting point */}
      <circle cx="260" cy="340" r="8" fill="#F0F6FC" opacity="0.9" filter="url(#glow)" />

      {/* Endpoints */}
      <circle cx="1020" cy="120" r="6" fill="#10B981" filter="url(#glow)" />
      <circle cx="1020" cy="540" r="6" fill="#F59E0B" filter="url(#glow)" />
      <circle cx="1020" cy="310" r="6" fill="#06B6D4" filter="url(#glow)" />

      {/* Wordmark */}
      <text
        x="640"
        y="380"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="180"
        fontWeight="600"
        letterSpacing="-6"
        textAnchor="middle"
        fill="#F0F6FC"
      >
        Flux
      </text>
    </svg>
  )
}

function useLatestStep(experimentId: string | null): number | null {
  const sparklineData = useMetricsStore((s) =>
    experimentId ? s.sparklineData[experimentId] : undefined
  )
  if (!sparklineData) return null
  let maxStep = 0
  for (const points of Object.values(sparklineData)) {
    for (const p of points) {
      if (p.step > maxStep) maxStep = p.step
    }
  }
  return maxStep > 0 ? maxStep : null
}

export function MainPanel() {
  const selectedId = useExperimentStore((s) => s.selectedId)
  const experiments = useExperimentStore((s) => s.experiments)
  const selected = experiments.find((e) => e.id === selectedId)
  const latestStep = useLatestStep(selected?.id ?? null)

  if (!selected) {
    return (
      <div className="panel panel--main">
        <div className="main-content__welcome">
          <FluxBanner />
          <p className="main-content__tagline">The ML development environment</p>
          <p className="main-content__hint">Select an experiment to view metrics</p>
        </div>
      </div>
    )
  }

  const status = toExperimentStatus(selected.status)
  const duration = formatDuration(selected.createdAt, selected.updatedAt, status)

  return (
    <div className="panel panel--main">
      <div className="experiment-header">
        <StatusDot status={status} />
        <div className="experiment-header__info">
          <h1 className="experiment-header__name">{selected.name}</h1>
          <div className="experiment-header__meta">
            <span aria-label={`Duration: ${duration}`}>{duration}</span>
            <span aria-label={`Status: ${status}`}>{status}</span>
            {latestStep !== null && (
              <span className="experiment-header__step" data-testid="step-count">
                Step {formatStepCount(latestStep)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="experiment-header__dashboard">
        <MetricsGrid experimentId={selected.id} />
        <ChartsArea experimentId={selected.id} />
      </div>
    </div>
  )
}
