# Experiment CRUD Operations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Create, Read, Update, Delete operations for experiments with Wails bindings to expose them to the frontend.

**Architecture:** New `internal/experiment/` package with `Store` struct that wraps `*database.DB`. Domain types (`Experiment` struct, status constants) live in this package. Thin Wails-bound methods on `App` in a separate `experiment_api.go` file delegate to the store. Database is opened in `app.go` startup and closed on shutdown.

**Tech Stack:** Go 1.23, `modernc.org/sqlite`, `github.com/google/uuid`, `database/sql`, Wails v2

**Design doc:** `docs/plans/2026-02-05-experiment-crud.md` (this file)

**TDD doc:** `docs/tdd/017-experiment-crud.md` (created in Task 1)

**Issue:** #17 — Experiment CRUD operations

**Branch:** `feature/17-experiment-crud`

---

### Task 1: Create TDD document

**Files:**
- Create: `docs/tdd/017-experiment-crud.md`

**Step 1: Write the TDD document**

Create the TDD document following the project pattern (see `docs/tdd/016-sqlite-integration.md` for format). Include:

- Issue summary: Implement CRUD operations for experiments
- Acceptance criteria from issue #17:
  - [ ] Create experiment with config
  - [ ] List all experiments
  - [ ] Get experiment by ID
  - [ ] Update experiment status
  - [ ] Delete experiment
  - [ ] Wails bindings expose operations to frontend
