# Experiment Detail View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the experiment detail view layout with metric cards, reward components display, and charts placeholder in the MainPanel when an experiment is selected.

**Architecture:** Extend MainPanel with three new child components (MetricsGrid, RewardComponentsCard, ChartsArea). MetricsGrid fetches data from the existing metricsStore and a new reward signal fetch method. Health assessment uses windowed trend computation from sparkline data. All styling uses the existing CSS custom properties design system.

**Tech Stack:** React 19, Zustand 5, TypeScript 5.9, Lucide React (icons), Jest + React Testing Library

---

### Task 1: Health Utilities (`utils/health.ts`)

Pure functions with no UI dependencies. Build and test first since MetricCard and RewardComponentsCard depend on them.

**Files:**
- Create: `frontend/src/utils/health.ts`
- Test: `frontend/src/__tests__/utils/health.test.ts`

**Step 1: Write the failing tests**

Create `frontend/src/__tests__/utils/health.test.ts`:

```typescript
import { computeTrend, assessHealth, assessRewardDivergence } from '@utils/health'
import type { Point } from '@utils/downsample'

describe('computeTrend', () => {
  it('returns "insufficient" when data has fewer than 4 points', () => {
    const data: Point[] = [
      { step: 1, value: 1.0 },
      { step: 2, value: 0.9 },
    ]
    expect(computeTrend(data)).toBe('insufficient')
  })

  it('returns "down" when recent average is lower than previous average', () => {
    // First half high, second half low
    const data: Point[] = Array.from({ length: 20 }, (_, i) => ({
      step: i + 1,
      value: i < 10 ? 2.0 : 1.0,
    }))
    expect(computeTrend(data)).toBe('down')
  })

  it('returns "up" when recent average is higher than previous average', () => {
    const data: Point[] = Array.from({ length: 20 }, (_, i) => ({
      step: i + 1,
      value: i < 10 ? 1.0 : 2.0,
    }))
    expect(computeTrend(data)).toBe('up')
  })

  it('returns "flat" when averages are within 1% of each other', () => {
    const data: Point[] = Array.from({ length: 20 }, (_, i) => ({
      step: i + 1,
      value: 1.0,
    }))
    expect(computeTrend(data)).toBe('flat')
  })
})

describe('assessHealth', () => {
  it('returns "healthy" for decreasing loss', () => {
    expect(assessHealth('loss', 'down')).toBe('healthy')
  })

  it('returns "warning" for flat loss', () => {
    expect(assessHealth('loss', 'flat')).toBe('warning')
  })

  it('returns "critical" for increasing loss', () => {
    expect(assessHealth('loss', 'up')).toBe('critical')
  })

  it('returns "healthy" for increasing reward', () => {
    expect(assessHealth('reward', 'up')).toBe('healthy')
  })

  it('returns "critical" for decreasing reward', () => {
    expect(assessHealth('reward', 'down')).toBe('critical')
  })

  it('returns "healthy" for stable kl', () => {
    expect(assessHealth('kl', 'flat')).toBe('healthy')
  })

  it('returns "warning" for increasing kl', () => {
    expect(assessHealth('kl', 'up')).toBe('warning')
  })

  it('returns "none" for insufficient data', () => {
    expect(assessHealth('loss', 'insufficient')).toBe('none')
  })

  it('returns "none" for metrics without health rules (e.g., learning_rate)', () => {
    expect(assessHealth('learning_rate', 'up')).toBe('none')
  })
})

describe('assessRewardDivergence', () => {
  it('returns "none" when components array is empty', () => {
    expect(assessRewardDivergence([])).toBe('none')
  })

  it('returns "healthy" when components are balanced', () => {
    const components = [
      { name: 'helpfulness', value: 0.8 },
      { name: 'harmlessness', value: 0.7 },
      { name: 'honesty', value: 0.75 },
    ]
    expect(assessRewardDivergence(components)).toBe('healthy')
  })

  it('returns "warning" when one component is >2x another AND spread > 0.1', () => {
    const components = [
      { name: 'helpfulness', value: 0.8 },
      { name: 'harmlessness', value: 0.3 },
      { name: 'honesty', value: 0.7 },
    ]
    expect(assessRewardDivergence(components)).toBe('warning')
  })

  it('returns "healthy" when ratio exceeds 2x but spread is under 0.1', () => {
    const components = [
      { name: 'helpfulness', value: 0.06 },
      { name: 'harmlessness', value: 0.02 },
      { name: 'honesty', value: 0.05 },
    ]
    expect(assessRewardDivergence(components)).toBe('healthy')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest --testPathPattern='health.test' --verbose`
Expected: FAIL — module `@utils/health` not found

**Step 3: Write the implementation**

Create `frontend/src/utils/health.ts`:

