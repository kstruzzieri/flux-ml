# TDD: Issue #19 — Metrics Storage

## Issue Summary

Implement metrics storage for experiment data. A single `metrics.Store` in `internal/metrics/` handles both the `metrics` and `reward_signals` tables with batch insert and filtered query operations.

## Acceptance Criteria

- [x] Metrics stored efficiently (batch insert in transaction)
- [x] Queries perform well with indexes
- [x] Reward components tracked separately
- [x] Wails API bindings expose all four operations
- [x] All tests pass with race detector clean

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

All 14 tests failed during RED phase with stubs returning nil/no-op:
- RecordMetrics tests: stubs returned nil (no error), queries returned 0 results
- QueryMetrics tests: stubs returned nil slices
- RecordRewardSignals tests: same pattern
- QueryRewardSignals tests: same pattern

## Test Results

```
=== RUN   TestRecordMetrics                          --- PASS
=== RUN   TestRecordMetrics_EmptyExperimentID        --- PASS
=== RUN   TestRecordMetrics_EmptySlice               --- PASS
=== RUN   TestRecordMetrics_ForeignKeyViolation      --- PASS
=== RUN   TestQueryMetrics_All                       --- PASS
=== RUN   TestQueryMetrics_FilterByName              --- PASS
=== RUN   TestQueryMetrics_FilterByStepRange         --- PASS
=== RUN   TestQueryMetrics_NoMatches                 --- PASS
=== RUN   TestRecordRewardSignals                    --- PASS
=== RUN   TestRecordRewardSignals_EmptyExperimentID  --- PASS
=== RUN   TestRecordRewardSignals_EmptySlice         --- PASS
=== RUN   TestQueryRewardSignals_All                 --- PASS
=== RUN   TestQueryRewardSignals_FilterByComponent   --- PASS
=== RUN   TestQueryRewardSignals_FilterByStepRange   --- PASS
PASS
ok  github.com/kstruzzieri/flux-ml/internal/metrics  0.327s
```

Full suite: 56 tests across 4 packages, all passing. Race detector clean.

## Implementation Summary

### Files created
- `internal/metrics/store.go` — Store with RecordMetrics, QueryMetrics, RecordRewardSignals, QueryRewardSignals
- `internal/metrics/store_test.go` — 14 tests with isolated DB helper
- `metrics_api.go` — Wails API pass-through methods

### Files modified
- `app.go` — Added `metrics *metrics.Store` field and initialization

### Key decisions
- Single Store handles both `metrics` and `reward_signals` tables
- Batch inserts use `tx.Begin()`/`tx.Commit()` for atomicity with prepared statements
- Query methods use dynamic WHERE with parameterized args (experimentID always required)
- `sql.NullString` for nullable distribution JSON column
- Empty distribution stored as NULL, empty string on read defaults to `""`
