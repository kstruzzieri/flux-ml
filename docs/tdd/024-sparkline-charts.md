# TDD: Issue #24 - Sparkline Charts

## Issue Summary
Add mini SVG sparkline charts to experiment cards showing loss and reward metric trends. Each card gets a dedicated sparkline row below the existing inline metrics display, with two side-by-side auto-scaled charts. Data is fetched via the existing `QueryMetrics` Wails binding, downsampled client-side using the LTTB algorithm to ~60 points, and rendered as pure SVG polylines with optional gradient fill. No backend changes required.

## Acceptance Criteria
- [x] `downsampleLTTB` utility correctly reduces time-series data preserving visual shape
- [x] `Sparkline` component renders SVG polyline from data points
- [x] Sparkline supports optional gradient fill via `showFill` prop
- [x] Single data point renders a dot, empty data renders nothing
- [x] `metricsStore` gains `sparklineData` state with `fetchSparklineData` and `fetchAllSparklineData`
- [x] Sparkline data updates reactively on `metrics:recorded` events (same debounce as latestMetrics)
- [x] ExperimentCard renders sparkline row when data is available
- [x] ExperimentCard hides sparkline row when no data exists
- [x] ExperimentList passes `sparklineDataMap` to cards
- [x] Loss uses `--color-chart-1` (cyan), reward uses `--color-chart-4` (green)
- [x] All existing tests continue to pass

## Rationale
1. **LTTB downsampling** — Industry standard algorithm (Grafana, TimescaleDB) for time-series visualization. Preserves peaks, valleys, and visual shape far better than nth-point sampling or averaging. Target of 60 points provides ~1.5px per point on a 90px chart.
2. **Pure SVG** — No chart library dependency. A polyline + optional gradient fill is all that's needed for a sparkline. Keeps the bundle lightweight and matches the project's minimalist approach.
3. **Reuse QueryMetrics** — The existing backend endpoint returns all metrics ordered by step ASC, which is exactly what sparklines need. Frontend downsampling avoids backend changes and handles the typical data volumes (< 10k steps) efficiently.
4. **Auto-scaling per chart** — Loss and reward have very different value ranges. Each sparkline auto-scales its Y-axis to `[min, max]` of its own data, making trends visible regardless of absolute values.
5. **Conditional rendering** — Sparkline row only appears when data exists. Cards for pending experiments or those without metrics stay compact.

## Failing Tests

### LTTB Downsample Utility (4 tests)

#### Test 1: returns original data when length is under target size
Data with fewer points than the target should pass through unchanged.
```typescript
it('returns original data when length is under target size', () => {
  const data = [
    { step: 1, value: 1.0 },
    { step: 2, value: 2.0 },
    { step: 3, value: 1.5 },
  ]
  const result = downsampleLTTB(data, 10)
  expect(result).toEqual(data)
})
```

#### Test 2: downsamples to target size preserving first and last points
LTTB always keeps the first and last data points, and the output length must match the target.
```typescript
it('downsamples to target size preserving first and last points', () => {
  const data = Array.from({ length: 100 }, (_, i) => ({
    step: i,
    value: Math.sin(i / 10),
  }))
  const result = downsampleLTTB(data, 20)
  expect(result).toHaveLength(20)
  expect(result[0]).toEqual(data[0])
  expect(result[result.length - 1]).toEqual(data[data.length - 1])
})
```

#### Test 3: preserves peaks and valleys
A known spike in the input must appear in the output — LTTB's key advantage over naive sampling.
```typescript
it('preserves peaks and valleys', () => {
  const data = Array.from({ length: 100 }, (_, i) => ({
    step: i,
    value: i === 50 ? 100.0 : 1.0,
  }))
  const result = downsampleLTTB(data, 20)
  const hasSpike = result.some((p) => p.value === 100.0)
  expect(hasSpike).toBe(true)
})
```

#### Test 4: handles edge cases
Empty arrays, single points, and two points should all return unchanged.
```typescript
it('handles edge cases: empty, single, two points', () => {
  expect(downsampleLTTB([], 10)).toEqual([])
  const single = [{ step: 1, value: 5.0 }]
  expect(downsampleLTTB(single, 10)).toEqual(single)
  const two = [{ step: 1, value: 1.0 }, { step: 2, value: 2.0 }]
  expect(downsampleLTTB(two, 10)).toEqual(two)
})
```

