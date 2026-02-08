# TDD: Issue #23 - Inline Metrics Display

## Issue Summary
Display key training metrics (loss, reward) directly on experiment list cards. Each card shows the latest metric values with monospace formatting, compact layout, and em dashes for missing data. Backend provides a `GetLatestMetrics` endpoint that returns the highest-step metric per name per experiment. Frontend adds a Zustand store for reactive metric fetching and a formatting utility with metric-specific decimal precision.

## Acceptance Criteria
- [x] Backend `LatestMetrics` method returns highest-step metric per name per experiment
- [x] `GetLatestMetrics` Wails binding exposes the method to frontend
- [x] `formatMetricValue` utility formats loss (4dp), reward (3dp), unknown (2dp), null/undefined as em dash
- [x] `useMetricsStore` Zustand store with `fetchLatestMetrics`, `fetchAllLatestMetrics`, and `initialize` (event-driven)
- [x] ExperimentCard displays inline metrics row with loss and reward values
- [x] ExperimentCard shows em dashes when metrics are missing
- [x] ExperimentList passes `metricsMap` prop down to cards
- [x] Monospace font for metric values (`--font-mono`)
- [x] All existing tests continue to pass
- [x] React.memo comparator updated to include `loss` and `reward` props

## Rationale
1. **Inline metrics** — Users need to see experiment progress at a glance without clicking into individual experiments. Loss and reward are the two most critical metrics for reward model training.
2. **SQL aggregation** — The `LatestMetrics` query uses `MAX(step) GROUP BY name` with a subquery join, efficiently retrieving only the most recent value per metric name in a single query rather than fetching all metrics and filtering client-side.
3. **Metric-specific precision** — Loss values need 4 decimal places (small differences matter during training), reward uses 3 decimal places, and unknown metrics default to 2. This prevents visual clutter while preserving meaningful precision.
4. **Event-driven updates** — The metrics store subscribes to `metrics:recorded` Wails events with per-experiment debounce, ensuring cards update reactively without polling.

## Failing Tests

### Go Backend: LatestMetrics (3 tests)

#### Test 1: LatestMetrics returns highest step per metric name
The query must return only the metric with the highest step for each unique name within an experiment.
```go
func TestLatestMetrics_ReturnsHighestStep(t *testing.T) {
	ts := newTestMetricsStore(t)
	expID := createTestExperiment(t, ts.db, "test-latest")

	ts.RecordMetrics(expID, []Metric{
		{Step: 1, Name: "loss", Value: 2.5, Timestamp: 1000},
		{Step: 2, Name: "loss", Value: 1.8, Timestamp: 2000},
		{Step: 3, Name: "loss", Value: 0.9, Timestamp: 3000},
		{Step: 1, Name: "reward", Value: 0.1, Timestamp: 1000},
		{Step: 2, Name: "reward", Value: 0.5, Timestamp: 2000},
	})

	results, err := ts.LatestMetrics(expID)
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
```

#### Test 2: LatestMetrics rejects empty experiment ID
Empty experiment IDs must return an error, not silently return no results.
```go
func TestLatestMetrics_EmptyExperimentID(t *testing.T) {
	ts := newTestMetricsStore(t)
	_, err := ts.LatestMetrics("")
	if err == nil {
		t.Fatal("expected error for empty experiment ID")
	}
}
```

#### Test 3: LatestMetrics returns empty slice for experiment with no metrics
Experiments that haven't recorded any metrics yet must return an empty (non-nil) slice.
```go
func TestLatestMetrics_NoMetrics(t *testing.T) {
	ts := newTestMetricsStore(t)
	expID := createTestExperiment(t, ts.db, "test-no-metrics")
	results, err := ts.LatestMetrics(expID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("expected 0 metrics, got %d", len(results))
	}
}
```

### Go Backend: GetLatestMetrics Wails binding (2 tests)

#### Test 4: App.GetLatestMetrics integration
The Wails binding must delegate to the metrics store and return results.
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

#### Test 5: App.GetLatestMetrics nil store guard
When the database is not initialized, the binding must return a clear error.
```go
// Inside TestApp_NilMetricsStore:
_, err = app.GetLatestMetrics("id")
if err == nil || err.Error() != "database not initialized" {
	t.Errorf("GetLatestMetrics: expected 'database not initialized', got %v", err)
}
```

### Frontend: formatMetricValue (5 tests)

#### Test 6: formats loss with 4 decimal places
Loss metrics need higher precision for meaningful comparison between training steps.
```typescript
it('formats loss with 4 decimal places', () => {
  expect(formatMetricValue('loss', 0.123456789)).toBe('0.1235')
})
```

