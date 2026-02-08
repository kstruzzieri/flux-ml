# Inline Metrics Display Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show key metrics (loss, reward) inline on experiment list cards with monospace formatting, compact layout, and reactive updates.

**Architecture:** Add a `GetLatestMetrics` backend method that returns the most recent metric per name per experiment (efficient single SQL query with `MAX(step)`). Create a `useMetricsStore` Zustand store on the frontend that manages per-experiment metrics and listens to `metrics:recorded` events for live updates. Extend `ExperimentCard` with a second row showing loss and reward values in monospace font. Props-only — the card stays pure, the store is consumed at the `ExperimentList` level.

**Tech Stack:** Go (SQLite), React, TypeScript, Zustand, Jest + Testing Library

---

## Task 1: Backend — `GetLatestMetrics` Go method + tests

Add a `LatestMetrics` method to `metrics.Store` that returns the most recent metric (highest step) per name for a given experiment. Then expose it through the Wails API as `GetLatestMetrics`.

**Files:**
- Modify: `internal/metrics/store.go` (add `LatestMetrics` method)
- Modify: `internal/metrics/store_test.go` (add tests)
- Modify: `metrics_api.go` (add `GetLatestMetrics` Wails binding)
- Modify: `app_api_test.go` (add integration test)

### Step 1: Write the failing tests for `LatestMetrics`

Add to the bottom of `internal/metrics/store_test.go`:

```go
func TestLatestMetrics_ReturnsHighestStep(t *testing.T) {
	ts := newTestMetricsStore(t)
	expID := ts.createExperiment("test-latest")

	ts.store.RecordMetrics(expID, []Metric{
		{Step: 1, Name: "loss", Value: 2.5, Timestamp: 1000},
		{Step: 2, Name: "loss", Value: 1.8, Timestamp: 2000},
		{Step: 3, Name: "loss", Value: 0.9, Timestamp: 3000},
		{Step: 1, Name: "reward", Value: 0.1, Timestamp: 1000},
		{Step: 2, Name: "reward", Value: 0.5, Timestamp: 2000},
	})

	results, err := ts.store.LatestMetrics(expID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 metrics, got %d", len(results))
	}

	byName := make(map[string]Metric)
	for _, m := range results {
		byName[m.Name] = m
	}
	if byName["loss"].Value != 0.9 {
		t.Errorf("expected loss=0.9, got %f", byName["loss"].Value)
	}
	if byName["loss"].Step != 3 {
		t.Errorf("expected loss step=3, got %d", byName["loss"].Step)
	}
	if byName["reward"].Value != 0.5 {
		t.Errorf("expected reward=0.5, got %f", byName["reward"].Value)
	}
	if byName["reward"].Step != 2 {
		t.Errorf("expected reward step=2, got %d", byName["reward"].Step)
	}
}

func TestLatestMetrics_EmptyExperimentID(t *testing.T) {
	ts := newTestMetricsStore(t)
	_, err := ts.store.LatestMetrics("")
	if err == nil {
		t.Fatal("expected error for empty experiment ID")
	}
}

func TestLatestMetrics_NoMetrics(t *testing.T) {
	ts := newTestMetricsStore(t)
	expID := ts.createExperiment("test-no-metrics")
	results, err := ts.store.LatestMetrics(expID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("expected 0 metrics, got %d", len(results))
	}
}
```

