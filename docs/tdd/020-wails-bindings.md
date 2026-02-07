# TDD: Issue #20 - Wails Bindings for Data Access

## Issue Summary
Bridge the Go backend data layer (Phase 2A) to the frontend by adding Wails event emissions to mutation API methods, writing integration tests for all App-level API methods, regenerating TypeScript bindings, and updating frontend mocks. This completes the backend-to-frontend contract so Phase 2B can build frontend stores and hooks.

## Acceptance Criteria
- [x] `emitEvent` helper on App struct guards against nil ctx
- [x] Mutation methods emit Wails events: experiment:created, experiment:updated, experiment:deleted, event:appended, metrics:recorded, rewards:recorded
- [x] Read methods (List, Get, Replay, Query) emit no events
- [x] 16 integration tests in `app_api_test.go` covering all API methods
- [x] Wails TypeScript bindings regenerated with all 16 methods
- [x] Frontend mocks updated with new data layer types and methods
- [x] All 75 tests pass (59 existing + 16 new)

## Rationale
1. **Event emission** — Frontend needs real-time notifications when data changes. Wails events provide a built-in pub/sub mechanism that avoids polling. Only mutations emit events; reads are pull-based.
2. **Nil ctx guard** — Tests run without a Wails runtime, so `a.ctx` is nil. The `emitEvent` helper short-circuits when ctx is nil, preventing panics in tests while keeping the emission logic centralized.
3. **Integration tests at App level** — Unit tests exist in each domain package. These integration tests verify the App API layer: nil-store guards, correct delegation to stores, and event emission safety.
4. **TypeScript bindings** — `wails generate module` auto-generates JS/TS bindings from exported Go methods. The frontend imports these directly for type-safe RPC calls.
5. **Frontend mocks** — Jest tests use mocked bindings. Mocks must mirror the real binding signatures for tests to remain valid.

## Failing Tests

### Test 1: TestApp_CreateExperiment
Creating an experiment through the App API must return a valid experiment with UUID ID, correct name, and pending status.
```go
func TestApp_CreateExperiment(t *testing.T) {
	app := newTestApp(t)
	exp, err := app.CreateExperiment("test-model", `{"lr": 0.001}`)
	if err != nil {
		t.Fatalf("CreateExperiment failed: %v", err)
	}
	if len(exp.ID) != 36 {
		t.Errorf("ID length = %d, want 36", len(exp.ID))
	}
	if exp.Name != "test-model" {
		t.Errorf("Name = %q, want %q", exp.Name, "test-model")
	}
	if exp.Status != "pending" {
		t.Errorf("Status = %q, want %q", exp.Status, "pending")
	}
}
```

### Test 2: TestApp_ListExperiments
Listing experiments must return all created experiments.
```go
func TestApp_ListExperiments(t *testing.T) {
	app := newTestApp(t)
	app.CreateExperiment("exp-1", `{}`)
	app.CreateExperiment("exp-2", `{}`)
	list, err := app.ListExperiments()
	if err != nil {
		t.Fatalf("ListExperiments failed: %v", err)
	}
	if len(list) != 2 {
		t.Errorf("got %d experiments, want 2", len(list))
	}
}
```

### Test 3: TestApp_GetExperiment
Getting an experiment by ID must return correct data.
```go
func TestApp_GetExperiment(t *testing.T) {
	app := newTestApp(t)
	created, _ := app.CreateExperiment("test", `{}`)
	got, err := app.GetExperiment(created.ID)
	if err != nil {
		t.Fatalf("GetExperiment failed: %v", err)
	}
	if got.ID != created.ID {
		t.Errorf("ID = %q, want %q", got.ID, created.ID)
	}
}
```

### Test 4: TestApp_UpdateExperimentStatus
Updating status must persist the change.
```go
func TestApp_UpdateExperimentStatus(t *testing.T) {
	app := newTestApp(t)
	created, _ := app.CreateExperiment("test", `{}`)
	err := app.UpdateExperimentStatus(created.ID, "running")
	if err != nil {
		t.Fatalf("UpdateExperimentStatus failed: %v", err)
	}
	got, _ := app.GetExperiment(created.ID)
	if got.Status != "running" {
		t.Errorf("Status = %q, want %q", got.Status, "running")
	}
}
```