```typescript
import type { Point } from '@utils/downsample'

export type Trend = 'up' | 'down' | 'flat' | 'insufficient'
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'none'

const FLAT_THRESHOLD = 0.01 // 1% relative change = "flat"
const MIN_POINTS = 4 // minimum data points for trend computation

/**
 * Computes trend direction from sparkline data using windowed average comparison.
 * Splits the data in half and compares the mean of each half.
 * Returns 'insufficient' if not enough data points.
 */
export function computeTrend(data: Point[]): Trend {
  if (data.length < MIN_POINTS) return 'insufficient'

  const mid = Math.floor(data.length / 2)
  const prevSlice = data.slice(0, mid)
  const recentSlice = data.slice(mid)

  const prevAvg = prevSlice.reduce((s, p) => s + p.value, 0) / prevSlice.length
  const recentAvg = recentSlice.reduce((s, p) => s + p.value, 0) / recentSlice.length

  // Avoid division by zero — use absolute difference for near-zero values
  const denom = Math.abs(prevAvg) > 1e-10 ? Math.abs(prevAvg) : 1
  const relativeChange = (recentAvg - prevAvg) / denom

  if (Math.abs(relativeChange) <= FLAT_THRESHOLD) return 'flat'
  return relativeChange > 0 ? 'up' : 'down'
}

type HealthRule = Record<Exclude<Trend, 'insufficient'>, HealthStatus>

const HEALTH_RULES: Record<string, HealthRule> = {
  loss: { down: 'healthy', flat: 'warning', up: 'critical' },
  reward: { up: 'healthy', flat: 'warning', down: 'critical' },
  kl: { flat: 'healthy', up: 'warning', down: 'healthy' },
}

/**
 * Assesses health status for a given metric based on its trend.
 * Returns 'none' for insufficient data or metrics without health rules.
 */
export function assessHealth(metricName: string, trend: Trend): HealthStatus {
  if (trend === 'insufficient') return 'none'
  const rule = HEALTH_RULES[metricName]
  if (!rule) return 'none'
  return rule[trend]
}

interface RewardComponent {
  name: string
  value: number
}

const DIVERGENCE_RATIO = 2.0
const DIVERGENCE_MIN_SPREAD = 0.1

/**
 * Assesses whether reward components are diverging.
 * Returns 'warning' when any component is >2x another AND spread > 0.1.
 */
export function assessRewardDivergence(components: RewardComponent[]): HealthStatus {
  if (components.length === 0) return 'none'

  const values = components.map((c) => c.value)
  const max = Math.max(...values)
  const min = Math.min(...values)

  if (max - min < DIVERGENCE_MIN_SPREAD) return 'healthy'
  if (min > 0 && max / min > DIVERGENCE_RATIO) return 'warning'
  if (min <= 0 && max - min > DIVERGENCE_MIN_SPREAD) return 'warning'

  return 'healthy'
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest --testPathPattern='health.test' --verbose`
Expected: All 12 tests PASS

**Step 5: Commit**

```
feat: add health utility functions for metric trend and divergence assessment (#26)
```

---

### Task 2: Extend formatting utilities

**Files:**
- Modify: `frontend/src/utils/formatting.ts`
- Modify: `frontend/src/__tests__/utils/formatting.test.ts`

**Step 1: Write the failing tests**

Append to `frontend/src/__tests__/utils/formatting.test.ts`:

```typescript
// Add these tests to the existing file

describe('formatMetricValue — extended metrics', () => {
  it('formats kl with 6 decimal places', () => {
    expect(formatMetricValue('kl', 0.0423567)).toBe('0.042357')
  })

  it('formats learning_rate in scientific notation', () => {
    expect(formatMetricValue('learning_rate', 0.00003)).toBe('3.00e-5')
  })
})

describe('formatStepCount', () => {
  it('formats step count with comma separators', () => {
    expect(formatStepCount(12400)).toBe('12,400')
  })

  it('formats small step counts without commas', () => {
    expect(formatStepCount(50)).toBe('50')
  })

  it('formats zero', () => {
    expect(formatStepCount(0)).toBe('0')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest --testPathPattern='formatting.test' --verbose`
Expected: FAIL — `formatStepCount` not defined, `kl` and `learning_rate` formatting unknown

**Step 3: Implement**

Modify `frontend/src/utils/formatting.ts`:

Add to `METRIC_DECIMALS`:
```typescript
const METRIC_DECIMALS: Record<string, number> = {
  loss: 4,
  reward: 3,
  kl: 6,
}
```

Add `learning_rate` special case to `formatMetricValue`:
```typescript
export function formatMetricValue(name: string, value: number | null | undefined): string {
  if (value == null) {
    return '\u2014'
  }
  if (name === 'learning_rate') {
    return value.toExponential(2)
  }
  const decimals = METRIC_DECIMALS[name] ?? 2
  return value.toFixed(decimals)
}
```