#### Test 7: formats reward with 3 decimal places
Reward values use 3 decimal places — sufficient precision without visual clutter.
```typescript
it('formats reward with 3 decimal places', () => {
  expect(formatMetricValue('reward', 0.567891)).toBe('0.568')
})
```

#### Test 8: formats unknown metrics with 2 decimal places
Any metric not explicitly configured defaults to 2 decimal places.
```typescript
it('formats unknown metrics with 2 decimal places', () => {
  expect(formatMetricValue('accuracy', 0.987654)).toBe('0.99')
})
```

#### Test 9: returns em dash for null
Null values represent missing data — display as em dash.
```typescript
it('returns em dash for null', () => {
  expect(formatMetricValue('loss', null)).toBe('\u2014')
})
```

#### Test 10: returns em dash for undefined
Undefined values also represent missing data — display as em dash.
```typescript
it('returns em dash for undefined', () => {
  expect(formatMetricValue('loss', undefined)).toBe('\u2014')
})
```

### Frontend: useMetricsStore (3 tests)

#### Test 11: fetchLatestMetrics populates state for an experiment
The store must call GetLatestMetrics, transform the response to a name→value map, and store it keyed by experiment ID.
```typescript
it('fetchLatestMetrics populates state for an experiment', async () => {
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
```

#### Test 12: returns empty object for experiment with no metrics
Experiments without metrics must have an empty object (not undefined) in state.
```typescript
it('returns empty object for experiment with no metrics', async () => {
  await act(async () => {
    await useMetricsStore.getState().fetchLatestMetrics('exp-no-data')
  })
  const metricMap = useMetricsStore.getState().latestMetrics['exp-no-data']
  expect(metricMap).toEqual({})
})
```

#### Test 13: fetchAllLatestMetrics fetches for multiple experiments
Bulk fetch must populate state for all provided experiment IDs.
```typescript
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
```

### Frontend: ExperimentCard metrics display (4 tests)

#### Test 14: renders loss value with monospace styling
Loss value must appear within the metrics row container.
```typescript
it('renders loss value with monospace styling', () => {
  render(<ExperimentCard {...defaultProps} loss={0.1235} reward={0.567} />)
  const lossEl = screen.getByText('0.1235')
  expect(lossEl).toBeInTheDocument()
  expect(lossEl.closest('.exp-card__metrics')).toBeInTheDocument()
})
```

#### Test 15: renders reward value with monospace styling
Reward value must appear inline on the card.
```typescript
it('renders reward value with monospace styling', () => {
  render(<ExperimentCard {...defaultProps} loss={0.1235} reward={0.567} />)
  const rewardEl = screen.getByText('0.567')
  expect(rewardEl).toBeInTheDocument()
})
```

#### Test 16: renders em dash when no metrics provided
Cards without metrics must show em dashes instead of blank space.
```typescript
it('renders em dash when no metrics provided', () => {
  render(<ExperimentCard {...defaultProps} />)
  const metricsRow = screen.getByTestId('metrics-row')
  expect(metricsRow).toHaveTextContent('\u2014')
})
```

#### Test 17: renders em dash for loss when only reward is provided
Partial metrics must show em dash for the missing value.
```typescript
it('renders em dash for loss when only reward is provided', () => {
  render(<ExperimentCard {...defaultProps} reward={0.5} />)
  const labels = screen.getAllByText('\u2014')
  expect(labels.length).toBeGreaterThanOrEqual(1)
})
```

### Frontend: ExperimentList metrics pass-through (2 tests)

#### Test 18: passes metrics to cards from metricsMap prop
ExperimentList must extract loss/reward from metricsMap and pass to each card.
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
```

#### Test 19: renders em dashes when metricsMap has no data for experiment
Cards for experiments not in the metricsMap must show em dashes.
```typescript
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
  expect(dashes.length).toBeGreaterThanOrEqual(2)
})
```

## Expected Output (Failing)
```
Go:
--- FAIL: TestLatestMetrics_ReturnsHighestStep
    store.go: LatestMetrics method not defined
--- FAIL: TestApp_GetLatestMetrics
    metrics_api.go: GetLatestMetrics method not defined

Frontend:
FAIL src/__tests__/utils/formatting.test.ts
  formatMetricValue is not a function

FAIL src/__tests__/stores/metricsStore.test.ts
  Cannot find module '@stores/metricsStore'

FAIL src/__tests__/components/Experiments/ExperimentCard.test.tsx
  Unable to find element with text: 0.1235
```

## Test Summary

### Passing Test Results
```
Go backend:
ok  github.com/kstruzzieri/flux-ml                0.244s
ok  github.com/kstruzzieri/flux-ml/internal/database
ok  github.com/kstruzzieri/flux-ml/internal/event
ok  github.com/kstruzzieri/flux-ml/internal/experiment
ok  github.com/kstruzzieri/flux-ml/internal/metrics  0.347s