### Step 2: Run tests to verify they fail

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml && go test ./internal/metrics/ -run TestLatestMetrics -v`
Expected: FAIL — `ts.store.LatestMetrics undefined`

### Step 3: Implement `LatestMetrics` in `store.go`

Add to the bottom of `internal/metrics/store.go` (before the closing of the file):

```go
// LatestMetrics returns the most recent metric (highest step) per metric name
// for the given experiment. Returns an empty slice if no metrics exist.
func (s *Store) LatestMetrics(experimentID string) ([]Metric, error) {
	if experimentID == "" {
		return nil, fmt.Errorf("experiment ID cannot be empty")
	}

	query := `SELECT m.experiment_id, m.step, m.name, m.value, m.timestamp
		FROM metrics m
		INNER JOIN (
			SELECT name, MAX(step) AS max_step
			FROM metrics
			WHERE experiment_id = ?
			GROUP BY name
		) latest ON m.name = latest.name AND m.step = latest.max_step
		WHERE m.experiment_id = ?
		ORDER BY m.name ASC`

	rows, err := s.db.Query(query, experimentID, experimentID)
	if err != nil {
		return nil, fmt.Errorf("querying latest metrics: %w", err)
	}
	defer rows.Close()

	results := []Metric{}
	for rows.Next() {
		var m Metric
		if err := rows.Scan(&m.ExperimentID, &m.Step, &m.Name, &m.Value, &m.Timestamp); err != nil {
			return nil, fmt.Errorf("scanning latest metric: %w", err)
		}
		results = append(results, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating latest metrics: %w", err)
	}

	return results, nil
}
```

### Step 4: Run tests to verify they pass

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml && go test ./internal/metrics/ -run TestLatestMetrics -v`
Expected: PASS (3 tests)

### Step 5: Add Wails API binding

Add to the bottom of `metrics_api.go`:

```go
// GetLatestMetrics returns the most recent value per metric name for an experiment.
func (a *App) GetLatestMetrics(experimentID string) ([]metrics.Metric, error) {
	if a.metrics == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.metrics.LatestMetrics(experimentID)
}
```

### Step 6: Add integration test

Add to `app_api_test.go`:

```go
func TestApp_GetLatestMetrics(t *testing.T) {
	app := newTestApp(t)
	exp, _ := app.CreateExperiment("test-latest", "{}")

	app.RecordMetrics(exp.ID, []metrics.Metric{
		{Step: 1, Name: "loss", Value: 2.5, Timestamp: 1000},
		{Step: 5, Name: "loss", Value: 0.3, Timestamp: 5000},
		{Step: 3, Name: "reward", Value: 0.7, Timestamp: 3000},
	})

	results, err := app.GetLatestMetrics(exp.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 metrics, got %d", len(results))
	}
}
```

### Step 7: Run all Go tests

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml && go test ./... -count=1`
Expected: PASS (all packages)

### Step 8: Commit

```bash
git add internal/metrics/store.go internal/metrics/store_test.go metrics_api.go app_api_test.go
git commit -m "feat: add GetLatestMetrics backend method (#23)"
```

---

## Task 2: Regenerate Wails bindings + update frontend mocks

After adding `GetLatestMetrics` to the Go backend, regenerate the TypeScript bindings and update the mock.

**Files:**
- Regenerate: `frontend/wailsjs/go/main/App.js` and `App.d.ts`
- Regenerate: `frontend/wailsjs/go/models.ts`
- Modify: `frontend/src/__mocks__/wailsjs/go/main/App.ts` (add mock)

### Step 1: Regenerate Wails bindings

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml && wails generate module`

Verify `GetLatestMetrics` appears in `frontend/wailsjs/go/main/App.d.ts`.

### Step 2: Add mock for `GetLatestMetrics`

Add to `frontend/src/__mocks__/wailsjs/go/main/App.ts`, after the `QueryMetrics` function:

```typescript
export function GetLatestMetrics(
  experimentID: string,
): Promise<metrics.Metric[]> {
  const expMetrics = mockMetrics.filter((m) => m.experiment_id === experimentID)
  const latestByName = new Map<string, metrics.Metric>()
  for (const m of expMetrics) {
    const existing = latestByName.get(m.name)
    if (!existing || m.step > existing.step) {
      latestByName.set(m.name, m)
    }
  }
  return Promise.resolve([...latestByName.values()])
}
```

### Step 3: Commit

```bash
git add frontend/wailsjs/ frontend/src/__mocks__/
git commit -m "chore: regenerate Wails bindings and add GetLatestMetrics mock (#23)"
```

---

## Task 3: `formatMetricValue` utility + tests

Add a formatting utility for metric values: loss uses 4 decimal places, reward uses 3, general uses 2.

**Files:**
- Modify: `frontend/src/utils/formatting.ts` (add `formatMetricValue`)
- Modify: `frontend/src/__tests__/utils/formatting.test.ts` (add tests)

### Step 1: Write the failing tests

Check if `frontend/src/__tests__/utils/formatting.test.ts` exists. If not, create it. Add:

```typescript
import { formatMetricValue } from '@utils/formatting'

describe('formatMetricValue', () => {
  it('formats loss with 4 decimal places', () => {
    expect(formatMetricValue('loss', 0.123456789)).toBe('0.1235')
  })

  it('formats reward with 3 decimal places', () => {
    expect(formatMetricValue('reward', 0.567891)).toBe('0.568')
  })

  it('formats unknown metrics with 2 decimal places', () => {
    expect(formatMetricValue('accuracy', 0.987654)).toBe('0.99')
  })

  it('returns em dash for null', () => {
    expect(formatMetricValue('loss', null)).toBe('\u2014')
  })

  it('returns em dash for undefined', () => {
    expect(formatMetricValue('loss', undefined)).toBe('\u2014')
  })
})
```

### Step 2: Run tests to verify they fail

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml/frontend && npx jest --testPathPattern="formatting" --verbose`
Expected: FAIL — `formatMetricValue is not a function` or `not exported`

### Step 3: Implement `formatMetricValue`

Add to `frontend/src/utils/formatting.ts`:

```typescript
const METRIC_DECIMALS: Record<string, number> = {
  loss: 4,
  reward: 3,
}

/**
 * Formats a metric value for inline display.
 * Returns em dash for null/undefined values.
 */
export function formatMetricValue(
  name: string,
  value: number | null | undefined,
): string {
  if (value == null) {
    return '\u2014'
  }
  const decimals = METRIC_DECIMALS[name] ?? 2
  return value.toFixed(decimals)
}
```

### Step 4: Run tests to verify they pass

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml/frontend && npx jest --testPathPattern="formatting" --verbose`
Expected: PASS (5 tests)

### Step 5: Commit

```bash
git add frontend/src/utils/formatting.ts frontend/src/__tests__/utils/formatting.test.ts
git commit -m "feat: add formatMetricValue utility (#23)"
```

---

## Task 4: `useMetricsStore` Zustand store + tests

Create a Zustand store that manages per-experiment latest metrics and listens to `metrics:recorded` events.

**Files:**
- Create: `frontend/src/stores/metricsStore.ts`
- Create: `frontend/src/__tests__/stores/metricsStore.test.ts`

### Step 1: Write the failing tests

Create `frontend/src/__tests__/stores/metricsStore.test.ts`:

```typescript
import { act } from '@testing-library/react'
import { useMetricsStore, __resetMetricsStore } from '@stores/metricsStore'
import { __resetMockState } from '../../../__mocks__/wailsjs/go/main/App'
import { metrics } from '../../../__mocks__/wailsjs/go/models'
import { RecordMetrics } from '../../../__mocks__/wailsjs/go/main/App'

beforeEach(() => {
  __resetMockState()
  __resetMetricsStore()
})

describe('useMetricsStore', () => {
  it('fetchLatestMetrics populates state for an experiment', async () => {
    // Seed some metrics
    await RecordMetrics('exp-1', [
      new metrics.Metric({ experiment_id: 'exp-1', step: 1, name: 'loss', value: 2.5, timestamp: 1000 }),
      new metrics.Metric({ experiment_id: 'exp-1', step: 5, name: 'loss', value: 0.3, timestamp: 5000 }),
      new metrics.Metric({ experiment_id: 'exp-1', step: 3, name: 'reward', value: 0.7, timestamp: 3000 }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchLatestMetrics('exp-1')
    })

    const metricMap = useMetricsStore.getState().latestMetrics['exp-1']
    expect(metricMap).toBeDefined()
    expect(metricMap['loss']).toBe(0.3)
    expect(metricMap['reward']).toBe(0.7)
  })

  it('returns empty object for experiment with no metrics', async () => {
    await act(async () => {
      await useMetricsStore.getState().fetchLatestMetrics('exp-no-data')
    })

    const metricMap = useMetricsStore.getState().latestMetrics['exp-no-data']
    expect(metricMap).toEqual({})
  })

  it('fetchAllLatestMetrics fetches for multiple experiments', async () => {
    await RecordMetrics('exp-a', [
      new metrics.Metric({ experiment_id: 'exp-a', step: 1, name: 'loss', value: 1.0, timestamp: 1000 }),
    ])
    await RecordMetrics('exp-b', [
      new metrics.Metric({ experiment_id: 'exp-b', step: 1, name: 'loss', value: 2.0, timestamp: 1000 }),
    ])

    await act(async () => {
      await useMetricsStore.getState().fetchAllLatestMetrics(['exp-a', 'exp-b'])
    })

    expect(useMetricsStore.getState().latestMetrics['exp-a']['loss']).toBe(1.0)
    expect(useMetricsStore.getState().latestMetrics['exp-b']['loss']).toBe(2.0)
  })
})
```

### Step 2: Run tests to verify they fail

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml/frontend && npx jest --testPathPattern="metricsStore" --verbose`
Expected: FAIL — cannot find module `@stores/metricsStore`

### Step 3: Implement `useMetricsStore`

Create `frontend/src/stores/metricsStore.ts`:

```typescript
import { create } from 'zustand'
import { GetLatestMetrics } from '../../wailsjs/go/main/App'
import { EventsOn } from '../../wailsjs/runtime/runtime'

/** Map of metric name to its latest value */
type MetricMap = Record<string, number>

interface MetricsState {
  /** experimentId -> { metricName -> value } */
  latestMetrics: Record<string, MetricMap>

  fetchLatestMetrics: (experimentId: string) => Promise<void>
  fetchAllLatestMetrics: (experimentIds: string[]) => Promise<void>
  initialize: () => void
}

let _initialized = false
let _debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {}

export function __resetMetricsStore(): void {
  _initialized = false
  Object.values(_debounceTimers).forEach(clearTimeout)
  _debounceTimers = {}
  useMetricsStore.setState({ latestMetrics: {} })
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  latestMetrics: {},

  fetchLatestMetrics: async (experimentId: string) => {
    try {
      const results = await GetLatestMetrics(experimentId)
      const metricMap: MetricMap = {}
      for (const m of results) {
        metricMap[m.name] = m.value
      }
      set((state) => ({
        latestMetrics: {
          ...state.latestMetrics,
          [experimentId]: metricMap,
        },
      }))
    } catch {
      // Silently ignore — metrics are supplementary
    }
  },

  fetchAllLatestMetrics: async (experimentIds: string[]) => {
    await Promise.all(
      experimentIds.map((id) => get().fetchLatestMetrics(id))
    )
  },

  initialize: () => {
    if (_initialized) return
    _initialized = true

    EventsOn('metrics:recorded', (data: { experimentId?: string }) => {
      if (!data?.experimentId) return
      const expId = data.experimentId

      if (_debounceTimers[expId]) clearTimeout(_debounceTimers[expId])
      _debounceTimers[expId] = setTimeout(() => {
        delete _debounceTimers[expId]
        get().fetchLatestMetrics(expId)
      }, 200)
    })
  },
}))
```

### Step 4: Run tests to verify they pass

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml/frontend && npx jest --testPathPattern="metricsStore" --verbose`
Expected: PASS (3 tests)