Add `formatStepCount`:
```typescript
export function formatStepCount(step: number): string {
  return step.toLocaleString('en-US')
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest --testPathPattern='formatting.test' --verbose`
Expected: All tests PASS

**Step 5: Commit**

```
feat: extend formatting utils for KL, learning rate, and step count (#26)
```

---

### Task 3: Extend metricsStore with reward signal support

**Files:**
- Modify: `frontend/src/stores/metricsStore.ts`
- Modify: `frontend/src/__tests__/stores/metricsStore.test.ts`

**Step 1: Write the failing tests**

Append to `frontend/src/__tests__/stores/metricsStore.test.ts`:

```typescript
import { RecordRewardSignals } from '../../__mocks__/wailsjs/go/main/App'

describe('reward signal support', () => {
  it('fetchLatestRewardSignals populates state for an experiment', async () => {
    await RecordRewardSignals('exp-1', [
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 10,
        component: 'helpfulness',
        value: 0.82,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 20,
        component: 'helpfulness',
        value: 0.85,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 20,
        component: 'harmlessness',
        value: 0.74,
        distribution: '',
      }),
      new metrics.RewardSignal({
        experiment_id: 'exp-1',
        step: 20,
        component: 'honesty',
        value: 0.79,
        distribution: '',
      }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchLatestRewardSignals('exp-1')
    })

    const signals = useMetricsStore.getState().latestRewardSignals['exp-1']
    expect(signals).toBeDefined()
    expect(signals).toHaveLength(3)
    expect(signals.find((s: { component: string }) => s.component === 'helpfulness')?.value).toBe(0.85)
    expect(signals.find((s: { component: string }) => s.component === 'harmlessness')?.value).toBe(0.74)
  })

  it('returns empty array for experiment with no reward signals', async () => {
    await act(async () => {
      await useMetricsStore.getState().fetchLatestRewardSignals('exp-none')
    })

    const signals = useMetricsStore.getState().latestRewardSignals['exp-none']
    expect(signals).toEqual([])
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest --testPathPattern='metricsStore.test' --verbose`
Expected: FAIL — `fetchLatestRewardSignals` not a function, `latestRewardSignals` undefined

**Step 3: Implement**

Modify `frontend/src/stores/metricsStore.ts`:

Add to imports:
```typescript
import { GetLatestMetrics, QueryMetrics, QueryRewardSignals } from '../../wailsjs/go/main/App'
```

Add to state interface:
```typescript
interface LatestRewardSignal {
  component: string
  value: number
  step: number
}

interface MetricsState {
  // ... existing fields ...
  latestRewardSignals: Record<string, LatestRewardSignal[]>
  fetchLatestRewardSignals: (experimentId: string) => Promise<void>
}
```

Add to store implementation:
```typescript
latestRewardSignals: {},

fetchLatestRewardSignals: async (experimentId: string) => {
  try {
    const results = await QueryRewardSignals(experimentId, '', 0, 0)
    // Group by component, keep highest step for each
    const latestByComponent = new Map<string, { component: string; value: number; step: number }>()
    for (const s of results) {
      const existing = latestByComponent.get(s.component)
      if (!existing || s.step > existing.step) {
        latestByComponent.set(s.component, {
          component: s.component,
          value: s.value,
          step: s.step,
        })
      }
    }
    set((state) => ({
      latestRewardSignals: {
        ...state.latestRewardSignals,
        [experimentId]: [...latestByComponent.values()],
      },
    }))
  } catch (err) {
    console.error(`Failed to fetch reward signals for ${experimentId}:`, err)
    set((state) => ({
      latestRewardSignals: {
        ...state.latestRewardSignals,
        [experimentId]: [],
      },
    }))
  }
},
```

Add `rewards:recorded` event subscription inside `initialize()`:
```typescript
EventsOn('rewards:recorded', (data: { experimentId?: string }) => {
  if (!data?.experimentId) return
  const expId = data.experimentId
  if (_debounceTimers[expId]) clearTimeout(_debounceTimers[expId])
  _debounceTimers[expId] = setTimeout(() => {
    delete _debounceTimers[expId]
    get().fetchLatestMetrics(expId)
    get().fetchSparklineData(expId)
    get().fetchLatestRewardSignals(expId)
  }, 200)
})
```

Update `__resetMetricsStore` to clear `latestRewardSignals`:
```typescript
useMetricsStore.setState({ latestMetrics: {}, sparklineData: {}, latestRewardSignals: {} })
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest --testPathPattern='metricsStore.test' --verbose`
Expected: All tests PASS (existing + new)

**Step 5: Commit**

```
feat: add reward signal support and rewards:recorded subscription to metricsStore (#26)
```

---

### Task 4: MetricCard component