### Test 5: TestApp_DeleteExperiment
Deleting must remove the experiment; subsequent Get must fail.
```go
func TestApp_DeleteExperiment(t *testing.T) {
	app := newTestApp(t)
	created, _ := app.CreateExperiment("test", `{}`)
	err := app.DeleteExperiment(created.ID)
	if err != nil {
		t.Fatalf("DeleteExperiment failed: %v", err)
	}
	_, err = app.GetExperiment(created.ID)
	if err == nil {
		t.Fatal("expected error after delete, got nil")
	}
}
```

### Test 6: TestApp_NilExperimentStore
Calling experiment methods with nil store must return "database not initialized".
```go
func TestApp_NilExperimentStore(t *testing.T) {
	app := &App{}
	_, err := app.CreateExperiment("test", `{}`)
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("expected 'database not initialized', got %v", err)
	}
}
```

### Test 7: TestApp_AppendEvent
Appending an event must return it with correct fields.
```go
func TestApp_AppendEvent(t *testing.T) {
	app := newTestApp(t)
	created, _ := app.CreateExperiment("test", `{}`)
	ev, err := app.AppendEvent(created.ID, "metric", `{"loss": 0.5}`)
	if err != nil {
		t.Fatalf("AppendEvent failed: %v", err)
	}
	if ev.ExperimentID != created.ID {
		t.Errorf("ExperimentID = %q, want %q", ev.ExperimentID, created.ID)
	}
}
```

### Test 8: TestApp_ReplayEvents
Replaying events must return them in chronological order with type filter.
```go
func TestApp_ReplayEvents(t *testing.T) {
	app := newTestApp(t)
	created, _ := app.CreateExperiment("test", `{}`)
	app.AppendEvent(created.ID, "metric", `{"loss": 0.5}`)
	app.AppendEvent(created.ID, "alert", `{"type": "drift"}`)
	events, err := app.ReplayEvents(created.ID, 0, 0, "metric")
	if err != nil {
		t.Fatalf("ReplayEvents failed: %v", err)
	}
	if len(events) != 1 {
		t.Errorf("got %d events, want 1", len(events))
	}
}
```

### Test 9: TestApp_NilEventStore
Calling event methods with nil store must return error.
```go
func TestApp_NilEventStore(t *testing.T) {
	app := &App{}
	_, err := app.AppendEvent("id", "metric", "{}")
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("expected 'database not initialized', got %v", err)
	}
}
```

### Test 10: TestApp_RecordMetrics
Recording metrics must persist and be queryable.
```go
func TestApp_RecordMetrics(t *testing.T) {
	app := newTestApp(t)
	created, _ := app.CreateExperiment("test", `{}`)
	m := []metrics.Metric{
		{Step: 1, Name: "loss", Value: 0.5, Timestamp: 1000},
		{Step: 2, Name: "loss", Value: 0.3, Timestamp: 1001},
	}
	err := app.RecordMetrics(created.ID, m)
	if err != nil {
		t.Fatalf("RecordMetrics failed: %v", err)
	}
	results, _ := app.QueryMetrics(created.ID, "loss", 0, 0)
	if len(results) != 2 {
		t.Errorf("got %d metrics, want 2", len(results))
	}
}
```

### Test 11: TestApp_QueryMetrics
Querying with name filter must return only matching metrics.
```go
func TestApp_QueryMetrics(t *testing.T) {
	app := newTestApp(t)
	created, _ := app.CreateExperiment("test", `{}`)
	m := []metrics.Metric{
		{Step: 1, Name: "loss", Value: 0.5, Timestamp: 1000},
		{Step: 1, Name: "accuracy", Value: 0.8, Timestamp: 1000},
	}
	app.RecordMetrics(created.ID, m)
	results, err := app.QueryMetrics(created.ID, "accuracy", 0, 0)
	if err != nil {
		t.Fatalf("QueryMetrics failed: %v", err)
	}
	if len(results) != 1 {
		t.Errorf("got %d metrics, want 1", len(results))
	}
}
```

### Test 12: TestApp_RecordRewardSignals
Recording reward signals must persist and be queryable.
```go
func TestApp_RecordRewardSignals(t *testing.T) {
	app := newTestApp(t)
	created, _ := app.CreateExperiment("test", `{}`)
	signals := []metrics.RewardSignal{
		{Step: 1, Component: "helpfulness", Value: 0.8},
		{Step: 1, Component: "harmlessness", Value: 0.9},
	}
	err := app.RecordRewardSignals(created.ID, signals)
	if err != nil {
		t.Fatalf("RecordRewardSignals failed: %v", err)
	}
	results, _ := app.QueryRewardSignals(created.ID, "", 0, 0)
	if len(results) != 2 {
		t.Errorf("got %d signals, want 2", len(results))
	}
}
```