### Step 5: Commit

```bash
git add frontend/src/stores/metricsStore.ts frontend/src/__tests__/stores/metricsStore.test.ts
git commit -m "feat: add useMetricsStore with per-experiment latest metrics (#23)"
```

---

## Task 5: Update `ExperimentCard` — add metrics row + tests

Extend the card to accept optional `loss` and `reward` props and render them in a second row with monospace font.

**Files:**
- Modify: `frontend/src/components/Experiments/ExperimentCard.tsx`
- Modify: `frontend/src/components/Experiments/ExperimentCard.css`
- Modify: `frontend/src/__tests__/components/Experiments/ExperimentCard.test.tsx`

### Step 1: Write the failing tests

Add to the end of the `describe('ExperimentCard', ...)` block in `ExperimentCard.test.tsx`:

```typescript
  // Inline metrics display — loss and reward values shown on card.
  it('renders loss value with monospace styling', () => {
    render(<ExperimentCard {...defaultProps} loss={0.1235} reward={0.567} />)
    const lossEl = screen.getByText('0.1235')
    expect(lossEl).toBeInTheDocument()
    expect(lossEl.closest('.exp-card__metrics')).toBeInTheDocument()
  })

  it('renders reward value with monospace styling', () => {
    render(<ExperimentCard {...defaultProps} loss={0.1235} reward={0.567} />)
    const rewardEl = screen.getByText('0.567')
    expect(rewardEl).toBeInTheDocument()
  })

  it('renders em dash when no metrics provided', () => {
    render(<ExperimentCard {...defaultProps} />)
    const metricsRow = screen.getByTestId('metrics-row')
    expect(metricsRow).toHaveTextContent('\u2014')
  })

  it('renders em dash for loss when only reward is provided', () => {
    render(<ExperimentCard {...defaultProps} reward={0.5} />)
    const labels = screen.getAllByText('\u2014')
    expect(labels.length).toBeGreaterThanOrEqual(1)
  })
```

