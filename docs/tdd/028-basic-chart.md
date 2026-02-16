# TDD: Issue #28 - Basic Chart (Loss/Reward Over Time)

## Issue Summary
Add a uPlot-based line chart to the ChartsArea "Overview" tab showing loss and reward metrics plotted over training steps. The chart updates live as new metrics arrive via Wails events. This replaces the current placeholder content.

## Acceptance Criteria
- [x] uPlot dependency installed
- [x] TimeSeriesChart: reusable React wrapper around uPlot that manages lifecycle (create, update, destroy)
- [x] TimeSeriesChart renders a container div that uPlot mounts into
- [x] TimeSeriesChart creates uPlot instance with provided options and data
- [x] TimeSeriesChart destroys uPlot instance on unmount (no memory leaks)
- [x] TimeSeriesChart updates data when props change without recreating the instance
- [x] metricsStore: fetchChartData method fetches loss + reward and aligns on shared step axis
- [x] ChartsArea: accepts experimentId prop, renders chart in Overview tab
- [x] ChartsArea: shows empty state when no chart data available
- [x] Live updates: metrics:recorded event triggers chart data re-fetch

## Rationale
1. **uPlot over SVG** — uPlot is Canvas-based and handles 100k+ points at 60fps. The existing SVG sparklines work for 60-point thumbnails but won't scale for full chart views.
2. **Wrapper component** — Encapsulates uPlot lifecycle (imperative API) behind a declarative React interface. Creates instance on mount, calls setData on prop changes, destroys on unmount.
3. **Mock uPlot in tests** — jsdom has no canvas support. We mock uPlot's constructor and verify the component passes correct options/data and calls destroy on cleanup.
4. **AlignedData with null gaps** — uPlot expects parallel arrays aligned on a shared x-axis. When loss and reward have different step coverage, missing values are filled with null so both series render correctly.
5. **Loss + Reward first** — These are the two primary training signals. Additional series (KL, etc.) can be added to other tabs later.

## Increment 1: TimeSeriesChart Wrapper

### Failing Tests

#### TimeSeriesChart (6 tests)
```typescript
it('renders a container div with chart class', ...)
it('creates a uPlot instance on mount', ...)
it('passes options and data to uPlot constructor', ...)
it('calls uPlot.destroy on unmount', ...)
it('calls setData when data prop changes', ...)
it('does not render uPlot when data is empty', ...)
```

## Increment 2: fetchChartData in Metrics Store

### Failing Tests

#### chart data support (4 tests)
```typescript
it('fetchChartData populates aligned data for loss and reward', ...)
it('fetchChartData returns empty arrays when no data exists', ...)
it('fetchChartData handles missing reward data gracefully', ...)
it('fetchChartData aligns loss and reward on shared step axis', ...)
```

## Increment 3: Wire Chart into ChartsArea

### Failing Tests

#### ChartsArea (6 tests)
```typescript
it('renders three chart tabs', ...)
it('has Overview tab active by default', ...)
it('switches active tab on click', ...)
it('shows placeholder when no chart data exists', ...)
it('renders chart when chart data is available', ...)
it('shows placeholder on non-Overview tabs', ...)
```

## Increment 4: Live Updates

### Failing Tests

#### live updates (1 test)
```typescript
it('metrics:recorded event triggers chart data re-fetch', ...)
```

## Test Summary

| Suite | Tests |
|---|---|
| TimeSeriesChart | 6 |
| metricsStore (chart data) | 4 |
| metricsStore (live updates) | 1 |
| ChartsArea | 6 |
| **Total new tests** | **17** |

## Passing Test Results
```
Test Suites: 25 passed, 25 total
Tests:       277 passed, 277 total
Snapshots:   0 total
```

## Implementation Summary

### Files Created
- `frontend/src/components/Experiments/TimeSeriesChart.tsx` — React wrapper around uPlot with useRef for container + instance, useEffect for create/destroy lifecycle, separate useEffect for data updates via setData
- `frontend/src/__tests__/components/Experiments/TimeSeriesChart.test.tsx` — 6 tests mocking uPlot constructor to verify lifecycle management

### Files Modified
- `frontend/package.json` — added `uplot` dependency
- `frontend/src/stores/metricsStore.ts` — added `chartData` state, `fetchChartData` method (queries loss + reward, builds lookup maps, aligns on shared step axis with null gaps), added `fetchChartData` to `metrics:recorded` event listener
- `frontend/src/components/Experiments/ChartsArea.tsx` — accepts `experimentId` prop, reads chartData from store, renders TimeSeriesChart in Overview tab or empty-state placeholder
- `frontend/src/components/layout/panels/MainPanel.tsx` — passes `experimentId` to ChartsArea
- `frontend/src/setupTests.ts` — added `window.matchMedia` polyfill for uPlot in jsdom
- `frontend/src/__tests__/components/Experiments/ChartsArea.test.tsx` — updated to pass experimentId, added chart rendering and empty-state tests
- `frontend/src/__tests__/stores/metricsStore.test.ts` — added chart data and live update tests
- `frontend/src/__tests__/components/layout/panels/MainPanel.test.tsx` — updated placeholder text assertion
