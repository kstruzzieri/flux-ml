# TDD: Issue #26 - Experiment Detail View Layout

## Issue Summary
Build the experiment detail view layout in MainPanel when an experiment is selected. The view provides at-a-glance training health through metric cards with health-colored borders, reward component balance visualization, step count display, and a tabbed charts placeholder for Phase 3 uPlot integration. Design incorporates ML engineer and MLOps engineer recommendations for trend-based health thresholds, windowed trend computation, and workflow-oriented chart tabs.

## Acceptance Criteria
- [x] Health utilities: computeTrend (windowed average comparison), assessHealth (trend-based thresholds), assessRewardDivergence (ratio + min-spread guard)
- [x] Formatting: KL with 6 decimals, learning rate in scientific notation, step count with locale formatting
- [x] metricsStore: fetchLatestRewardSignals, rewards:recorded event subscription, latestRewardSignals state
- [x] MetricCard: label, formatted value, trend arrow (up/down/flat), health border (healthy/warning/critical/none), muted for insufficient data
- [x] RewardComponentsCard: horizontal bars with proportional fill, divergence detection, step number display, empty state
- [x] ChartsArea: three workflow-oriented tabs (Overview, Reward Components, Diagnostics), placeholder content
- [x] MetricsGrid: composes 4 MetricCards + RewardComponentsCard, fetches data on mount, derives trend and health from sparkline data
- [x] MainPanel: renders MetricsGrid + ChartsArea in dashboard section, step count in header derived from sparkline data
- [x] All existing tests continue to pass (232 total across 23 suites)

## Rationale
1. **Vital signs, not raw numbers** — Health-colored borders let researchers answer "is anything off?" within 2 seconds. Green/amber/red borders surface health status alongside values without requiring mental threshold comparison.
2. **Trend-based KL thresholds** — Per ML engineer review, absolute KL values vary dramatically by training algorithm and KL coefficient. Trend stability (flat = healthy, up = warning) is universally meaningful.
3. **Windowed trend computation** — Splits sparkline data in half and compares average of each half. More stable than 2-point comparison, leverages existing 60-point LTTB data without additional queries.
4. **Reward component balance front-and-center** — Divergence between reward components is the most dangerous signal in RLHF training. The >2x ratio AND >0.1 min-spread guard prevents false alarms on near-zero values.
5. **Step count in header** — Researchers orient by step number. Derived from sparkline data (no additional backend queries).
6. **Workflow-oriented chart tabs** — Per ML engineer review, tabs named by workflow (Overview, Reward Components, Diagnostics) rather than individual metric names. Actual chart content deferred to Phase 3.
7. **Insufficient data state** — Health borders show muted (no color) when not enough data points exist, preventing false green/amber/red on new experiments.

## Failing Tests

### Health Utilities (17 tests)

#### computeTrend (4 tests)
```typescript
it('returns "insufficient" when data has fewer than 4 points', ...)
it('returns "down" when recent average is lower than previous average', ...)
it('returns "up" when recent average is higher than previous average', ...)
it('returns "flat" when averages are within 1% of each other', ...)
```

#### assessHealth (9 tests)
```typescript
it('returns "healthy" for decreasing loss', ...)
it('returns "warning" for flat loss', ...)
it('returns "critical" for increasing loss', ...)
it('returns "healthy" for increasing reward', ...)
it('returns "critical" for decreasing reward', ...)
it('returns "healthy" for stable kl', ...)
it('returns "warning" for increasing kl', ...)
it('returns "none" for insufficient data', ...)
it('returns "none" for metrics without health rules', ...)
```

#### assessRewardDivergence (4 tests)
```typescript
it('returns "none" when components array is empty', ...)
it('returns "healthy" when components are balanced', ...)
it('returns "warning" when one component is >2x another AND spread > 0.1', ...)
it('returns "healthy" when ratio exceeds 2x but spread is under 0.1', ...)
```

### Formatting Extensions (5 new tests)
```typescript
it('formats kl with 6 decimal places', ...)
it('formats learning_rate in scientific notation', ...)
it('formats step count with comma separators', ...)
it('formats small step counts without commas', ...)
it('formats zero', ...)
```

### metricsStore Reward Signals (2 new tests)
```typescript
it('fetchLatestRewardSignals populates state for an experiment', ...)
it('returns empty array for experiment with no reward signals', ...)
```

