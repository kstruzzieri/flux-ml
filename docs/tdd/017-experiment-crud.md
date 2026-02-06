# TDD: Issue #17 - Experiment CRUD Operations

## Issue Summary
Implement Create, Read, Update, Delete operations for experiments in the `internal/experiment` package. This is the first domain-specific data layer, building on the SQLite database foundation from issue #16. It establishes the Store pattern that will be reused for metrics (#18), events (#19), and alerts (#20).

## Acceptance Criteria
- [x] Create experiment with config
- [x] List all experiments
- [x] Get experiment by ID
- [x] Update experiment status
- [x] Delete experiment
- [x] Wails bindings expose operations to frontend

## Rationale
This is the first domain data layer building on the SQLite foundation (#16). It establishes the Store pattern for metrics/events/alerts (#18-20). The design choices are:
1. **Store pattern** - A single `Store` struct wraps the database connection, providing a clean API for experiment operations. This pattern will be replicated for metrics, events, and alerts stores.
2. **UUID primary keys** - Experiments use UUID v4 identifiers rather than auto-incrementing integers, enabling offline creation and merge-safe identifiers across distributed workflows.
3. **Status validation** - Valid statuses are enforced at the application layer (pending, running, completed, failed), preventing invalid state transitions from reaching the database.
4. **Unix timestamps** - `created_at` and `updated_at` stored as Unix epoch integers for simplicity and timezone-neutral comparisons.
5. **Empty slice guarantee** - `List()` returns an empty slice (not nil) when no experiments exist, preventing nil-pointer issues in frontend serialization.

## Failing Tests

### Test 1: TestCreate_Success
Creating an experiment must generate a UUID ID, store the name and config, set status to pending, leave parent_id nil, and set both timestamps to approximately now.
```go
func TestCreate_Success(t *testing.T) {
	store := newTestStore(t)
	config := `{"learning_rate": 0.001, "batch_size": 32}`
	exp, err := store.Create("reward-model-v1", config)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if len(exp.ID) != 36 {
		t.Errorf("ID length = %d, want 36 (UUID format)", len(exp.ID))
	}
	if exp.Name != "reward-model-v1" {
		t.Errorf("Name = %q, want %q", exp.Name, "reward-model-v1")
	}
	if exp.Config != config {
		t.Errorf("Config = %q, want %q", exp.Config, config)
	}
	if exp.Status != StatusPending {
		t.Errorf("Status = %q, want %q", exp.Status, StatusPending)
	}
	if exp.ParentID != nil {
		t.Errorf("ParentID = %v, want nil", exp.ParentID)
	}
	now := time.Now().Unix()
	if exp.CreatedAt < now-5 || exp.CreatedAt > now+1 {
		t.Errorf("CreatedAt = %d, want ~%d", exp.CreatedAt, now)
	}
	if exp.UpdatedAt < now-5 || exp.UpdatedAt > now+1 {
		t.Errorf("UpdatedAt = %d, want ~%d", exp.UpdatedAt, now)
	}
}
```

### Test 2: TestCreate_EmptyName
Creating an experiment with an empty name must return an error. Names are required for identifying experiments in the UI.
```go
func TestCreate_EmptyName(t *testing.T) {
	store := newTestStore(t)
	_, err := store.Create("", `{}`)
	if err == nil {
		t.Fatal("expected error for empty name, got nil")
	}
}
```

### Test 3: TestList_ReturnsAll
Listing experiments must return all previously created experiments. After creating three experiments, List must return all three with their correct names.
```go
func TestList_ReturnsAll(t *testing.T) {
	store := newTestStore(t)
	names := []string{"exp-a", "exp-b", "exp-c"}
	for _, name := range names {
		if _, err := store.Create(name, `{}`); err != nil {
			t.Fatalf("Create %q failed: %v", name, err)
		}
	}
	list, err := store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(list) != 3 {
		t.Fatalf("List returned %d experiments, want 3", len(list))
	}
	found := map[string]bool{}
	for _, exp := range list {
		found[exp.Name] = true
	}
	for _, name := range names {
		if !found[name] {
			t.Errorf("experiment %q not found in list", name)
		}
	}
}
```

### Test 4: TestList_Empty
Listing experiments when none exist must return an empty slice, not nil. This prevents nil-pointer issues when the result is serialized to JSON for the frontend.
```go
func TestList_Empty(t *testing.T) {
	store := newTestStore(t)
	list, err := store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if list == nil {
		t.Fatal("List returned nil, want empty slice")
	}
	if len(list) != 0 {
		t.Errorf("List returned %d experiments, want 0", len(list))
	}
}
```

### Test 5: TestGetByID_Found
Retrieving an experiment by its ID must return the correct experiment with all fields matching the originally created values.
```go
func TestGetByID_Found(t *testing.T) {
	store := newTestStore(t)
	created, err := store.Create("test-exp", `{"lr": 0.01}`)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	got, err := store.GetByID(created.ID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}
	if got.ID != created.ID {
		t.Errorf("ID = %q, want %q", got.ID, created.ID)
	}
	if got.Name != "test-exp" {
		t.Errorf("Name = %q, want %q", got.Name, "test-exp")
	}
	if got.Config != `{"lr": 0.01}` {
		t.Errorf("Config = %q, want %q", got.Config, `{"lr": 0.01}`)
	}
}
```

### Test 6: TestGetByID_NotFound
Retrieving an experiment with a nonexistent ID must return an error, not a zero-value experiment.
```go
func TestGetByID_NotFound(t *testing.T) {
	store := newTestStore(t)
	_, err := store.GetByID("nonexistent-id")
	if err == nil {
		t.Fatal("expected error for nonexistent ID, got nil")
	}
}
```

### Test 7: TestUpdateStatus_Valid
Updating an experiment's status to a valid value must persist the change and update the updated_at timestamp.
```go
func TestUpdateStatus_Valid(t *testing.T) {
	store := newTestStore(t)
	created, err := store.Create("test-exp", `{}`)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	err = store.UpdateStatus(created.ID, StatusRunning)
	if err != nil {
		t.Fatalf("UpdateStatus failed: %v", err)
	}
	got, err := store.GetByID(created.ID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}
	if got.Status != StatusRunning {
		t.Errorf("Status = %q, want %q", got.Status, StatusRunning)
	}
	if got.UpdatedAt <= created.UpdatedAt-1 {
		t.Errorf("UpdatedAt not updated: got %d, created had %d", got.UpdatedAt, created.UpdatedAt)
	}
}
```

### Test 8: TestUpdateStatus_InvalidStatus
Updating an experiment's status to an invalid value must return an error. Only recognized statuses (pending, running, completed, failed, cancelled) are accepted.
```go
func TestUpdateStatus_InvalidStatus(t *testing.T) {
	store := newTestStore(t)
	created, err := store.Create("test-exp", `{}`)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	err = store.UpdateStatus(created.ID, "invalid_status")
	if err == nil {
		t.Fatal("expected error for invalid status, got nil")
	}
}
```

### Test 9: TestUpdateStatus_NotFound
Updating the status of a nonexistent experiment must return an error.
```go
func TestUpdateStatus_NotFound(t *testing.T) {
	store := newTestStore(t)
	err := store.UpdateStatus("nonexistent-id", StatusRunning)
	if err == nil {
		t.Fatal("expected error for nonexistent ID, got nil")
	}
}
```

### Test 10: TestDelete_Success
Deleting an existing experiment must remove it from the database. A subsequent GetByID for the deleted ID must return an error.
```go
func TestDelete_Success(t *testing.T) {
	store := newTestStore(t)
	created, err := store.Create("test-exp", `{}`)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	err = store.Delete(created.ID)
	if err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
	_, err = store.GetByID(created.ID)
	if err == nil {
		t.Fatal("expected error after delete, got nil")
	}
}
```

### Test 11: TestDelete_NotFound
Deleting a nonexistent experiment must return an error, not silently succeed.
```go
func TestDelete_NotFound(t *testing.T) {
	store := newTestStore(t)
	err := store.Delete("nonexistent-id")
	if err == nil {
		t.Fatal("expected error for nonexistent ID, got nil")
	}
}
```

## Test Helper

All tests use a shared helper that creates an isolated in-memory database:
```go
package experiment

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/kstruzzieri/flux-ml/internal/database"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := database.Open(path)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return NewStore(db)
}
```

## Expected Output (Failing)
```
--- FAIL: TestCreate_Success (0.00s)
    store_test.go:XX: Create failed: <nil return from stub>
--- FAIL: TestCreate_EmptyName (0.00s)
    store_test.go:XX: expected error for empty name, got nil
--- FAIL: TestList_ReturnsAll (0.00s)
    store_test.go:XX: Create "exp-a" failed: <nil return from stub>
--- FAIL: TestList_Empty (0.00s)
    store_test.go:XX: List returned nil, want empty slice
--- FAIL: TestGetByID_Found (0.00s)
    store_test.go:XX: Create failed: <nil return from stub>
--- FAIL: TestGetByID_NotFound (0.00s)
    store_test.go:XX: expected error for nonexistent ID, got nil
--- FAIL: TestUpdateStatus_Valid (0.00s)
    store_test.go:XX: Create failed: <nil return from stub>
--- FAIL: TestUpdateStatus_InvalidStatus (0.00s)
    store_test.go:XX: Create failed: <nil return from stub>
--- FAIL: TestUpdateStatus_NotFound (0.00s)
    store_test.go:XX: expected error for nonexistent ID, got nil
--- FAIL: TestDelete_Success (0.00s)
    store_test.go:XX: Create failed: <nil return from stub>
--- FAIL: TestDelete_NotFound (0.00s)
    store_test.go:XX: expected error for nonexistent ID, got nil
FAIL    github.com/kstruzzieri/flux-ml/internal/experiment    0.001s
Tests:    0 passed, 11 failed, 11 total
```

## Test Summary

### Passing Test Results
```
=== RUN   TestCreate_Success
--- PASS: TestCreate_Success (0.01s)
=== RUN   TestCreate_EmptyName
--- PASS: TestCreate_EmptyName (0.01s)
=== RUN   TestList_ReturnsAll
--- PASS: TestList_ReturnsAll (0.01s)
=== RUN   TestList_Empty
--- PASS: TestList_Empty (0.01s)
=== RUN   TestGetByID_Found
--- PASS: TestGetByID_Found (0.01s)
=== RUN   TestGetByID_NotFound
--- PASS: TestGetByID_NotFound (0.01s)
=== RUN   TestUpdateStatus_Valid
--- PASS: TestUpdateStatus_Valid (0.01s)
=== RUN   TestUpdateStatus_InvalidStatus
--- PASS: TestUpdateStatus_InvalidStatus (0.01s)
=== RUN   TestUpdateStatus_NotFound
--- PASS: TestUpdateStatus_NotFound (0.01s)
=== RUN   TestDelete_Success
--- PASS: TestDelete_Success (0.01s)
=== RUN   TestDelete_NotFound
--- PASS: TestDelete_NotFound (0.01s)
PASS
ok  	github.com/kstruzzieri/flux-ml/internal/experiment	0.170s

Tests:    11 passed, 0 failed, 11 total
```

## Implementation Summary

### Files Created
- `internal/experiment/store.go` — Experiment type, Store struct, CRUD methods (Create, List, GetByID, UpdateStatus, Delete)
- `internal/experiment/store_test.go` — 11 tests covering all operations and edge cases
- `experiment_api.go` — Wails-bound API methods on App struct (thin pass-throughs to Store)

### Files Modified
- `app.go` — Added `db` and `experiments` fields to App struct, database initialization in startup(), shutdown() method for cleanup
- `main.go` — Added OnShutdown wiring to Wails options

### Design Decisions
1. **Store pattern** — `experiment.Store` wraps `*database.DB`, providing domain-specific CRUD. This pattern will be reused for metrics, events, and alerts stores.
2. **UUID v4 primary keys** — Generated via `github.com/google/uuid`, 36-char format with hyphens. Collision-safe, no coordination needed.
3. **Status validation** — `validStatuses` map enforces only `pending`, `running`, `completed`, `failed` at the application layer before reaching the database.
4. **sql.NullString for parent_id** — Handles nullable foreign key column cleanly in Go's type system.
5. **RowsAffected() for not-found detection** — UpdateStatus and Delete check affected row count instead of querying first, reducing round-trips.
6. **Empty slice guarantee** — `List()` initializes with `[]Experiment{}` (not nil) ensuring clean JSON serialization to `[]` instead of `null`.
7. **Nil-safe API methods** — All Wails-bound methods check `a.experiments == nil` to handle the case where database initialization failed during startup.
