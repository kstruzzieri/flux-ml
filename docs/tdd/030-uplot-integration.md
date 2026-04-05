# TDD: Issue #30 - uPlot Integration

## Issue Summary
Integrate uPlot (29KB) for performant charting. Canvas-based, handles 100k+ points.

## Acceptance Criteria
- [x] uPlot dependency installed (`^1.6.32`)
- [x] TimeSeriesChart wrapper component manages uPlot lifecycle (create, update, destroy)
- [x] ResponsiveObserver resizes chart when container dimensions change
- [x] ChartsArea tabbed container renders chart in Overview tab
- [x] metricsStore provides `fetchChartData` for aligned loss/reward data
- [x] Live updates via `metrics:recorded` event with 200ms debounce
- [x] uPlot CSS imported and customized for dark theme (axes, grid, cursor, legend)
- [x] uPlot mocked in jsdom tests (no canvas required)

## Rationale
uPlot was chosen over alternatives (Chart.js, Recharts, Victory) for three reasons:
1. **Size** — 29KB vs 200KB+ for Chart.js. Aligns with Flux's lightweight binary target.
2. **Performance** — Canvas-based rendering handles 100k+ data points at 60fps. Critical for ML training runs that generate thousands of steps.
3. **Imperative API** — uPlot's imperative `setData()` avoids React re-render overhead for live streaming data. The wrapper pattern (useRef + useEffect) keeps React in control of lifecycle while uPlot handles rendering.

## Status: Already Delivered

This issue was fulfilled incrementally by prior work:

| Delivered in | What |
|---|---|
| #28 (Basic Chart) | uPlot dependency, TimeSeriesChart wrapper, ChartsArea with Overview tab, fetchChartData store method, live updates, 17 tests |
| #24 (Sparkline Charts) | LTTB downsampling utility, sparkline data fetching infrastructure |
| #26 (Experiment Detail) | MetricsGrid consuming sparkline data, health trend computation |

No additional code changes required. The uPlot integration is complete and production-ready for the Overview chart. Remaining chart features are tracked as separate Phase 3 issues:

- #31 Reusable chart components
- #32 Live data updates for charts
- #33 Chart annotations (events, checkpoints)
- #34 Chart zoom/pan controls
- #35 Reward components multi-line chart

## Test Summary

All uPlot-related tests pass as part of the existing suite:

| Suite | Tests |
|---|---|
| TimeSeriesChart | 6 |
| ChartsArea | 6 |
| metricsStore (chart data + live updates) | 5 |
| **Total** | **17** |

## Implementation Summary

### Key Files
- `frontend/src/components/Experiments/TimeSeriesChart.tsx` — uPlot wrapper with ResizeObserver
- `frontend/src/components/Experiments/ChartsArea.tsx` — Tabbed chart container
- `frontend/src/components/Experiments/ChartsArea.css` — Dark theme styling for uPlot (axes, grid, cursor, legend)
- `frontend/src/stores/metricsStore.ts` — `chartData` state + `fetchChartData` method
- `frontend/src/utils/downsample.ts` — LTTB algorithm for sparkline/chart data reduction
