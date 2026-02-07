# TDD: Issue #20 - Wails Bindings for Data Access

## Issue Summary
Bridge the Go backend data layer (Phase 2A) to the frontend by adding Wails event emissions to mutation API methods, writing integration tests for all App-level API methods, regenerating TypeScript bindings, and updating frontend mocks. This completes the backend-to-frontend contract so Phase 2B can build frontend stores and hooks.

## Acceptance Criteria
- [ ] `emitEvent` helper on App struct guards against nil ctx
- [ ] Mutation methods emit Wails events: experiment:created, experiment:updated, experiment:deleted, event:appended, metrics:recorded, rewards:recorded
- [ ] Read methods (List, Get, Replay, Query) emit no events
- [ ] 16 integration tests in `app_api_test.go` covering all API methods
- [ ] Wails TypeScript bindings regenerated with all 16 methods
- [ ] Frontend mocks updated with new data layer types and methods
- [ ] All 75 tests pass (59 existing + 16 new)

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
_To be filled after implementation._

## Implementation Summary
_To be filled after implementation._