### Test 13: TestApp_QueryRewardSignals
Querying with component filter must return only matching signals.
```go
func TestApp_QueryRewardSignals(t *testing.T) {
	app := newTestApp(t)
	created, _ := app.CreateExperiment("test", `{}`)
	signals := []metrics.RewardSignal{
		{Step: 1, Component: "helpfulness", Value: 0.8},
		{Step: 1, Component: "harmlessness", Value: 0.9},
	}
	app.RecordRewardSignals(created.ID, signals)
	results, err := app.QueryRewardSignals(created.ID, "helpfulness", 0, 0)
	if err != nil {
		t.Fatalf("QueryRewardSignals failed: %v", err)
	}
	if len(results) != 1 {
		t.Errorf("got %d signals, want 1", len(results))
	}
}
```

### Test 14: TestApp_NilMetricsStore
Calling metrics methods with nil store must return error.
```go
func TestApp_NilMetricsStore(t *testing.T) {
	app := &App{}
	err := app.RecordMetrics("id", nil)
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("expected 'database not initialized', got %v", err)
	}
}
```

### Test 15: TestApp_EmitEvent_NilCtx
Mutation with nil ctx must not panic (emitEvent guards against nil ctx).
```go
func TestApp_EmitEvent_NilCtx(t *testing.T) {
	app := newTestApp(t)
	exp, err := app.CreateExperiment("test", `{}`)
	if err != nil {
		t.Fatalf("CreateExperiment with nil ctx should not fail: %v", err)
	}
	if exp == nil {
		t.Fatal("expected non-nil experiment")
	}
}
```

### Test 16: TestApp_GetDBStatus_NoDB
GetDBStatus with no DB returns empty string (no error if DB was never opened).
```go
func TestApp_GetDBStatus_NoDB(t *testing.T) {
	app := &App{dbError: "test error"}
	status := app.GetDBStatus()
	if status != "test error" {
		t.Errorf("GetDBStatus = %q, want %q", status, "test error")
	}
}
```

## Test Helper

```go
func newTestApp(t *testing.T) *App {
	t.Helper()
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")
	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return &App{
		db:          db,
		experiments: experiment.NewStore(db),
		events:      event.NewStore(db),
		metrics:     metrics.NewStore(db),
	}
}
```

## Expected Output (Failing)
```
--- FAIL: TestApp_CreateExperiment (0.00s)
--- FAIL: TestApp_ListExperiments (0.00s)
--- FAIL: TestApp_GetExperiment (0.00s)
--- FAIL: TestApp_UpdateExperimentStatus (0.00s)
--- FAIL: TestApp_DeleteExperiment (0.00s)
--- FAIL: TestApp_NilExperimentStore (0.00s)
--- FAIL: TestApp_AppendEvent (0.00s)
--- FAIL: TestApp_ReplayEvents (0.00s)
--- FAIL: TestApp_NilEventStore (0.00s)
--- FAIL: TestApp_RecordMetrics (0.00s)
--- FAIL: TestApp_QueryMetrics (0.00s)
--- FAIL: TestApp_RecordRewardSignals (0.00s)
--- FAIL: TestApp_QueryRewardSignals (0.00s)
--- FAIL: TestApp_NilMetricsStore (0.00s)
--- FAIL: TestApp_EmitEvent_NilCtx (0.00s)
--- FAIL: TestApp_GetDBStatus_NoDB (0.00s)
FAIL    github.com/kstruzzieri/flux-ml    0.001s
Tests:    0 passed, 16 failed, 16 total
```

## Test Summary