### Step 2: Run tests to verify they fail

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml/frontend && npx jest --testPathPattern="ExperimentCard" --verbose`
Expected: FAIL — props `loss`/`reward` don't exist, no `metrics-row` test ID

### Step 3: Update ExperimentCard component

Update `frontend/src/components/Experiments/ExperimentCard.tsx`:

```typescript
import { memo } from 'react'
import { formatDuration, formatMetricValue, type ExperimentStatus } from '@utils/formatting'
import { StatusDot } from '../ui/StatusDot/StatusDot'
import type { experiment } from '../../../wailsjs/go/models'
import './ExperimentCard.css'

interface ExperimentCardProps {
  experiment: experiment.Experiment
  isActive: boolean
  onSelect: (id: string) => void
  loss?: number | null
  reward?: number | null
}

const STATUS_LABELS: Record<ExperimentStatus, string> = {
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  pending: 'Pending',
}

const VALID_STATUSES = new Set<string>(Object.keys(STATUS_LABELS))

function ExperimentCardInner({ experiment: exp, isActive, onSelect, loss, reward }: ExperimentCardProps) {
  const status = VALID_STATUSES.has(exp.status) ? (exp.status as ExperimentStatus) : 'pending'
  const statusLabel = STATUS_LABELS[status]
  const duration = formatDuration(exp.createdAt, exp.updatedAt, status)

  const className = ['exp-card', isActive && 'exp-card--active'].filter(Boolean).join(' ')

  return (
    <button
      className={className}
      onClick={() => onSelect(exp.id)}
      aria-label={`${exp.name}, ${statusLabel}`}
    >
      <div className="exp-card__row">
        <StatusDot status={status} />
        <span className="exp-card__name">{exp.name}</span>
        <span className="exp-card__duration">{duration}</span>
      </div>
      <div className="exp-card__metrics" data-testid="metrics-row">
        <span className="exp-card__metric">
          <span className="exp-card__metric-label">loss</span>
          <span className="exp-card__metric-value">{formatMetricValue('loss', loss)}</span>
        </span>
        <span className="exp-card__metric">
          <span className="exp-card__metric-label">reward</span>
          <span className="exp-card__metric-value">{formatMetricValue('reward', reward)}</span>
        </span>
      </div>
    </button>
  )
}