### Sparkline Component (5 tests)

#### Test 5: renders SVG polyline with correct number of points
The polyline's `points` attribute must contain all data points mapped to SVG coordinates.
```typescript
it('renders SVG polyline with correct points', () => {
  const data = [
    { step: 0, value: 1.0 },
    { step: 1, value: 2.0 },
    { step: 2, value: 1.5 },
  ]
  const { container } = render(<Sparkline data={data} color="#06b6d4" />)
  const polyline = container.querySelector('polyline')
  expect(polyline).toBeInTheDocument()
  const points = polyline!.getAttribute('points')!.split(' ')
  expect(points).toHaveLength(3)
})
```

#### Test 6: renders circle for single data point
A single point can't form a line — render a dot instead.
```typescript
it('renders circle for single data point', () => {
  const data = [{ step: 0, value: 5.0 }]
  const { container } = render(<Sparkline data={data} color="#06b6d4" />)
  expect(container.querySelector('circle')).toBeInTheDocument()
  expect(container.querySelector('polyline')).not.toBeInTheDocument()
})
```

#### Test 7: renders nothing when data is empty
No SVG element should be rendered for empty data.
```typescript
it('renders nothing when data is empty', () => {
  const { container } = render(<Sparkline data={[]} color="#06b6d4" />)
  expect(container.querySelector('svg')).not.toBeInTheDocument()
})
```

#### Test 8: renders gradient fill when showFill is true
The gradient definition and fill path should exist when `showFill` is enabled.
```typescript
it('renders gradient fill when showFill is true', () => {
  const data = [
    { step: 0, value: 1.0 },
    { step: 1, value: 2.0 },
    { step: 2, value: 1.5 },
  ]
  const { container } = render(<Sparkline data={data} color="#06b6d4" showFill={true} />)
  expect(container.querySelector('linearGradient')).toBeInTheDocument()
  const paths = container.querySelectorAll('path')
  expect(paths.length).toBeGreaterThanOrEqual(1)
})
```

#### Test 9: omits gradient fill when showFill is false
No gradient or fill path should render when `showFill` is disabled.
```typescript
it('omits gradient fill when showFill is false', () => {
  const data = [
    { step: 0, value: 1.0 },
    { step: 1, value: 2.0 },
    { step: 2, value: 1.5 },
  ]
  const { container } = render(<Sparkline data={data} color="#06b6d4" showFill={false} />)
  expect(container.querySelector('linearGradient')).not.toBeInTheDocument()
})
```

### metricsStore Sparkline State (3 tests)

#### Test 10: fetchSparklineData populates state for an experiment
The store must call QueryMetrics for loss and reward, transform results to Point arrays, and store keyed by experiment ID and metric name.
```typescript
it('fetchSparklineData populates state for an experiment', async () => {
  await RecordMetrics('exp-1', [
    new metrics.Metric({ experiment_id: 'exp-1', step: 1, name: 'loss', value: 2.5, timestamp: 1000 }),
    new metrics.Metric({ experiment_id: 'exp-1', step: 2, name: 'loss', value: 1.8, timestamp: 2000 }),
    new metrics.Metric({ experiment_id: 'exp-1', step: 3, name: 'loss', value: 0.9, timestamp: 3000 }),
    new metrics.Metric({ experiment_id: 'exp-1', step: 1, name: 'reward', value: 0.1, timestamp: 1000 }),
    new metrics.Metric({ experiment_id: 'exp-1', step: 2, name: 'reward', value: 0.5, timestamp: 2000 }),
  ])
  await act(async () => {
    await useMetricsStore.getState().fetchSparklineData('exp-1')
  })
  const sparkData = useMetricsStore.getState().sparklineData['exp-1']
  expect(sparkData).toBeDefined()
  expect(sparkData['loss']).toHaveLength(3)
  expect(sparkData['reward']).toHaveLength(2)
  expect(sparkData['loss'][0]).toEqual({ step: 1, value: 2.5 })
})
```

#### Test 11: returns empty object for experiment with no metrics
Experiments without metrics must have an empty object (not undefined) in state.
```typescript
it('returns empty object for experiment with no metrics', async () => {
  await act(async () => {
    await useMetricsStore.getState().fetchSparklineData('exp-no-data')
  })
  const sparkData = useMetricsStore.getState().sparklineData['exp-no-data']
  expect(sparkData).toEqual({})
})
```

