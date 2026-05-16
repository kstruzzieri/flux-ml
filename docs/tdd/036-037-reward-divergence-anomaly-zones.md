# TDD: Issues #36-#37 - Reward Divergence and Anomaly Zones

## Issue Summary

Phase 3B adds reward component divergence visualization to the existing Reward Components chart. The chart now highlights spans where component values diverge unexpectedly and surfaces a compact summary for inspection.

## Acceptance Criteria

- [x] Reward component chart derives divergence zones from aligned component data
- [x] Divergence rule matches existing health/alert thresholds: ratio > 2.0 and absolute spread >= 0.1
- [x] Contiguous divergent samples are grouped into one anomaly zone
- [x] uPlot plugin shades anomaly zones on the chart and marks selected zones
- [x] Reward Components tab displays a concise divergence summary below the chart
- [x] Zone clicks from the chart or summary select the inspected zone
- [x] Balanced data shows a non-alarming state

## Design Notes

- The derivation lives in `frontend/src/utils/rewardDivergence.ts` so chart rendering and UI summaries share the same logic.
- The uPlot plugin draws low-opacity warning spans behind the line series, with a small top marker and outline for scannability.
- The summary intentionally stays compact: zone count, peak ratio/step, high/low components, and spread.
- Full cross-chart click-to-inspect remains tracked by Phase 3B issue #38.

## Test Summary

| Suite | Coverage |
|---|---|
| `rewardDivergence.test.ts` | zone derivation, thresholds, grouping, missing values, negative values |
| `rewardDivergencePlugin.test.ts` | shaded zones, selected marker, hover cursor, click selection cleanup |
| `MultiLineChart.test.tsx` | anomaly plugin wiring |
| `ChartsArea.test.tsx` | reward tab summary states |

## Implementation Summary

### New Files

- `frontend/src/utils/rewardDivergence.ts`
- `frontend/src/components/Charts/rewardDivergencePlugin.ts`
- `frontend/src/__tests__/utils/rewardDivergence.test.ts`
- `frontend/src/__tests__/components/Charts/rewardDivergencePlugin.test.ts`

### Modified Files

- `frontend/src/components/Charts/MultiLineChart.tsx`
- `frontend/src/components/Charts/index.ts`
- `frontend/src/components/Experiments/ChartsArea.tsx`
- `frontend/src/components/Experiments/ChartsArea.css`
- `frontend/src/__tests__/components/Charts/MultiLineChart.test.tsx`
- `frontend/src/__tests__/components/Experiments/ChartsArea.test.tsx`
- `docs/plan/06-roadmap.md`
- `README.md`