export const ExperimentCard = memo(ExperimentCardInner, (prev, next) => {
  return (
    prev.experiment.id === next.experiment.id &&
    prev.experiment.name === next.experiment.name &&
    prev.experiment.status === next.experiment.status &&
    prev.experiment.updatedAt === next.experiment.updatedAt &&
    prev.isActive === next.isActive &&
    prev.loss === next.loss &&
    prev.reward === next.reward
  )
})
ExperimentCard.displayName = 'ExperimentCard'
```

### Step 4: Add CSS for metrics row

Add to the bottom of `frontend/src/components/Experiments/ExperimentCard.css`:

```css
.exp-card__metrics {
  display: flex;
  gap: 16px;
  padding-left: 16px;
}

.exp-card__metric {
  display: flex;
  align-items: center;
  gap: 6px;
}

.exp-card__metric-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.exp-card__metric-value {
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}
```

### Step 5: Run tests to verify they pass

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml/frontend && npx jest --testPathPattern="ExperimentCard" --verbose`
Expected: PASS (all existing + 4 new tests)

### Step 6: Commit

```bash
git add frontend/src/components/Experiments/ExperimentCard.tsx frontend/src/components/Experiments/ExperimentCard.css frontend/src/__tests__/components/Experiments/ExperimentCard.test.tsx
git commit -m "feat: add inline metrics display to ExperimentCard (#23)"
```