#### Test 12: fetchAllSparklineData fetches for multiple experiments
Bulk fetch must populate sparkline state for all provided experiment IDs.
```typescript
it('fetchAllSparklineData fetches for multiple experiments', async () => {
  await RecordMetrics('exp-a', [
    new metrics.Metric({ experiment_id: 'exp-a', step: 1, name: 'loss', value: 1.0, timestamp: 1000 }),
  ])
  await RecordMetrics('exp-b', [
    new metrics.Metric({ experiment_id: 'exp-b', step: 1, name: 'loss', value: 2.0, timestamp: 1000 }),
  ])
  await act(async () => {
    await useMetricsStore.getState().fetchAllSparklineData(['exp-a', 'exp-b'])
  })
  expect(useMetricsStore.getState().sparklineData['exp-a']['loss']).toHaveLength(1)
  expect(useMetricsStore.getState().sparklineData['exp-b']['loss']).toHaveLength(1)
})
```

### ExperimentCard Sparkline Integration (3 tests)

#### Test 13: renders sparkline row when sparkline data is provided
When the card has sparkline data, two SVG sparklines must appear in a dedicated row.
```typescript
it('renders sparkline row when sparkline data provided', () => {
  const sparklineData = {
    loss: [{ step: 0, value: 2.0 }, { step: 1, value: 1.5 }, { step: 2, value: 1.0 }],
    reward: [{ step: 0, value: 0.1 }, { step: 1, value: 0.3 }, { step: 2, value: 0.5 }],
  }
  render(<ExperimentCard {...defaultProps} sparklineData={sparklineData} />)
  const sparklineRow = screen.getByTestId('sparkline-row')
  expect(sparklineRow).toBeInTheDocument()
  const svgs = sparklineRow.querySelectorAll('svg')
  expect(svgs).toHaveLength(2)
})
```

#### Test 14: does not render sparkline row when data is absent
Cards without sparkline data should not have the sparkline row at all.
```typescript
it('does not render sparkline row when data is absent', () => {
  render(<ExperimentCard {...defaultProps} />)
  expect(screen.queryByTestId('sparkline-row')).not.toBeInTheDocument()
})
```

#### Test 15: memo comparator detects sparkline data changes
The memo must re-render when sparkline data reference changes.
```typescript
it('memo comparator detects sparkline data changes', () => {
  const sparkData1 = {
    loss: [{ step: 0, value: 2.0 }],
  }
  const sparkData2 = {
    loss: [{ step: 0, value: 2.0 }, { step: 1, value: 1.0 }],
  }
  const { rerender } = render(
    <ExperimentCard {...defaultProps} sparklineData={sparkData1} />
  )
  expect(screen.getByTestId('sparkline-row').querySelectorAll('svg')).toHaveLength(1)
  rerender(<ExperimentCard {...defaultProps} sparklineData={sparkData2} />)
  // After rerender with new data, sparkline should have updated points
  const polyline = screen.getByTestId('sparkline-row').querySelector('polyline')
  const points = polyline!.getAttribute('points')!.split(' ')
  expect(points).toHaveLength(2)
})
```

### ExperimentList Sparkline Pass-through (1 test)

#### Test 16: passes sparkline data from sparklineDataMap prop to cards
ExperimentList must extract sparkline data from the map and pass to each card.
```typescript
it('passes sparkline data from sparklineDataMap prop to cards', () => {
  const experiments = [makeExperiment('exp-1', 'exp-alpha', 'running')]
  const sparklineDataMap: Record<string, Record<string, { step: number; value: number }[]>> = {
    'exp-1': {
      loss: [{ step: 0, value: 2.0 }, { step: 1, value: 1.0 }],
      reward: [{ step: 0, value: 0.1 }, { step: 1, value: 0.5 }],
    },
  }
  render(
    <ExperimentList
      experiments={experiments}
      selectedId={null}
      onSelect={jest.fn()}
      metricsMap={{}}
      sparklineDataMap={sparklineDataMap}
    />
  )
  expect(screen.getByTestId('sparkline-row')).toBeInTheDocument()
})
```