### MetricCard (10 tests)
```typescript
it('renders label and formatted value', ...)
it('renders em dash for null value', ...)
it('renders down arrow for decreasing trend', ...)
it('renders up arrow for increasing trend', ...)
it('renders flat indicator for flat trend', ...)
it('does not render trend indicator when data is insufficient', ...)
it('applies healthy health class', ...)
it('applies warning health class', ...)
it('applies critical health class', ...)
it('has no health modifier class when health is none', ...)
```

### RewardComponentsCard (7 tests)
```typescript
it('renders all three component labels', ...)
it('renders component values', ...)
it('displays step number', ...)
it('applies healthy class when components are balanced', ...)
it('applies warning class when components diverge', ...)
it('renders bar elements for each component', ...)
it('renders empty state when no components', ...)
```

### ChartsArea (4 tests)
```typescript
it('renders three chart tabs', ...)
it('has Overview tab active by default', ...)
it('switches active tab on click', ...)
it('shows placeholder content in chart body', ...)
```

### MetricsGrid (3 tests)
```typescript
it('renders four metric cards', ...)
it('renders reward components card', ...)
it('shows em dash values when no metrics available', ...)
```

### MainPanel Integration (4 new tests)
```typescript
it('shows metrics grid when experiment is selected', ...)
it('shows charts area when experiment is selected', ...)
it('shows step count in header when sparkline data is available', ...)
it('does not show step count when no sparkline data', ...)
```

## Expected Output
All failing tests should fail with "module not found" or "function not defined" errors before implementation, then pass after implementation.

## Test Summary

| Suite | Tests | Status |
|-------|-------|--------|
| health.test.ts | 17 | PASS |
| formatting.test.ts | 16 (11 existing + 5 new) | PASS |
| metricsStore.test.ts | 8 (6 existing + 2 new) | PASS |
| MetricCard.test.tsx | 10 | PASS |
| RewardComponentsCard.test.tsx | 7 | PASS |
| ChartsArea.test.tsx | 4 | PASS |
| MetricsGrid.test.tsx | 3 | PASS |
| MainPanel.test.tsx | 9 (5 existing + 4 new) | PASS |
| **Total new tests** | **52** | **PASS** |
| **Full suite** | **232 tests, 23 suites** | **ALL PASS** |

## Passing Test Results
```
Test Suites: 23 passed, 23 total
Tests:       232 passed, 232 total
Snapshots:   0 total
```

## Implementation Summary

### Files Created (8)
| File | Purpose |
|------|---------|
| `frontend/src/utils/health.ts` | computeTrend, assessHealth, assessRewardDivergence |
| `frontend/src/__tests__/utils/health.test.ts` | 17 health utility tests |
| `frontend/src/components/Experiments/MetricCard.tsx` | Health-bordered metric card with trend arrow |
| `frontend/src/components/Experiments/MetricCard.css` | Card styles + reward components card styles |
| `frontend/src/components/Experiments/RewardComponentsCard.tsx` | Reward component bars with divergence detection |
| `frontend/src/components/Experiments/ChartsArea.tsx` | Tabbed placeholder for Phase 3 uPlot |
| `frontend/src/components/Experiments/ChartsArea.css` | Charts area styles |
| `frontend/src/components/Experiments/MetricsGrid.tsx` | Grid orchestrator composing cards |

### Files Modified (5)
| File | Changes |
|------|---------|
| `frontend/src/utils/formatting.ts` | Added kl decimals, learning_rate exponential, formatStepCount |
| `frontend/src/stores/metricsStore.ts` | Added latestRewardSignals, fetchLatestRewardSignals, rewards:recorded subscription |
| `frontend/src/components/layout/panels/MainPanel.tsx` | Import MetricsGrid/ChartsArea, add step count, useLatestStep hook |
| `frontend/src/styles/components/layout.css` | Added metrics-grid and experiment-header__step styles |
| `frontend/src/__tests__/components/layout/panels/MainPanel.test.tsx` | 4 new integration tests, expanded App mock |

### ML Engineer Recommendations Incorporated
1. Trend-based KL thresholds (not absolute values)
2. Windowed trend computation (split-half average comparison)
3. `rewards:recorded` event subscription for live updates
4. Step number display on RewardComponentsCard
5. Min-spread guard (0.1) on reward divergence detection
6. Insufficient data state (muted health border)
7. Workflow-oriented chart tab names

### Deferred to Follow-up Issues
- #104: Server-side LTTB downsampling for sparkline scalability
- #105: Cross-metric health logic for reward hacking detection
- #106: Throughput metric (steps/sec)
- #107: Gradient norm and policy entropy metrics