---

## Task 6: Wire metrics into `ExperimentList` + integration tests

Update `ExperimentList` to consume `useMetricsStore` and pass loss/reward to each card. Update `ExperimentList` tests.

**Files:**
- Modify: `frontend/src/components/Experiments/ExperimentList.tsx`
- Modify: `frontend/src/__tests__/components/Experiments/ExperimentList.test.tsx`

### Step 1: Write the failing tests

Add to the `describe('ExperimentList', ...)` block in `ExperimentList.test.tsx`:

```typescript
  it('passes metrics to cards from metricsMap prop', () => {
    const experiments = [makeExperiment('exp-1', 'exp-alpha', 'running')]
    const metricsMap: Record<string, Record<string, number>> = {
      'exp-1': { loss: 0.1234, reward: 0.567 },
    }
    render(
      <ExperimentList
        experiments={experiments}
        selectedId={null}
        onSelect={jest.fn()}
        metricsMap={metricsMap}
      />
    )
    expect(screen.getByText('0.1234')).toBeInTheDocument()
    expect(screen.getByText('0.567')).toBeInTheDocument()
  })

  it('renders em dashes when metricsMap has no data for experiment', () => {
    const experiments = [makeExperiment('exp-1', 'exp-alpha')]
    render(
      <ExperimentList
        experiments={experiments}
        selectedId={null}
        onSelect={jest.fn()}
        metricsMap={{}}
      />
    )
    const dashes = screen.getAllByText('\u2014')
    expect(dashes.length).toBeGreaterThanOrEqual(2) // loss + reward
  })
```

### Step 2: Run tests to verify they fail

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml/frontend && npx jest --testPathPattern="ExperimentList" --verbose`
Expected: FAIL — `metricsMap` prop doesn't exist

### Step 3: Update ExperimentList component

Update `frontend/src/components/Experiments/ExperimentList.tsx`:

```typescript
import { ExperimentCard } from './ExperimentCard'
import type { experiment } from '../../../wailsjs/go/models'
import './ExperimentList.css'

interface ExperimentListProps {
  experiments: experiment.Experiment[]
  selectedId: string | null
  onSelect: (id: string) => void
  metricsMap?: Record<string, Record<string, number>>
}

export function ExperimentList({ experiments, selectedId, onSelect, metricsMap = {} }: ExperimentListProps) {
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
          />
        )
      })}
    </div>
  )
}
```

### Step 4: Run tests to verify they pass

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml/frontend && npx jest --testPathPattern="ExperimentList" --verbose`
Expected: PASS (all existing + 2 new tests)

### Step 5: Commit

```bash
git add frontend/src/components/Experiments/ExperimentList.tsx frontend/src/__tests__/components/Experiments/ExperimentList.test.tsx
git commit -m "feat: wire metricsMap into ExperimentList (#23)"
```

---

## Task 7: Wire store into `ExperimentsPanel` + seed demo metrics

Connect the `useMetricsStore` at the panel level so it fetches metrics for all visible experiments and passes them through. Also seed demo metrics in the backend so the UI has data.

**Files:**
- Modify: `frontend/src/components/layout/panels/ExperimentsPanel.tsx`
- Modify: `internal/experiment/seed.go` (add demo metrics seeding)

### Step 1: Read current ExperimentsPanel

Read `frontend/src/components/layout/panels/ExperimentsPanel.tsx` to understand its current structure before modifying.

### Step 2: Update ExperimentsPanel to consume metricsStore

The panel already calls `useExperimentStore`. Add `useMetricsStore` consumption:

```typescript
// Add imports
import { useMetricsStore } from '@stores/metricsStore'

// Inside the component, add:
const { latestMetrics, fetchAllLatestMetrics, initialize: initMetrics } = useMetricsStore()

// In useEffect (after experiment store init):
useEffect(() => {
  initMetrics()
}, [initMetrics])

// When experiments change, fetch metrics for all:
useEffect(() => {
  if (experiments.length > 0) {
    fetchAllLatestMetrics(experiments.map((e) => e.id))
  }
}, [experiments, fetchAllLatestMetrics])

// Pass to ExperimentList:
<ExperimentList
  experiments={experiments}
  selectedId={selectedId}
  onSelect={selectExperiment}
  metricsMap={latestMetrics}
/>
```

