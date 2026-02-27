# TDD 031 — Reusable Chart Components

## Issue Summary

**Issue:** #31 — Create wrapper components for common chart types (line, multi-line, histogram)

The current `TimeSeriesChart` is a one-off uPlot wrapper with hard-coded axes/cursor config. Downstream issues (#34 zoom/pan, #35 reward multi-line, #39 histogram) need a shared foundation so each chart type doesn't duplicate boilerplate.

## Acceptance Criteria

1. Shared `useUPlot` hook encapsulates the dual-useEffect lifecycle (create/destroy + data updates), ResizeObserver, and container ref management
2. `chartTheme.ts` provides `buildAxes()`, `buildCursor()`, `buildScales()`, and `CHART_COLORS` — single source of truth for dark-theme chart styling
3. `TimeSeriesChart` migrated to `components/Charts/`, uses hook + theme, existing behavior preserved
4. `MultiLineChart` renders N-series line charts with auto palette color assignment
5. `HistogramChart` renders bar charts using uPlot's bars plugin
6. CSS tokens added for chart axis/grid/tick colors
7. `ChartsArea` imports from new `@components/Charts` path
8. All existing tests pass; new tests cover theme, hook, and new components

## Rationale

A shared hook (not base component) gives each chart type full control over its uPlot Options while sharing the lifecycle boilerplate. A base component would be too rigid or require so many props it becomes a config object anyway.

## Test Summary

| Suite | Tests |
|---|---|
| chartTheme | 4 |
| useUPlot | 5 |
| TimeSeriesChart (migrated) | 6 |
| MultiLineChart | 4 |
| HistogramChart | 4 |
| ChartsArea (existing, updated imports) | 6 |
| **Total new/modified** | **29** |

## Failing Tests

Tests written first targeting the new `components/Charts/` modules. All initially fail since the implementation files don't exist yet.

## Implementation Summary

### New Files
- `frontend/src/components/Charts/chartTheme.ts` — Theme config builder
- `frontend/src/components/Charts/useUPlot.ts` — Shared lifecycle hook
- `frontend/src/components/Charts/TimeSeriesChart.tsx` — Migrated line chart
- `frontend/src/components/Charts/MultiLineChart.tsx` — N-series line chart
- `frontend/src/components/Charts/HistogramChart.tsx` — Bar/histogram chart
- `frontend/src/components/Charts/Charts.css` — Shared chart styles
- `frontend/src/components/Charts/index.ts` — Barrel exports

### Modified Files
- `frontend/src/styles/tokens.css` — Added chart axis/grid/tick tokens
- `frontend/src/components/Experiments/ChartsArea.tsx` — Updated imports
- `frontend/src/components/Experiments/ChartsArea.css` — Removed migrated chart styles

### Deleted Files
- `frontend/src/components/Experiments/TimeSeriesChart.tsx` — Moved to Charts/

## Passing Test Results

_To be filled after implementation._
