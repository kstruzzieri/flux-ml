# TDD: Issue #32 - Live Data Updates for Charts

## Issue Summary
Complete the live data update pipeline for all chart types. The Overview chart already updates via `metrics:recorded` events. This issue adds reward component time-series data to the Reward Components tab via `rewards:recorded` events, rendered with the existing `MultiLineChart` component.

## Acceptance Criteria
- [x] `fetchRewardComponentChartData` method in metricsStore builds AlignedData for helpfulness/harmlessness/honesty
- [x] Reward component chart data uses union step axis with null-fill for missing values
- [x] `rewards:recorded` event triggers reward component chart data re-fetch (200ms debounce)
- [x] Reward Components tab renders MultiLineChart when data is available
- [x] Reward Components tab shows placeholder when no data exists
- [x] `__resetMetricsStore` clears reward component chart data

## Rationale
The reward components chart completes the live visualization pipeline. By reusing `MultiLineChart` and the existing event-driven architecture, we maintain consistency with the Overview chart pattern while adding no new component code.

Design decisions:
- **Hardcoded component names** (`helpfulness`, `harmlessness`, `honesty`) — matches the pattern in `fetchSparklineData` which hardcodes 6 metric names. Dynamic discovery would cause non-deterministic series ordering.
- **Diagnostics tab stays as placeholder** — out of scope for #32.

## Failing Tests

### metricsStore tests (4 new)

| Test | Description |
|------|-------------|
| `fetchRewardComponentChartData populates aligned data` | Seed 3 components at steps 10, 20, 30 → assert AlignedData shape `[steps, help, harm, honest]` |
| `fetchRewardComponentChartData null-fills missing steps` | Components at different steps → assert null where missing |
| `fetchRewardComponentChartData returns empty arrays when no data` | Assert `[[], [], [], []]` |
| `rewards:recorded triggers reward component chart data re-fetch` | Seed → initialize → emit event → advance timer → assert updated data |

### ChartsArea tests (2 new)

| Test | Description |
|------|-------------|
| `renders MultiLineChart in Reward Components tab when data available` | Seed reward signals, fetch, click tab → assert `data-testid="multiline-chart"` |
| `shows placeholder in Reward Components tab when no data` | No seed, click tab → assert placeholder text |

## Expected Output (Failing)

```
FAIL metricsStore.test.ts
  ✕ fetchRewardComponentChartData populates aligned data
  ✕ fetchRewardComponentChartData null-fills missing steps
  ✕ fetchRewardComponentChartData returns empty arrays when no data
  ✕ rewards:recorded triggers reward component chart data re-fetch

FAIL ChartsArea.test.tsx
  ✕ renders MultiLineChart in Reward Components tab when data available
  ✕ shows placeholder in Reward Components tab when no data
```

## Test Summary

| Suite | Existing | New | Total |
|-------|----------|-----|-------|
| metricsStore | 12 | 4 | 16 |
| ChartsArea | 6 | 2 | 8 |
| **Total** | **18** | **6** | **24** |

## Passing Test Results

```
PASS src/__tests__/stores/metricsStore.test.ts
PASS src/__tests__/components/Experiments/ChartsArea.test.tsx

Test Suites: 2 passed, 2 total
Tests:       25 passed, 25 total
```

Full suite: 31 suites, 319 tests, all passing.

## Implementation Summary

### metricsStore.ts
- Added `rewardComponentChartData: Record<string, AlignedData>` to state interface and initial state
- Added `fetchRewardComponentChartData(experimentId)` method that:
  - Calls `QueryRewardSignals(experimentId, '', 0, 0)` to get all signals
  - Groups results by component (`helpfulness`, `harmlessness`, `honesty`) into step→value Maps
  - Builds union step axis from all components
  - Null-fills missing values per component
  - Produces `AlignedData: [steps[], helpfulness[], harmlessness[], honesty[]]`
- Updated `rewards:recorded` event handler to call `fetchRewardComponentChartData` alongside `fetchLatestRewardSignals`
- Updated `__resetMetricsStore` to clear `rewardComponentChartData`

### ChartsArea.tsx
- Imported `MultiLineChart` from `@components/Charts`
- Defined static constants outside component: `REWARD_COMPONENT_LABELS` and `REWARD_COMPONENT_COLORS`
- Added store selectors for `rewardComponentChartData` and `fetchRewardComponentChartData`
- Extended `useEffect` to fetch reward component data on experiment change
- Expanded render logic: Overview → TimeSeriesChart, Reward Components → MultiLineChart, else → placeholder