### Step 3: Add demo metrics seeding to seed.go

Modify `internal/experiment/seed.go` to also seed sample metrics after creating experiments. Add a `SeedDemoMetrics` method that takes a `*metrics.Store` or do it inline after the experiment creation:

After the experiment creation loop in `SeedDemoExperiments`, this is complex enough to warrant a separate approach. Instead, add a separate function in `app.go` that seeds metrics for existing demo experiments after both stores are initialized.

Alternative: Add metric seeding directly in `app.go` `startup()` after `SeedDemoExperiments`:

```go
// In startup(), after SeedDemoExperiments:
a.seedDemoMetrics()
```

Add a new method on App:

```go
func (a *App) seedDemoMetrics() {
	if a.metrics == nil || a.experiments == nil {
		return
	}
	exps, err := a.experiments.List()
	if err != nil || len(exps) == 0 {
		return
	}

	// Check if metrics already seeded (check first experiment)
	existing, _ := a.metrics.LatestMetrics(exps[0].ID)
	if len(existing) > 0 {
		return
	}

	for _, exp := range exps {
		if exp.Status == "pending" {
			continue
		}
		var steps int64 = 50
		if exp.Status == "failed" {
			steps = 10
		}
		ms := make([]metrics.Metric, 0, steps*2)
		now := time.Now().Unix()
		for s := int64(1); s <= steps; s++ {
			lossVal := 2.5 - (2.0 * float64(s) / float64(steps)) + (rand.Float64() * 0.1)
			rewardVal := 0.1 + (0.8 * float64(s) / float64(steps)) + (rand.Float64() * 0.05)
			ms = append(ms,
				metrics.Metric{Step: s, Name: "loss", Value: lossVal, Timestamp: now - (steps-s)*60},
				metrics.Metric{Step: s, Name: "reward", Value: rewardVal, Timestamp: now - (steps-s)*60},
			)
		}
		a.metrics.RecordMetrics(exp.ID, ms)
	}
}
```

Add imports: `"math/rand"` and `"time"` to `app.go`.

### Step 4: Run all tests

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml && go test ./... -count=1`
Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml/frontend && npx jest --verbose`
Expected: All PASS

### Step 5: Commit

```bash
git add frontend/src/components/layout/panels/ExperimentsPanel.tsx app.go
git commit -m "feat: wire metricsStore into ExperimentsPanel and seed demo metrics (#23)"
```

---

## Task 8: TDD document + final verification

Create the TDD document and run all tests to confirm everything passes.

**Files:**
- Create: `docs/tdd/023-inline-metrics-display.md`

### Step 1: Run all tests (Go + frontend)

Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml && go test ./... -count=1`
Run: `cd /Users/keithstruzzieri/projects/portfolio/flux-ml/frontend && npx jest --verbose`
Capture output for TDD doc.

### Step 2: Write TDD document

Create `docs/tdd/023-inline-metrics-display.md` following the format of `docs/tdd/022-status-indicators.md`:

- Issue Summary
- Acceptance Criteria (checked)
- Rationale
- Failing Tests (numbered, with code blocks)
- Expected Output (Failing)
- Test Summary (Passing)
- Implementation Summary

### Step 3: Final commit

```bash
git add docs/tdd/023-inline-metrics-display.md
git commit -m "docs: add TDD document for inline metrics display (#23)"
```

---

## Summary

| Task | Description | Tests Added |
|------|-------------|-------------|
| 1 | Backend `GetLatestMetrics` + Go tests | 3 Go unit + 1 integration |
| 2 | Regenerate Wails bindings + mock | 0 (infra) |
| 3 | `formatMetricValue` utility | 5 |
| 4 | `useMetricsStore` Zustand store | 3 |
| 5 | `ExperimentCard` metrics row | 4 |
| 6 | `ExperimentList` metrics wiring | 2 |
| 7 | `ExperimentsPanel` integration + demo seed | 0 (integration) |
| 8 | TDD doc + final verification | 0 (docs) |

**Total new tests:** ~18 (4 Go + 14 frontend)