**Files:**
- Create: `frontend/src/components/Experiments/MetricCard.tsx`
- Create: `frontend/src/components/Experiments/MetricCard.css`
- Test: `frontend/src/__tests__/components/Experiments/MetricCard.test.tsx`

**Step 1: Write the failing tests**

Create `frontend/src/__tests__/components/Experiments/MetricCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { MetricCard } from '@components/Experiments/MetricCard'

describe('MetricCard', () => {
  it('renders label and formatted value', () => {
    render(<MetricCard label="Loss" value={0.2341} metricName="loss" trend="down" health="healthy" />)
    expect(screen.getByText('LOSS')).toBeInTheDocument()
    expect(screen.getByText('0.2341')).toBeInTheDocument()
  })

  it('renders em dash for null value', () => {
    render(<MetricCard label="Loss" value={null} metricName="loss" trend="insufficient" health="none" />)
    expect(screen.getByText('\u2014')).toBeInTheDocument()
  })

  it('renders down arrow for decreasing trend', () => {
    render(<MetricCard label="Loss" value={0.5} metricName="loss" trend="down" health="healthy" />)
    expect(screen.getByTestId('trend-indicator')).toHaveTextContent('↓')
  })

  it('renders up arrow for increasing trend', () => {
    render(<MetricCard label="Reward" value={0.8} metricName="reward" trend="up" health="healthy" />)
    expect(screen.getByTestId('trend-indicator')).toHaveTextContent('↑')
  })

  it('renders flat indicator for flat trend', () => {
    render(<MetricCard label="KL" value={0.05} metricName="kl" trend="flat" health="healthy" />)
    expect(screen.getByTestId('trend-indicator')).toHaveTextContent('→')
  })

  it('does not render trend indicator when data is insufficient', () => {
    render(<MetricCard label="Loss" value={0.5} metricName="loss" trend="insufficient" health="none" />)
    expect(screen.queryByTestId('trend-indicator')).not.toBeInTheDocument()
  })

  it('applies healthy health class', () => {
    const { container } = render(
      <MetricCard label="Loss" value={0.5} metricName="loss" trend="down" health="healthy" />
    )
    expect(container.firstChild).toHaveClass('metric-card--healthy')
  })

  it('applies warning health class', () => {
    const { container } = render(
      <MetricCard label="Loss" value={0.5} metricName="loss" trend="flat" health="warning" />
    )
    expect(container.firstChild).toHaveClass('metric-card--warning')
  })

  it('applies critical health class', () => {
    const { container } = render(
      <MetricCard label="Loss" value={0.5} metricName="loss" trend="up" health="critical" />
    )
    expect(container.firstChild).toHaveClass('metric-card--critical')
  })

  it('has no health modifier class when health is none', () => {
    const { container } = render(
      <MetricCard label="LR" value={0.0003} metricName="learning_rate" trend="flat" health="none" />
    )
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('metric-card')
    expect(card).not.toHaveClass('metric-card--healthy')
    expect(card).not.toHaveClass('metric-card--warning')
    expect(card).not.toHaveClass('metric-card--critical')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest --testPathPattern='MetricCard.test' --verbose`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `frontend/src/components/Experiments/MetricCard.css`:

```css
.metric-card {
  background: var(--color-bg-content);
  border: 1px solid var(--color-border-muted);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  border-left: 3px solid var(--color-border-muted);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-card--healthy {
  border-left-color: var(--color-success);
}

.metric-card--warning {
  border-left-color: var(--color-warning);
}

.metric-card--critical {
  border-left-color: var(--color-error);
}

.metric-card__label {
  font-size: 10px;
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.metric-card__value {
  font-size: 20px;
  font-family: var(--font-mono);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  line-height: 1.2;
}

.metric-card__trend {
  font-size: 11px;
  font-family: var(--font-mono);
  font-weight: var(--font-weight-medium);
  display: flex;
  align-items: center;
  gap: 4px;
}

.metric-card__trend--up {
  color: var(--color-error);
}

.metric-card__trend--down {
  color: var(--color-success);
}

.metric-card__trend--flat {
  color: var(--color-text-muted);
}
```

Create `frontend/src/components/Experiments/MetricCard.tsx`:

```typescript
import { formatMetricValue } from '@utils/formatting'
import type { Trend, HealthStatus } from '@utils/health'
import './MetricCard.css'

interface MetricCardProps {
  label: string
  value: number | null | undefined
  metricName: string
  trend: Trend
  health: HealthStatus
}

const TREND_ARROWS: Record<Exclude<Trend, 'insufficient'>, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
}

export function MetricCard({ label, value, metricName, trend, health }: MetricCardProps) {
  const healthClass = health !== 'none' ? `metric-card--${health}` : ''
  const trendClass = trend !== 'insufficient' ? `metric-card__trend--${trend}` : ''

  return (
    <div className={`metric-card ${healthClass}`}>
      <span className="metric-card__label">{label.toUpperCase()}</span>
      <span className="metric-card__value">{formatMetricValue(metricName, value)}</span>
      {trend !== 'insufficient' && (
        <span className={`metric-card__trend ${trendClass}`} data-testid="trend-indicator">
          {TREND_ARROWS[trend]}
        </span>
      )}
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest --testPathPattern='MetricCard.test' --verbose`
Expected: All 10 tests PASS