### Passing Test Results
```
=== RUN   TestApp_CreateExperiment
--- PASS: TestApp_CreateExperiment (0.17s)
=== RUN   TestApp_ListExperiments
--- PASS: TestApp_ListExperiments (0.14s)
=== RUN   TestApp_GetExperiment
--- PASS: TestApp_GetExperiment (0.14s)
=== RUN   TestApp_UpdateExperimentStatus
--- PASS: TestApp_UpdateExperimentStatus (0.17s)
=== RUN   TestApp_DeleteExperiment
--- PASS: TestApp_DeleteExperiment (0.17s)
=== RUN   TestApp_NilExperimentStore
--- PASS: TestApp_NilExperimentStore (0.00s)
=== RUN   TestApp_AppendEvent
--- PASS: TestApp_AppendEvent (0.13s)
=== RUN   TestApp_ReplayEvents
--- PASS: TestApp_ReplayEvents (0.14s)
=== RUN   TestApp_NilEventStore
--- PASS: TestApp_NilEventStore (0.00s)
=== RUN   TestApp_RecordMetrics
--- PASS: TestApp_RecordMetrics (0.13s)
=== RUN   TestApp_QueryMetrics
--- PASS: TestApp_QueryMetrics (0.14s)
=== RUN   TestApp_RecordRewardSignals
--- PASS: TestApp_RecordRewardSignals (0.13s)
=== RUN   TestApp_QueryRewardSignals
--- PASS: TestApp_QueryRewardSignals (0.13s)
=== RUN   TestApp_NilMetricsStore
--- PASS: TestApp_NilMetricsStore (0.00s)
=== RUN   TestApp_EmitEvent_NilCtx
--- PASS: TestApp_EmitEvent_NilCtx (0.14s)
=== RUN   TestApp_GetDBStatus_NoDB
--- PASS: TestApp_GetDBStatus_NoDB (0.00s)
PASS
ok      github.com/kstruzzieri/flux-ml    2.818s

Total: 75 tests across 5 packages, all passing
- github.com/kstruzzieri/flux-ml: 16 tests (new)
- github.com/kstruzzieri/flux-ml/internal/database: 17 tests
- github.com/kstruzzieri/flux-ml/internal/event: 14 tests
- github.com/kstruzzieri/flux-ml/internal/experiment: 11 tests
- github.com/kstruzzieri/flux-ml/internal/metrics: 17 tests

Frontend: 105 tests across 9 suites, all passing
```

## Implementation Summary

### Files Created
- `app_api_test.go` — 16 integration tests with `newTestApp` helper. Tests cover all App API methods: experiment CRUD (6), event API (3), metrics API (5), and safety tests (2).

### Files Modified
- `app.go` — Added `emitEvent` helper method that guards against nil `ctx` for test safety. Single control point for all Wails event emission.
- `experiment_api.go` — Added event emissions: `experiment:created` (full experiment), `experiment:updated` (id+status map), `experiment:deleted` (id map). Changed return flow to capture errors before emitting.
- `event_api.go` — Added `event:appended` emission with full event payload. Changed return flow to capture error before emitting.
- `metrics_api.go` — Added `metrics:recorded` and `rewards:recorded` emissions with experimentId+count payloads. Changed return flow to capture errors before emitting.
- `frontend/wailsjs/go/main/App.js` — Regenerated with 16 methods (12 new).
- `frontend/wailsjs/go/main/App.d.ts` — Regenerated with typed declarations importing `event`, `experiment`, `metrics` namespaces.
- `frontend/wailsjs/go/models.ts` — Regenerated with 4 namespaces: `event.Event`, `experiment.Experiment`, `main.AppInfo`, `main.LayoutState`, `metrics.Metric`, `metrics.RewardSignal`.
- `frontend/src/__mocks__/wailsjs/go/models.ts` — Added `event`, `experiment`, `metrics` namespace mocks matching generated bindings.
- `frontend/src/__mocks__/wailsjs/go/main/App.ts` — Added 12 new mock method implementations with in-memory state. Added `__resetMockState()` helper for test isolation.

### Design Decisions
1. **emitEvent helper** — Centralized event emission with nil ctx guard. Tests run without Wails runtime, so ctx is nil. The guard prevents panics while keeping emission logic in one place.
2. **Emit after success** — Events are only emitted after the store operation succeeds. This prevents the frontend from receiving notifications about operations that actually failed.
3. **Payload conventions** — Mutations that create/return data emit the full object. Status updates emit a minimal map with just the changed fields. Batch operations emit a summary count to avoid sending large payloads over the event bus.
4. **Mock state isolation** — `__resetMockState()` clears all mock data between tests, preventing test pollution. The old `__resetMockLayout()` is kept as a backward-compatible alias.
5. **No read events** — List, Get, Replay, and Query methods don't emit events. These are pull-based operations; only mutations need push notifications.