- Rationale: First domain data layer, establishes the Store pattern for metrics/events/alerts (#18-20)
- All 11 failing tests listed (see Task 3 for test code)
- Expected failing output

**Step 2: Commit**

```bash
git add docs/tdd/017-experiment-crud.md
git commit -m "docs: add TDD document for experiment CRUD operations (#17)"
```

---

### Task 2: Add UUID dependency

**Files:**
- Modify: `go.mod`
- Modify: `go.sum`

**Step 1: Install the google/uuid package**

```bash
cd /Users/keithstruzzieri/projects/portfolio/flux-ml
go get github.com/google/uuid
```

**Step 2: Verify it installed**

```bash
grep google/uuid go.mod
```

Expected: A line with `github.com/google/uuid` and version.

**Step 3: Commit**

```bash
git add go.mod go.sum
git commit -m "deps: add github.com/google/uuid for experiment IDs (#17)"
```

---

### Task 3: Write failing tests for experiment store

**Files:**
- Create: `internal/experiment/store.go` (minimal stub — just enough for compilation)
- Create: `internal/experiment/store_test.go`

**Step 1: Create the minimal store.go stub**

```go
package experiment

import (
	"github.com/kstruzzieri/flux-ml/internal/database"
)

// Status constants for experiments.
const (
	StatusPending   = "pending"
	StatusRunning   = "running"
	StatusCompleted = "completed"
	StatusFailed    = "failed"
)

// Experiment represents an ML training run.
type Experiment struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Config    string  `json:"config"`
	ParentID  *string `json:"parentId"`
	Status    string  `json:"status"`
	CreatedAt int64   `json:"createdAt"`
	UpdatedAt int64   `json:"updatedAt"`
}

// Store provides CRUD operations for experiments.
type Store struct {
	db *database.DB
}

// NewStore creates a new experiment store.
func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// Create creates a new experiment. Stub.
func (s *Store) Create(name string, config string) (*Experiment, error) {
	return nil, nil
}

// List returns all experiments. Stub.
func (s *Store) List() ([]Experiment, error) {
	return nil, nil
}

// GetByID returns an experiment by ID. Stub.
func (s *Store) GetByID(id string) (*Experiment, error) {
	return nil, nil
}

// UpdateStatus updates the status of an experiment. Stub.
func (s *Store) UpdateStatus(id string, status string) error {
	return nil
}

// Delete removes an experiment by ID. Stub.
func (s *Store) Delete(id string) error {
	return nil
}
```

**Step 2: Write store_test.go with all 11 tests**

```go
package experiment

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/kstruzzieri/flux-ml/internal/database"
)

// helper: open a test database and return a Store
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

func TestCreate_Success(t *testing.T) {
	store := newTestStore(t)
	config := `{"learning_rate": 0.001, "batch_size": 32}`

	exp, err := store.Create("reward-model-v1", config)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// ID should be a valid UUID (36 chars with hyphens)
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
	// Timestamps should be recent (within last 5 seconds)
	now := time.Now().Unix()
	if exp.CreatedAt < now-5 || exp.CreatedAt > now+1 {
		t.Errorf("CreatedAt = %d, want ~%d", exp.CreatedAt, now)
	}
	if exp.UpdatedAt < now-5 || exp.UpdatedAt > now+1 {
		t.Errorf("UpdatedAt = %d, want ~%d", exp.UpdatedAt, now)
	}
}

func TestCreate_EmptyName(t *testing.T) {
	store := newTestStore(t)
	_, err := store.Create("", `{}`)
	if err == nil {
		t.Fatal("expected error for empty name, got nil")
	}
}

func TestList_ReturnsAll(t *testing.T) {
	store := newTestStore(t)

	// Create 3 experiments with small delays to ensure ordering
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

	// Should be ordered by created_at DESC (newest first)
	// Since they're created nearly simultaneously, just verify all names present
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

func TestGetByID_NotFound(t *testing.T) {
	store := newTestStore(t)
	_, err := store.GetByID("nonexistent-id")
	if err == nil {
		t.Fatal("expected error for nonexistent ID, got nil")
	}
}

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

func TestUpdateStatus_NotFound(t *testing.T) {
	store := newTestStore(t)
	err := store.UpdateStatus("nonexistent-id", StatusRunning)
	if err == nil {
		t.Fatal("expected error for nonexistent ID, got nil")
	}
}

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

	// Verify it's gone
	_, err = store.GetByID(created.ID)
	if err == nil {
		t.Fatal("expected error after delete, got nil")
	}
}

func TestDelete_NotFound(t *testing.T) {
	store := newTestStore(t)
	err := store.Delete("nonexistent-id")
	if err == nil {
		t.Fatal("expected error for nonexistent ID, got nil")
	}
}
```

**Step 3: Run tests to verify they fail**

```bash
cd /Users/keithstruzzieri/projects/portfolio/flux-ml
go test ./internal/experiment/ -v -count=1
```

Expected: Tests fail because all methods are stubs returning nil.

**Step 4: Commit failing tests**

```bash
git add internal/experiment/
git commit -m "test: add failing tests for experiment CRUD operations (#17)"
```

---

### Task 4: Implement the experiment store

**Files:**
- Modify: `internal/experiment/store.go`

**Step 1: Implement all CRUD methods**

Replace the stub `store.go` with the full implementation:

```go
package experiment

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kstruzzieri/flux-ml/internal/database"
)

// Status constants for experiments.
const (
	StatusPending   = "pending"
	StatusRunning   = "running"
	StatusCompleted = "completed"
	StatusFailed    = "failed"
)

// validStatuses is the set of allowed status values.
var validStatuses = map[string]bool{
	StatusPending:   true,
	StatusRunning:   true,
	StatusCompleted: true,
	StatusFailed:    true,
}

// Experiment represents an ML training run.
type Experiment struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Config    string  `json:"config"`
	ParentID  *string `json:"parentId"`
	Status    string  `json:"status"`
	CreatedAt int64   `json:"createdAt"`
	UpdatedAt int64   `json:"updatedAt"`
}

// Store provides CRUD operations for experiments.
type Store struct {
	db *database.DB
}

// NewStore creates a new experiment store.
func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// Create creates a new experiment with the given name and config JSON.
func (s *Store) Create(name string, config string) (*Experiment, error) {
	if name == "" {
		return nil, fmt.Errorf("experiment name cannot be empty")
	}

	now := time.Now().Unix()
	id := uuid.New().String()

	_, err := s.db.Exec(
		`INSERT INTO experiments (id, name, config, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		id, name, config, StatusPending, now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("inserting experiment: %w", err)
	}

	return &Experiment{
		ID:        id,
		Name:      name,
		Config:    config,
		ParentID:  nil,
		Status:    StatusPending,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// List returns all experiments ordered by created_at descending.
func (s *Store) List() ([]Experiment, error) {
	rows, err := s.db.Query(
		`SELECT id, name, config, parent_id, status, created_at, updated_at
		 FROM experiments ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("querying experiments: %w", err)
	}
	defer rows.Close()

	experiments := []Experiment{}
	for rows.Next() {
		var exp Experiment
		var parentID sql.NullString
		if err := rows.Scan(&exp.ID, &exp.Name, &exp.Config, &parentID, &exp.Status, &exp.CreatedAt, &exp.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning experiment: %w", err)
		}
		if parentID.Valid {
			exp.ParentID = &parentID.String
		}
		experiments = append(experiments, exp)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating experiments: %w", err)
	}

	return experiments, nil
}

// GetByID returns a single experiment by ID.
func (s *Store) GetByID(id string) (*Experiment, error) {
	var exp Experiment
	var parentID sql.NullString
	err := s.db.QueryRow(
		`SELECT id, name, config, parent_id, status, created_at, updated_at
		 FROM experiments WHERE id = ?`, id,
	).Scan(&exp.ID, &exp.Name, &exp.Config, &parentID, &exp.Status, &exp.CreatedAt, &exp.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("experiment not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("querying experiment: %w", err)
	}
	if parentID.Valid {
		exp.ParentID = &parentID.String
	}
	return &exp, nil
}

// UpdateStatus changes the status of an experiment.
func (s *Store) UpdateStatus(id string, status string) error {
	if !validStatuses[status] {
		return fmt.Errorf("invalid status: %q", status)
	}

	now := time.Now().Unix()
	result, err := s.db.Exec(
		`UPDATE experiments SET status = ?, updated_at = ? WHERE id = ?`,
		status, now, id,
	)
	if err != nil {
		return fmt.Errorf("updating experiment status: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("checking rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("experiment not found: %s", id)
	}

	return nil
}

// Delete removes an experiment by ID.
func (s *Store) Delete(id string) error {
	result, err := s.db.Exec(`DELETE FROM experiments WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("deleting experiment: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("checking rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("experiment not found: %s", id)
	}

	return nil
}
```

**Step 2: Run tests to verify they pass**

```bash
cd /Users/keithstruzzieri/projects/portfolio/flux-ml
go test ./internal/experiment/ -v -count=1
```

Expected: All 11 tests PASS.

**Step 3: Commit**

```bash
git add internal/experiment/store.go
git commit -m "feat: implement experiment CRUD operations (#17)"
```

---

### Task 5: Wire up database in app.go

**Files:**
- Modify: `app.go`
- Modify: `main.go`

**Step 1: Add database and experiment store to App struct and startup**

Update `app.go` to open the database on startup and close on shutdown:

```go
// Add imports:
import (
	"github.com/kstruzzieri/flux-ml/internal/database"
	"github.com/kstruzzieri/flux-ml/internal/experiment"
)

// Update App struct:
type App struct {
	ctx         context.Context
	configPath  string
	db          *database.DB
	experiments *experiment.Store
}

// Update startup method:
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Open database
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	dbPath := filepath.Join(configDir, "Flux", "flux.db")
	db, err := database.Open(dbPath)
	if err != nil {
		// Log error but don't crash — the app can still show UI
		fmt.Fprintf(os.Stderr, "failed to open database: %v\n", err)
		return
	}
	a.db = db
	a.experiments = experiment.NewStore(db)
}

// Add shutdown method:
func (a *App) shutdown(ctx context.Context) {
	if a.db != nil {
		a.db.Close()
	}
}
```

**Step 2: Wire OnShutdown in main.go**

Add `OnShutdown` to the Wails options:

```go
// In main.go, add to the options.App:
OnShutdown: app.shutdown,
```

**Step 3: Verify the app compiles**

```bash
cd /Users/keithstruzzieri/projects/portfolio/flux-ml
go build ./...
```

Expected: Compiles without errors.

**Step 4: Commit**

```bash
git add app.go main.go
git commit -m "feat: wire database and experiment store into app lifecycle (#17)"
```

---

### Task 6: Add Wails-bound experiment API methods

**Files:**
- Create: `experiment_api.go`

**Step 1: Create experiment_api.go with thin pass-through methods**

```go
package main

import "github.com/kstruzzieri/flux-ml/internal/experiment"

// CreateExperiment creates a new experiment with the given name and config JSON.
func (a *App) CreateExperiment(name, config string) (*experiment.Experiment, error) {
	if a.experiments == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.experiments.Create(name, config)
}

// ListExperiments returns all experiments ordered by creation time (newest first).
func (a *App) ListExperiments() ([]experiment.Experiment, error) {
	if a.experiments == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.experiments.List()
}

// GetExperiment returns a single experiment by ID.
func (a *App) GetExperiment(id string) (*experiment.Experiment, error) {
	if a.experiments == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.experiments.GetByID(id)
}

// UpdateExperimentStatus changes the status of an experiment.
func (a *App) UpdateExperimentStatus(id, status string) error {
	if a.experiments == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.experiments.UpdateStatus(id, status)
}

// DeleteExperiment removes an experiment by ID.
func (a *App) DeleteExperiment(id string) error {
	if a.experiments == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.experiments.Delete(id)
}
```

**Step 2: Verify the app compiles**

```bash
cd /Users/keithstruzzieri/projects/portfolio/flux-ml
go build ./...
```

Expected: Compiles without errors.

**Step 3: Commit**

```bash
git add experiment_api.go
git commit -m "feat: add Wails-bound experiment API methods (#17)"
```

---

### Task 7: Run full test suite and verify no regressions

**Step 1: Run experiment store tests**

```bash
cd /Users/keithstruzzieri/projects/portfolio/flux-ml
go test ./internal/experiment/ -v -count=1
```

Expected: All 11 tests PASS.

**Step 2: Run database tests to verify no regressions**

```bash
go test ./internal/database/ -v -count=1
```

Expected: All 14 tests PASS.

**Step 3: Run all Go tests**

```bash
go test ./... -count=1
```

Expected: All tests pass across all packages.

**Step 4: Run frontend tests to verify no regressions**

```bash
cd /Users/keithstruzzieri/projects/portfolio/flux-ml/frontend && npm test -- --watchAll=false 2>&1 | tail -10
```

Expected: All existing frontend tests pass.

---

### Task 8: Update TDD document with passing results

**Files:**
- Modify: `docs/tdd/017-experiment-crud.md`

**Step 1: Run full experiment test suite and capture output**

```bash
cd /Users/keithstruzzieri/projects/portfolio/flux-ml
go test ./internal/experiment/ -v -count=1 2>&1
```

**Step 2: Update TDD document**

Update the TDD document with:
- Mark all acceptance criteria as checked `[x]`
- Add "Passing Test Results" section with the captured output
- Add "Implementation Summary" section listing files created/modified and design decisions

**Step 3: Commit**

```bash
git add docs/tdd/017-experiment-crud.md
git commit -m "docs: update TDD document with passing test results (#17)"
```

---

### Task 9: Final verification

**Step 1: Run all Go tests with race detector**

```bash
cd /Users/keithstruzzieri/projects/portfolio/flux-ml
go test ./... -count=1 -race
```

Expected: All tests pass, no race conditions.

**Step 2: Verify file structure**

```bash
find internal/experiment -type f | sort
```

Expected:
```
internal/experiment/store.go
internal/experiment/store_test.go
```

**Step 3: Verify clean git status**

```bash
git status
```

Expected: Clean working tree on `feature/17-experiment-crud`.