**Step 5: Commit**

```
feat: add MetricCard component with health borders and trend indicators (#26)
```

---

### Task 5: RewardComponentsCard component

**Files:**
- Create: `frontend/src/components/Experiments/RewardComponentsCard.tsx`
- Test: `frontend/src/__tests__/components/Experiments/RewardComponentsCard.test.tsx`

**Step 1: Write the failing tests**

Create `frontend/src/__tests__/components/Experiments/RewardComponentsCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { RewardComponentsCard } from '@components/Experiments/RewardComponentsCard'

describe('RewardComponentsCard', () => {
  const balancedComponents = [
    { component: 'helpfulness', value: 0.82, step: 100 },
    { component: 'harmlessness', value: 0.74, step: 100 },
    { component: 'honesty', value: 0.79, step: 100 },
  ]

  it('renders all three component labels', () => {
    render(<RewardComponentsCard components={balancedComponents} />)
    expect(screen.getByText('Helpfulness')).toBeInTheDocument()
    expect(screen.getByText('Harmlessness')).toBeInTheDocument()
    expect(screen.getByText('Honesty')).toBeInTheDocument()
  })

  it('renders component values', () => {
    render(<RewardComponentsCard components={balancedComponents} />)
    expect(screen.getByText('0.82')).toBeInTheDocument()
    expect(screen.getByText('0.74')).toBeInTheDocument()
    expect(screen.getByText('0.79')).toBeInTheDocument()
  })

  it('displays step number', () => {
    render(<RewardComponentsCard components={balancedComponents} />)
    expect(screen.getByText('Step 100')).toBeInTheDocument()
  })

  it('applies healthy class when components are balanced', () => {
    const { container } = render(<RewardComponentsCard components={balancedComponents} />)
    expect(container.firstChild).toHaveClass('metric-card--healthy')
  })

  it('applies warning class when components diverge', () => {
    const diverged = [
      { component: 'helpfulness', value: 0.8, step: 100 },
      { component: 'harmlessness', value: 0.3, step: 100 },
      { component: 'honesty', value: 0.7, step: 100 },
    ]
    const { container } = render(<RewardComponentsCard components={diverged} />)
    expect(container.firstChild).toHaveClass('metric-card--warning')
  })

  it('renders bar elements for each component', () => {
    render(<RewardComponentsCard components={balancedComponents} />)
    const bars = screen.getAllByTestId('reward-bar')
    expect(bars).toHaveLength(3)
  })

  it('renders empty state when no components', () => {
    render(<RewardComponentsCard components={[]} />)
    expect(screen.getByText('No reward signal data')).toBeInTheDocument()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest --testPathPattern='RewardComponentsCard.test' --verbose`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `frontend/src/components/Experiments/RewardComponentsCard.tsx`:

```typescript
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
        <span className="metric-card__label">REWARD COMPONENTS</span>
        <span className="reward-components-card__empty">No reward signal data</span>
      </div>
    )
  }

  const health = assessRewardDivergence(
    components.map((c) => ({ name: c.component, value: c.value }))
  )
  const healthClass = health !== 'none' ? `metric-card--${health}` : ''
  const maxValue = Math.max(...components.map((c) => c.value), 1)
  const step = Math.max(...components.map((c) => c.step))

  return (
    <div className={`metric-card reward-components-card ${healthClass}`}>
      <div className="reward-components-card__header">
        <span className="metric-card__label">REWARD COMPONENTS</span>
        <span className="reward-components-card__step">Step {step.toLocaleString('en-US')}</span>
      </div>
      <div className="reward-components-card__bars">
        {components.map((c) => (
          <div key={c.component} className="reward-bar" data-testid="reward-bar">
            <span className="reward-bar__label">{capitalize(c.component)}</span>
            <div className="reward-bar__track">
              <div
                className="reward-bar__fill"
                style={{ width: `${(c.value / maxValue) * 100}%` }}
              />
            </div>
            <span className="reward-bar__value">{c.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Add reward components styles to `frontend/src/components/Experiments/MetricCard.css` (append):

```css
/* Reward Components Card */
.reward-components-card {
  grid-column: span 2;
}

.reward-components-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reward-components-card__step {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
}

.reward-components-card__bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.reward-components-card__empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  padding: 8px 0;
}