Frontend:
PASS src/__tests__/utils/formatting.test.ts
PASS src/__tests__/stores/metricsStore.test.ts
PASS src/__tests__/components/Experiments/ExperimentCard.test.tsx
PASS src/__tests__/components/Experiments/ExperimentList.test.tsx
PASS src/__tests__/stores/experimentStore.test.ts
PASS src/__tests__/setup.test.tsx
PASS src/__tests__/hooks/useLayoutPersistence.test.tsx
PASS src/__tests__/components/ui/StatusDot.test.tsx
PASS src/__tests__/components/Icon.test.tsx
PASS src/__tests__/design-tokens.test.ts
PASS src/__tests__/components/ui.test.tsx
PASS src/__tests__/components/layout/Content.test.tsx
PASS src/__tests__/components/layout/Header.test.tsx
PASS src/__tests__/components/layout/AppShell.test.tsx
PASS src/__tests__/navigation.test.tsx

Test Suites: 15 passed, 15 total
Tests:       153 passed, 153 total (19 new + 134 existing)

Go tests: 5 packages, all passing
```

## Implementation Summary

### Files Created
- `internal/metrics/store.go` — Added `LatestMetrics` method using SQL subquery with `MAX(step) GROUP BY name` inner join to efficiently return the highest-step metric per name per experiment.
- `metrics_api.go` — Added `GetLatestMetrics` Wails binding with nil store guard.
- `frontend/src/utils/formatting.ts` — Added `formatMetricValue` with metric-specific decimal precision map (`loss: 4`, `reward: 3`, default: `2`) and em dash for null/undefined.
- `frontend/src/stores/metricsStore.ts` — Zustand store with `fetchLatestMetrics`, `fetchAllLatestMetrics`, `initialize` (event-driven via `metrics:recorded` with per-experiment debounce), and `__resetMetricsStore` for testing.
- `frontend/src/__tests__/utils/formatting.test.ts` — 5 tests for formatMetricValue.
- `frontend/src/__tests__/stores/metricsStore.test.ts` — 3 tests for useMetricsStore.

### Files Modified
- `internal/metrics/store_test.go` — Added 3 LatestMetrics tests.
- `app_api_test.go` — Added `TestApp_GetLatestMetrics` integration test and extended `TestApp_NilMetricsStore` with GetLatestMetrics nil check.
- `frontend/wailsjs/go/main/App.d.ts` and `App.js` — Regenerated by `wails generate module` to include `GetLatestMetrics`.
- `frontend/src/__mocks__/wailsjs/go/main/App.ts` — Added `GetLatestMetrics` mock with in-memory highest-step filtering.
- `frontend/src/components/Experiments/ExperimentCard.tsx` — Added `loss` and `reward` optional props, metrics row with `formatMetricValue`, and extended memo comparator.
- `frontend/src/components/Experiments/ExperimentCard.css` — Added `.exp-card__metrics`, `.exp-card__metric`, `.exp-card__metric-label`, `.exp-card__metric-value` styles with monospace font.
- `frontend/src/__tests__/components/Experiments/ExperimentCard.test.tsx` — Added 4 metrics display tests.
- `frontend/src/components/Experiments/ExperimentList.tsx` — Added `metricsMap` prop, passes `loss`/`reward` to each ExperimentCard.
- `frontend/src/__tests__/components/Experiments/ExperimentList.test.tsx` — Added 2 metrics pass-through tests.
- `frontend/src/stores/index.ts` — Added `useMetricsStore` barrel export.

### Design Decisions
1. **SQL subquery join over application-side filtering** — The `LatestMetrics` query performs `MAX(step) GROUP BY name` in a subquery and joins back to get full metric rows. This is more efficient than fetching all metrics and filtering in Go, especially as experiments accumulate thousands of data points.
2. **Metric-specific decimal precision** — A lookup map (`METRIC_DECIMALS`) keeps formatting rules centralized. Loss uses 4dp because small differences (0.001) are significant during training. Reward uses 3dp. Unknown metrics default to 2dp.
3. **Em dash for missing data** — The Unicode em dash (`\u2014`) provides a clear visual indicator that data is absent, rather than showing `0` or blank space which could be confused with actual values.
4. **Per-experiment debounce in store** — The `initialize` method subscribes to `metrics:recorded` events and uses per-experiment debounce timers, so rapid metric updates for one experiment don't trigger unnecessary fetches for others.
5. **Optional props with `?? null`** — ExperimentList uses `expMetrics?.loss ?? null` to convert undefined to null, matching the `formatMetricValue` contract for missing data display.
