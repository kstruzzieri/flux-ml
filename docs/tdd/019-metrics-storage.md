# TDD: Issue #19 — Metrics Storage

## Issue Summary

Implement metrics storage for experiment data. A single `metrics.Store` in `internal/metrics/` handles both the `metrics` and `reward_signals` tables with batch insert and filtered query operations.

## Acceptance Criteria

- [ ] Metrics stored efficiently (batch insert in transaction)
- [ ] Queries perform well with indexes
- [ ] Reward components tracked separately
- [ ] Wails API bindings expose all four operations
- [ ] All tests pass with race detector clean

## Rationale

The `metrics` and `reward_signals` tables already exist (migration 001, cascade in 003). This issue adds the Go domain layer: a `Store` wrapping `*database.DB` with batch insert and filtered query methods, following the same patterns as `internal/experiment/` and `internal/event/`.

## Test Plan (14 tests)

### RecordMetrics (4)
1. `TestRecordMetrics` — Batch insert 3 metrics, verify all queryable
2. `TestRecordMetrics_EmptyExperimentID` — Error for empty experiment ID
3. `TestRecordMetrics_EmptySlice` — Error for empty metrics slice
4. `TestRecordMetrics_ForeignKeyViolation` — Error for nonexistent experiment

### QueryMetrics (4)
5. `TestQueryMetrics_All` — Returns all metrics for experiment, ASC by step
6. `TestQueryMetrics_FilterByName` — Returns only metrics matching name
7. `TestQueryMetrics_FilterByStepRange` — Returns only metrics in step range
8. `TestQueryMetrics_NoMatches` — Returns empty slice (not nil)

### RecordRewardSignals (3)
9. `TestRecordRewardSignals` — Batch insert with distribution JSON
10. `TestRecordRewardSignals_EmptyExperimentID` — Error for empty experiment ID
11. `TestRecordRewardSignals_EmptySlice` — Error for empty signals slice

### QueryRewardSignals (3)
12. `TestQueryRewardSignals_All` — Returns all signals for experiment, ASC by step
13. `TestQueryRewardSignals_FilterByComponent` — Returns only matching component
14. `TestQueryRewardSignals_FilterByStepRange` — Returns only signals in step range

## Failing Tests

> Tests written before implementation — see below for results.

## Test Results

> Pending implementation.

## Implementation Summary

> Pending implementation.