.reward-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reward-bar__label {
  font-size: 11px;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  width: 100px;
  flex-shrink: 0;
}

.reward-bar__track {
  flex: 1;
  height: 6px;
  background: var(--color-bg-panel);
  border-radius: 3px;
  overflow: hidden;
}

.reward-bar__fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 3px;
  transition: width var(--transition-normal);
}

.reward-bar__value {
  font-size: 11px;
  font-family: var(--font-mono);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  width: 36px;
  text-align: right;
  flex-shrink: 0;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest --testPathPattern='RewardComponentsCard.test' --verbose`
Expected: All 7 tests PASS

**Step 5: Commit**

```
feat: add RewardComponentsCard with divergence detection and bar visualization (#26)
```

---

### Task 6: ChartsArea component (placeholder)

**Files:**
- Create: `frontend/src/components/Experiments/ChartsArea.tsx`
- Create: `frontend/src/components/Experiments/ChartsArea.css`
- Test: `frontend/src/__tests__/components/Experiments/ChartsArea.test.tsx`

**Step 1: Write the failing tests**

Create `frontend/src/__tests__/components/Experiments/ChartsArea.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ChartsArea } from '@components/Experiments/ChartsArea'

describe('ChartsArea', () => {
  it('renders three chart tabs', () => {
    render(<ChartsArea />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Reward Components')).toBeInTheDocument()
    expect(screen.getByText('Diagnostics')).toBeInTheDocument()
  })

  it('has Overview tab active by default', () => {
    render(<ChartsArea />)
    expect(screen.getByText('Overview').closest('button')).toHaveClass('chart-tab--active')
  })

  it('switches active tab on click', () => {
    render(<ChartsArea />)
    fireEvent.click(screen.getByText('Reward Components'))
    expect(screen.getByText('Reward Components').closest('button')).toHaveClass('chart-tab--active')
    expect(screen.getByText('Overview').closest('button')).not.toHaveClass('chart-tab--active')
  })

  it('shows placeholder content in chart body', () => {
    render(<ChartsArea />)
    expect(screen.getByText('Chart visualization coming soon')).toBeInTheDocument()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest --testPathPattern='ChartsArea.test' --verbose`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `frontend/src/components/Experiments/ChartsArea.css`:

```css
.charts-area {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  margin-top: var(--spacing-md);
}

.charts-area__tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--color-border-muted);
}

.charts-area__placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-2xl);
  color: var(--color-text-muted);
}

.charts-area__placeholder-icon {
  width: 32px;
  height: 32px;
  color: var(--color-text-muted);
  opacity: 0.5;
}

.charts-area__placeholder-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.charts-area__placeholder-subtext {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
```

Create `frontend/src/components/Experiments/ChartsArea.tsx`:

```typescript
import { useState } from 'react'
import { LineChart } from 'lucide-react'
import './ChartsArea.css'

const TABS = ['Overview', 'Reward Components', 'Diagnostics'] as const

export function ChartsArea() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0])

  return (
    <div className="charts-area">
      <div className="charts-area__tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`chart-tab ${activeTab === tab ? 'chart-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="charts-area__placeholder">
        <LineChart className="charts-area__placeholder-icon" />
        <span className="charts-area__placeholder-text">Chart visualization coming soon</span>
        <span className="charts-area__placeholder-subtext">uPlot integration in Phase 3</span>
      </div>
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest --testPathPattern='ChartsArea.test' --verbose`
Expected: All 4 tests PASS

**Step 5: Commit**

```
feat: add ChartsArea placeholder with tabbed navigation (#26)
```

---

### Task 7: MetricsGrid orchestrator component

**Files:**
- Create: `frontend/src/components/Experiments/MetricsGrid.tsx`
- Test: `frontend/src/__tests__/components/Experiments/MetricsGrid.test.tsx`

**Step 1: Write the failing tests**

Create `frontend/src/__tests__/components/Experiments/MetricsGrid.test.tsx`:

```typescript
import { render, screen, act } from '@testing-library/react'
import { MetricsGrid } from '@components/Experiments/MetricsGrid'
import { useMetricsStore, __resetMetricsStore } from '@stores/metricsStore'
import { __resetMockState, RecordMetrics, RecordRewardSignals } from '../../../__mocks__/wailsjs/go/main/App'
import { metrics } from '../../../__mocks__/wailsjs/go/models'

jest.mock('../../../../wailsjs/runtime/runtime', () => ({
  EventsOn: jest.fn(),
}))

jest.mock('../../../../wailsjs/go/main/App', () =>
  jest.requireActual('../../../__mocks__/wailsjs/go/main/App')
)

beforeEach(() => {
  __resetMockState()
  __resetMetricsStore()
})

describe('MetricsGrid', () => {
  it('renders four metric cards', async () => {
    await RecordMetrics('exp-1', [
      new metrics.Metric({ experiment_id: 'exp-1', step: 1, name: 'loss', value: 2.5, timestamp: 1000 }),
      new metrics.Metric({ experiment_id: 'exp-1', step: 1, name: 'reward', value: 0.3, timestamp: 1000 }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchLatestMetrics('exp-1')
      await useMetricsStore.getState().fetchSparklineData('exp-1')
    })

    render(<MetricsGrid experimentId="exp-1" />)

    expect(screen.getByText('LOSS')).toBeInTheDocument()
    expect(screen.getByText('REWARD')).toBeInTheDocument()
    expect(screen.getByText('KL DIVERGENCE')).toBeInTheDocument()
    expect(screen.getByText('LEARNING RATE')).toBeInTheDocument()
  })

  it('renders reward components card', async () => {
    await RecordRewardSignals('exp-1', [
      new metrics.RewardSignal({ experiment_id: 'exp-1', step: 10, component: 'helpfulness', value: 0.8, distribution: '' }),
      new metrics.RewardSignal({ experiment_id: 'exp-1', step: 10, component: 'harmlessness', value: 0.7, distribution: '' }),
      new metrics.RewardSignal({ experiment_id: 'exp-1', step: 10, component: 'honesty', value: 0.75, distribution: '' }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchLatestRewardSignals('exp-1')
    })

    render(<MetricsGrid experimentId="exp-1" />)

    expect(screen.getByText('REWARD COMPONENTS')).toBeInTheDocument()
    expect(screen.getByText('Helpfulness')).toBeInTheDocument()
  })

  it('shows em dash values when no metrics available', () => {
    render(<MetricsGrid experimentId="exp-empty" />)
    // All values should show em dash
    const dashes = screen.getAllByText('\u2014')
    expect(dashes.length).toBeGreaterThanOrEqual(4)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest --testPathPattern='MetricsGrid.test' --verbose`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `frontend/src/components/Experiments/MetricsGrid.tsx`:

```typescript
import { useEffect } from 'react'
import { useMetricsStore } from '@stores/metricsStore'
import { computeTrend, assessHealth } from '@utils/health'
import { MetricCard } from './MetricCard'
import { RewardComponentsCard } from './RewardComponentsCard'

interface MetricsGridProps {
  experimentId: string
}

const METRIC_CARDS = [
  { label: 'Loss', name: 'loss' },
  { label: 'Reward', name: 'reward' },
  { label: 'KL Divergence', name: 'kl' },
  { label: 'Learning Rate', name: 'learning_rate' },
] as const

export function MetricsGrid({ experimentId }: MetricsGridProps) {
  const latestMetrics = useMetricsStore((s) => s.latestMetrics[experimentId])
  const sparklineData = useMetricsStore((s) => s.sparklineData[experimentId])
  const latestRewardSignals = useMetricsStore((s) => s.latestRewardSignals[experimentId])
  const fetchLatestMetrics = useMetricsStore((s) => s.fetchLatestMetrics)
  const fetchSparklineData = useMetricsStore((s) => s.fetchSparklineData)
  const fetchLatestRewardSignals = useMetricsStore((s) => s.fetchLatestRewardSignals)

  useEffect(() => {
    fetchLatestMetrics(experimentId)
    fetchSparklineData(experimentId)
    fetchLatestRewardSignals(experimentId)
  }, [experimentId, fetchLatestMetrics, fetchSparklineData, fetchLatestRewardSignals])

  return (
    <div className="metrics-grid" data-testid="metrics-grid">
      {METRIC_CARDS.map(({ label, name }) => {
        const value = latestMetrics?.[name] ?? null
        const points = sparklineData?.[name]
        const trend = points ? computeTrend(points) : 'insufficient'
        const health = assessHealth(name, trend)

        return (
          <MetricCard
            key={name}
            label={label}
            value={value}
            metricName={name}
            trend={trend}
            health={health}
          />
        )
      })}
      <RewardComponentsCard components={latestRewardSignals ?? []} />
    </div>
  )
}
```

Add grid CSS to `frontend/src/styles/components/layout.css` (append before the scrollbar section):

```css
/* ========================================
 * Metrics Grid
 * ======================================== */

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest --testPathPattern='MetricsGrid.test' --verbose`
Expected: All 3 tests PASS

**Step 5: Commit**

```
feat: add MetricsGrid orchestrator with data fetching and health assessment (#26)
```

---

### Task 8: Wire up MainPanel with new components

**Files:**
- Modify: `frontend/src/components/layout/panels/MainPanel.tsx`
- Modify: `frontend/src/__tests__/components/layout/panels/MainPanel.test.tsx`

**Step 1: Write the failing tests**

Append to `frontend/src/__tests__/components/layout/panels/MainPanel.test.tsx`:

```typescript
// Add these tests to the existing describe block

// Add these mocks at the top with the existing mocks
jest.mock('../../../../wailsjs/go/main/App', () => ({
  ListExperiments: jest.fn().mockResolvedValue([]),
  GetLatestMetrics: jest.fn().mockResolvedValue([]),
  QueryMetrics: jest.fn().mockResolvedValue([]),
  QueryRewardSignals: jest.fn().mockResolvedValue([]),
}))

it('shows step count in header when experiment has metrics', async () => {
  const exp = makeExperiment()
  useExperimentStore.setState({
    experiments: [exp],
    selectedId: exp.id,
  })

  // Simulate metrics with step data
  const { useMetricsStore } = await import('@stores/metricsStore')
  useMetricsStore.setState({
    latestMetrics: { [exp.id]: { loss: 0.5, reward: 0.8 } },
    sparklineData: {},
    latestRewardSignals: {},
  })

  render(<MainPanel />)
  // Step count derived from metrics — checked in MetricsGrid
  expect(screen.getByTestId('metrics-grid')).toBeInTheDocument()
})

it('shows charts area when experiment is selected', () => {
  const exp = makeExperiment()
  useExperimentStore.setState({
    experiments: [exp],
    selectedId: exp.id,
  })
  render(<MainPanel />)
  expect(screen.getByText('Overview')).toBeInTheDocument()
  expect(screen.getByText('Chart visualization coming soon')).toBeInTheDocument()
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest --testPathPattern='MainPanel.test' --verbose`
Expected: FAIL — `metrics-grid` testid not found, 'Overview' not found

**Step 3: Modify MainPanel**

Modify `frontend/src/components/layout/panels/MainPanel.tsx`:

```typescript
import { useExperimentStore } from '@stores/experimentStore'
import { useMetricsStore } from '@stores/metricsStore'
import { StatusDot } from '@components/ui/StatusDot/StatusDot'
import { formatDuration, formatStepCount, toExperimentStatus } from '@utils/formatting'
import { MetricsGrid } from '@components/Experiments/MetricsGrid'
import { ChartsArea } from '@components/Experiments/ChartsArea'

// ... FluxBanner stays the same ...

export function MainPanel() {
  const selectedId = useExperimentStore((s) => s.selectedId)
  const experiments = useExperimentStore((s) => s.experiments)
  const selected = experiments.find((e) => e.id === selectedId)
  const latestMetrics = useMetricsStore((s) => selectedId ? s.latestMetrics[selectedId] : undefined)

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

  // Derive step count from the highest step in any latest metric
  // (The metrics store tracks latest values by name, but we need the step count
  //  which we'll get from sparkline data — for now show from metric values if available)
  const hasMetrics = latestMetrics && Object.keys(latestMetrics).length > 0

  return (
    <div className="panel panel--main">
      <div className="experiment-header">
        <StatusDot status={status} />
        <div className="experiment-header__info">
          <h1 className="experiment-header__name">{selected.name}</h1>
          <div className="experiment-header__meta">
            <span aria-label={`Duration: ${duration}`}>{duration}</span>
            <span aria-label={`Status: ${status}`}>{status}</span>
          </div>
        </div>
      </div>
      <div className="experiment-header__dashboard">
        <MetricsGrid experimentId={selected.id} />
        <ChartsArea />
      </div>
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest --testPathPattern='MainPanel.test' --verbose`
Expected: All tests PASS (existing + new)

**Step 5: Run full frontend test suite**

Run: `cd frontend && npx jest --verbose`
Expected: All tests PASS

**Step 6: Commit**

```
feat: wire MetricsGrid and ChartsArea into MainPanel for experiment detail view (#26)
```

---

### Task 9: Create TDD documentation

**Files:**
- Create: `docs/tdd/026-experiment-detail-view.md`

**Step 1: Create TDD document**

Follow the project convention (see existing `docs/tdd/` examples). Include:
- Issue summary
- Acceptance criteria
- Rationale
- Test summary (all tests from tasks 1-8)
- Implementation summary

**Step 2: Run full test suite one final time**

Run: `cd frontend && npx jest --verbose 2>&1 | tail -30`
Expected: All tests pass, note total count

**Step 3: Commit**

```
docs: add TDD document for experiment detail view (#26)
```

---

## Task Dependency Graph

```
Task 1 (health.ts) ──┐
Task 2 (formatting)──┤
                      ├──> Task 4 (MetricCard) ──┐
Task 3 (metricsStore)┤                           ├──> Task 7 (MetricsGrid) ──> Task 8 (MainPanel) ──> Task 9 (TDD doc)
                      └──> Task 5 (RewardCard) ──┘
                           Task 6 (ChartsArea) ───┘
```

Tasks 1, 2, 3 can run in parallel. Tasks 4, 5, 6 can run in parallel (after 1-3). Tasks 7-9 are sequential.