## Expected Output (Failing)
```
Frontend:
FAIL src/__tests__/utils/downsample.test.ts
  Cannot find module '@utils/downsample'

FAIL src/__tests__/components/Experiments/Sparkline.test.tsx
  Cannot find module '@components/Experiments/Sparkline'

FAIL src/__tests__/stores/metricsStore.test.ts
  useMetricsStore.getState().fetchSparklineData is not a function

FAIL src/__tests__/components/Experiments/ExperimentCard.test.tsx
  Unable to find element with data-testid: sparkline-row

FAIL src/__tests__/components/Experiments/ExperimentList.test.tsx
  Unable to find element with data-testid: sparkline-row
```

## Test Summary

### Passing Test Results
```
PASS src/__tests__/utils/downsample.test.ts (4 tests)
  downsampleLTTB
    ✓ returns original data when length is under target size
    ✓ downsamples to target size preserving first and last points
    ✓ preserves peaks and valleys
    ✓ handles edge cases: empty, single, two points

PASS src/__tests__/components/Experiments/Sparkline.test.tsx (5 tests)
  Sparkline
    ✓ renders SVG polyline with correct points
    ✓ renders circle for single data point
    ✓ renders nothing when data is empty
    ✓ renders gradient fill when showFill is true
    ✓ omits gradient fill when showFill is false

PASS src/__tests__/stores/metricsStore.test.ts (9 tests)
  useMetricsStore
    ✓ fetchLatestMetrics populates state for an experiment
    ✓ returns empty object for experiment with no metrics
    ✓ fetchAllLatestMetrics fetches for multiple experiments
    ✓ fetchSparklineData populates state for an experiment
    ✓ fetchSparklineData returns empty object for experiment with no metrics
    ✓ fetchAllSparklineData fetches for multiple experiments

PASS src/__tests__/components/Experiments/ExperimentCard.test.tsx (20 tests)
  ExperimentCard
    ✓ renders sparkline row when sparkline data provided
    ✓ does not render sparkline row when data is absent
    ✓ memo comparator detects sparkline data changes

PASS src/__tests__/components/Experiments/ExperimentList.test.tsx (7 tests)
  ExperimentList
    ✓ passes sparkline data from sparklineDataMap prop to cards

Test Suites: 17 passed, 17 total
Tests:       171 passed, 171 total
```

## Implementation Summary

### Files Created
- `frontend/src/utils/downsample.ts` — LTTB downsampling algorithm with `Point` type and `downsampleLTTB` function
- `frontend/src/components/Experiments/Sparkline.tsx` — Pure SVG sparkline component with polyline, gradient fill, and single-point dot
- `frontend/src/__tests__/utils/downsample.test.ts` — 4 tests for LTTB utility
- `frontend/src/__tests__/components/Experiments/Sparkline.test.tsx` — 5 tests for Sparkline component

### Files Modified
- `frontend/src/stores/metricsStore.ts` — Added `sparklineData` state, `fetchSparklineData`, `fetchAllSparklineData`, event-driven updates
- `frontend/src/components/Experiments/ExperimentCard.tsx` — Added `sparklineData` prop, sparkline row JSX, memo comparator update
- `frontend/src/components/Experiments/ExperimentCard.css` — Added `.exp-card__sparklines`, `.exp-card__sparkline`, `.exp-card__sparkline-label` styles
- `frontend/src/components/Experiments/ExperimentList.tsx` — Added `sparklineDataMap` prop, pass-through to ExperimentCard
- `frontend/src/components/Experiments/index.ts` — Added `Sparkline` barrel export
- `frontend/src/components/layout/panels/ExperimentsPanel.tsx` — Fetches sparkline data from store and passes to ExperimentList
- `frontend/src/__tests__/stores/metricsStore.test.ts` — Added 3 sparkline data tests
- `frontend/src/__tests__/components/Experiments/ExperimentCard.test.tsx` — Added 3 sparkline integration tests
- `frontend/src/__tests__/components/Experiments/ExperimentList.test.tsx` — Added 1 sparkline pass-through test

### Architecture
- **Data flow:** ExperimentsPanel → metricsStore.fetchAllSparklineData → QueryMetrics (loss + reward) → downsampleLTTB (60 pts) → sparklineData state → ExperimentList sparklineDataMap → ExperimentCard sparklineData → Sparkline SVG
- **Reactive updates:** `metrics:recorded` events trigger debounced re-fetch of both latestMetrics and sparklineData
- **Colors:** Loss uses `--color-chart-1` (cyan), reward uses `--color-chart-4` (green)
- **16 new tests** added across 5 test files, 171 total frontend tests passing
