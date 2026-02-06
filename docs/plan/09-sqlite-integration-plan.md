# SQLite Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up embedded SQLite database with migration system and full initial schema for Flux's experiment data storage.

**Architecture:** Pure Go SQLite via `modernc.org/sqlite`, embedded SQL migrations via `//go:embed`, connection management with WAL mode and foreign keys. The `internal/database` package is self-contained and tested in isolation — no Wails wiring in this issue.

**Tech Stack:** Go 1.23, `modernc.org/sqlite`, `database/sql`, `embed`, `testing`

**Design doc:** `docs/plan/05-technical-architecture.md` (SQLite Implementation section)

**TDD doc:** `docs/tdd/016-sqlite-integration.md` (created in Task 1)

**Issue:** #16 — SQLite integration in Go

**Branch:** `feature/16-sqlite-integration`

---

### Task 1: Create TDD document

**Files:**
- Create: `docs/tdd/016-sqlite-integration.md`

**Step 1: Write the TDD document**

Create the TDD document following the project pattern (see `docs/tdd/013-base-components.md` for format). Include:

- Issue summary: Set up SQLite database for experiment data storage
- Acceptance criteria from issue #16:
  - [ ] SQLite database created on first run
  - [ ] Connection works
  - [ ] Basic queries execute
  - [ ] Migration system works
  - [ ] All schema tables created
  - [ ] Foreign key enforcement works
  - [ ] FTS5 full-text search works
- Rationale: Foundation for all backend data operations (issues #17–20)
- All 16 failing tests listed (see design doc test plan)
- Expected failing output

**Step 2: Commit**

```bash
git add docs/tdd/016-sqlite-integration.md
git commit -m "docs: add TDD document for SQLite integration (#16)"
```

---

### Task 2: Add SQLite dependency

**Files:**
- Modify: `go.mod`
- Modify: `go.sum`

**Step 1: Install the modernc.org/sqlite driver**

```bash
cd /Users/keithstruzzieri/projects/portfolio/flux-ml
go get modernc.org/sqlite
```

This pulls in the pure-Go SQLite driver. The import path for the driver registration is `modernc.org/sqlite` and its `database/sql` driver name is `"sqlite"`.

**Step 2: Verify it installed**

```bash
grep modernc go.mod
```

Expected: A line with `modernc.org/sqlite` and version.

**Step 3: Commit**

```bash
git add go.mod go.sum
git commit -m "deps: add modernc.org/sqlite pure-Go driver (#16)"
```

---

### Task 3: Write the initial schema migration

**Files:**
- Create: `internal/database/migrations/001_initial_schema.sql`

**Step 1: Write the migration SQL**

Reference: `docs/plan/05-technical-architecture.md` lines 31–88 for the schema.

```sql
-- Experiments
CREATE TABLE experiments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config JSON,
    parent_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES experiments(id)
);

CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_created_at ON experiments(created_at);

-- Event sourcing
CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL,
    data JSON,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);

CREATE INDEX idx_events_experiment_id ON events(experiment_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_timestamp ON events(timestamp);

-- Metrics (denormalized for fast queries)
CREATE TABLE metrics (
    experiment_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    name TEXT NOT NULL,
    value REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    PRIMARY KEY (experiment_id, step, name),
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);

CREATE INDEX idx_metrics_experiment_name ON metrics(experiment_id, name);

-- Reward signals (specialized for RM work)
CREATE TABLE reward_signals (
    experiment_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    component TEXT NOT NULL,
    value REAL NOT NULL,
    distribution JSON,
    PRIMARY KEY (experiment_id, step, component),
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);

CREATE INDEX idx_reward_signals_experiment ON reward_signals(experiment_id);

-- Alerts
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    type TEXT NOT NULL,
    step INTEGER NOT NULL,
    confidence REAL NOT NULL,
    data JSON,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);

CREATE INDEX idx_alerts_experiment_id ON alerts(experiment_id);
CREATE INDEX idx_alerts_type ON alerts(type);
```

Note: The FTS5 `logs` table is NOT included in this file. FTS5 `CREATE VIRTUAL TABLE` cannot run inside a transaction in some SQLite builds. It will be handled separately in the migration runner.

**Step 2: Create the FTS5 migration file**

Create: `internal/database/migrations/002_logs_fts5.sql`

```sql
-- Full-text search on logs (FTS5)
-- This migration runs outside a transaction because CREATE VIRTUAL TABLE
-- is not transactional in all SQLite builds.
-- META:no_transaction
CREATE VIRTUAL TABLE IF NOT EXISTS logs USING fts5(
    experiment_id,
    content,
    level,
    category
);
```

The `-- META:no_transaction` comment is a convention the migration runner will look for to skip wrapping this in a transaction.

**Step 3: Commit**

```bash
git add internal/database/migrations/
git commit -m "schema: add initial migration with all tables (#16)"
```

---

### Task 4: Write failing tests for migration system

**Files:**
- Create: `internal/database/migrate.go` (minimal stub — just enough for compilation)
- Create: `internal/database/migrate_test.go`

**Step 1: Create the minimal migrate.go stub**

```go
package database

import (
	"database/sql"
	"embed"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Migrate applies all pending database migrations.
func (db *DB) Migrate() error {
	return nil // stub
}
```

This won't work yet — it just compiles. The `DB` type doesn't exist either, so we also need the database.go stub (Task 5 creates it, but we need a minimal one here for compilation).

**Step 2: Create the minimal database.go stub**

```go
package database

import "database/sql"

// DB wraps a sql.DB connection with Flux-specific functionality.
type DB struct {
	*sql.DB
	path string
}
```

**Step 3: Write migrate_test.go with all migration and schema tests**

```go
package database

import (
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// helper: open a raw sql.DB and run Migrate() for testing
func openTestDB(t *testing.T) *DB {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	sqlDB, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	t.Cleanup(func() { sqlDB.Close() })
	db := &DB{DB: sqlDB, path: path}
	if err := db.Migrate(); err != nil {
		t.Fatalf("migration failed: %v", err)
	}
	return db
}

func TestMigrate_CreatesSchemaTable(t *testing.T) {
	db := openTestDB(t)
	var name string
	err := db.QueryRow(
		"SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
	).Scan(&name)
	if err != nil {
		t.Fatalf("schema_migrations table not found: %v", err)
	}
}

func TestMigrate_AppliesAllMigrations(t *testing.T) {
	db := openTestDB(t)
	tables := []string{"experiments", "events", "metrics", "reward_signals", "alerts", "logs"}
	for _, table := range tables {
		var name string
		err := db.QueryRow(
			"SELECT name FROM sqlite_master WHERE type IN ('table', 'shadow') AND name=?", table,
		).Scan(&name)
		if err != nil {
			t.Errorf("table %q not found: %v", table, err)
		}
	}
}

func TestMigrate_RecordsVersions(t *testing.T) {
	db := openTestDB(t)
	rows, err := db.Query("SELECT version FROM schema_migrations ORDER BY version")
	if err != nil {
		t.Fatalf("failed to query schema_migrations: %v", err)
	}
	defer rows.Close()
	var versions []string
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			t.Fatalf("scan error: %v", err)
		}
		versions = append(versions, v)
	}
	expected := []string{"001_initial_schema", "002_logs_fts5"}
	if len(versions) != len(expected) {
		t.Fatalf("expected %d versions, got %d: %v", len(expected), len(versions), versions)
	}
	for i, v := range versions {
		if v != expected[i] {
			t.Errorf("version[%d] = %q, want %q", i, v, expected[i])
		}
	}
}

func TestMigrate_Idempotent(t *testing.T) {
	db := openTestDB(t)
	// Run migrate a second time — should not error
	if err := db.Migrate(); err != nil {
		t.Fatalf("second migration call failed: %v", err)
	}
	// Verify still exactly 2 versions recorded
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM schema_migrations").Scan(&count); err != nil {
		t.Fatalf("count query failed: %v", err)
	}
	if count != 2 {
		t.Errorf("expected 2 migration versions, got %d", count)
	}
}

func TestSchema_ExperimentsTable(t *testing.T) {
	db := openTestDB(t)
	_, err := db.Exec(
		`INSERT INTO experiments (id, name, config, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		"exp-001", "reward-model-v1", `{"learning_rate": 0.001, "batch_size": 32}`,
		"running", 1706745600, 1706745600,
	)
	if err != nil {
		t.Fatalf("insert failed: %v", err)
	}
	var name, config, status string
	err = db.QueryRow("SELECT name, config, status FROM experiments WHERE id = ?", "exp-001").
		Scan(&name, &config, &status)
	if err != nil {
		t.Fatalf("query failed: %v", err)
	}
	if name != "reward-model-v1" {
		t.Errorf("name = %q, want %q", name, "reward-model-v1")
	}
	if status != "running" {
		t.Errorf("status = %q, want %q", status, "running")
	}
}

func TestSchema_MetricsTable(t *testing.T) {
	db := openTestDB(t)
	// Need an experiment first (FK)
	db.Exec(
		`INSERT INTO experiments (id, name, status, created_at, updated_at)
		 VALUES ('exp-001', 'test', 'running', 1706745600, 1706745600)`,
	)
	_, err := db.Exec(
		`INSERT INTO metrics (experiment_id, step, name, value, timestamp)
		 VALUES (?, ?, ?, ?, ?)`,
		"exp-001", 100, "loss", 0.234, 1706745600,
	)
	if err != nil {
		t.Fatalf("insert failed: %v", err)
	}
	var value float64
	err = db.QueryRow(
		"SELECT value FROM metrics WHERE experiment_id = ? AND step = ? AND name = ?",
		"exp-001", 100, "loss",
	).Scan(&value)
	if err != nil {
		t.Fatalf("query failed: %v", err)
	}
	if value != 0.234 {
		t.Errorf("value = %f, want 0.234", value)
	}
}

func TestSchema_RewardSignalsTable(t *testing.T) {
	db := openTestDB(t)
	db.Exec(
		`INSERT INTO experiments (id, name, status, created_at, updated_at)
		 VALUES ('exp-001', 'test', 'running', 1706745600, 1706745600)`,
	)
	dist := `{"buckets": [0.1, 0.2, 0.3], "counts": [10, 20, 15]}`
	_, err := db.Exec(
		`INSERT INTO reward_signals (experiment_id, step, component, value, distribution)
		 VALUES (?, ?, ?, ?, ?)`,
		"exp-001", 100, "helpfulness", 0.89, dist,
	)
	if err != nil {
		t.Fatalf("insert failed: %v", err)
	}
	var component string
	var value float64
	var distribution string
	err = db.QueryRow(
		"SELECT component, value, distribution FROM reward_signals WHERE experiment_id = ? AND step = ?",
		"exp-001", 100,
	).Scan(&component, &value, &distribution)
	if err != nil {
		t.Fatalf("query failed: %v", err)
	}
	if component != "helpfulness" {
		t.Errorf("component = %q, want %q", component, "helpfulness")
	}
}

func TestSchema_EventsTable(t *testing.T) {
	db := openTestDB(t)
	db.Exec(
		`INSERT INTO experiments (id, name, status, created_at, updated_at)
		 VALUES ('exp-001', 'test', 'running', 1706745600, 1706745600)`,
	)
	_, err := db.Exec(
		`INSERT INTO events (experiment_id, timestamp, type, data)
		 VALUES (?, ?, ?, ?)`,
		"exp-001", 1706745600, "metric",
		`{"loss": 0.234, "reward": 0.89}`,
	)
	if err != nil {
		t.Fatalf("insert failed: %v", err)
	}
	var eventType, data string
	err = db.QueryRow("SELECT type, data FROM events WHERE experiment_id = ?", "exp-001").
		Scan(&eventType, &data)
	if err != nil {
		t.Fatalf("query failed: %v", err)
	}
	if eventType != "metric" {
		t.Errorf("type = %q, want %q", eventType, "metric")
	}
}

func TestSchema_AlertsTable(t *testing.T) {
	db := openTestDB(t)
	db.Exec(
		`INSERT INTO experiments (id, name, status, created_at, updated_at)
		 VALUES ('exp-001', 'test', 'running', 1706745600, 1706745600)`,
	)
	_, err := db.Exec(
		`INSERT INTO alerts (experiment_id, type, step, confidence, data, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		"exp-001", "length_gaming", 6200, 0.73,
		`{"correlation": 0.73, "threshold": 0.5}`, 1706745600,
	)
	if err != nil {
		t.Fatalf("insert failed: %v", err)
	}
	var alertType string
	var confidence float64
	err = db.QueryRow("SELECT type, confidence FROM alerts WHERE experiment_id = ?", "exp-001").
		Scan(&alertType, &confidence)
	if err != nil {
		t.Fatalf("query failed: %v", err)
	}
	if alertType != "length_gaming" {
		t.Errorf("type = %q, want %q", alertType, "length_gaming")
	}
}

func TestSchema_ForeignKeyEnforcement(t *testing.T) {
	db := openTestDB(t)
	// Enable foreign keys (should already be on, but ensure for this test)
	db.Exec("PRAGMA foreign_keys = ON")
	// Insert event with non-existent experiment_id — should fail
	_, err := db.Exec(
		`INSERT INTO events (experiment_id, timestamp, type, data)
		 VALUES (?, ?, ?, ?)`,
		"nonexistent", 1706745600, "metric", `{}`,
	)
	if err == nil {
		t.Fatal("expected foreign key violation error, got nil")
	}
}

func TestSchema_LogsFTS(t *testing.T) {
	db := openTestDB(t)
	_, err := db.Exec(
		`INSERT INTO logs (experiment_id, content, level, category)
		 VALUES (?, ?, ?, ?)`,
		"exp-001", "Training started with learning_rate=0.001", "INFO", "training",
	)
	if err != nil {
		t.Fatalf("insert failed: %v", err)
	}
	var content string
	err = db.QueryRow(
		"SELECT content FROM logs WHERE logs MATCH ?", "learning_rate",
	).Scan(&content)
	if err != nil {
		t.Fatalf("FTS query failed: %v", err)
	}
	if content == "" {
		t.Error("expected non-empty content from FTS match")
	}
}
```

**Step 4: Run tests to verify they fail**

```bash
cd /Users/keithstruzzieri/projects/portfolio/flux-ml
go test ./internal/database/ -v -count=1
```

Expected: Tests fail because `Migrate()` is a stub returning nil (tables don't exist).

**Step 5: Commit failing tests**

```bash
git add internal/database/
git commit -m "test: add failing tests for migration system and schema (#16)"
```

---

### Task 5: Write failing tests for connection management

**Files:**
- Create: `internal/database/database_test.go`

**Step 1: Write database_test.go**

```go
package database

import (
	"os"
	"path/filepath"
	"testing"
)

func TestOpen_CreatesDatabase(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	defer db.Close()
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Fatal("database file was not created")
	}
}

func TestOpen_CreatesParentDirectory(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "nested", "dirs", "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	defer db.Close()
	if _, err := os.Stat(filepath.Dir(path)); os.IsNotExist(err) {
		t.Fatal("parent directories were not created")
	}
}

func TestOpen_PragmasApplied(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	defer db.Close()

	// Check WAL mode
	var journalMode string
	if err := db.QueryRow("PRAGMA journal_mode").Scan(&journalMode); err != nil {
		t.Fatalf("failed to query journal_mode: %v", err)
	}
	if journalMode != "wal" {
		t.Errorf("journal_mode = %q, want %q", journalMode, "wal")
	}

	// Check foreign keys
	var foreignKeys int
	if err := db.QueryRow("PRAGMA foreign_keys").Scan(&foreignKeys); err != nil {
		t.Fatalf("failed to query foreign_keys: %v", err)
	}
	if foreignKeys != 1 {
		t.Errorf("foreign_keys = %d, want 1", foreignKeys)
	}

	// Check busy timeout
	var busyTimeout int
	if err := db.QueryRow("PRAGMA busy_timeout").Scan(&busyTimeout); err != nil {
		t.Fatalf("failed to query busy_timeout: %v", err)
	}
	if busyTimeout != 5000 {
		t.Errorf("busy_timeout = %d, want 5000", busyTimeout)
	}
}

func TestOpen_RunsMigrations(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	defer db.Close()

	// Verify experiments table exists (representative check)
	var name string
	err = db.QueryRow(
		"SELECT name FROM sqlite_master WHERE type='table' AND name='experiments'",
	).Scan(&name)
	if err != nil {
		t.Fatal("experiments table not found after Open — migrations did not run")
	}
}

func TestClose(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("Close failed: %v", err)
	}
}
```

**Step 2: Run tests to verify they fail**

```bash
go test ./internal/database/ -v -count=1 -run "TestOpen|TestClose"
```

Expected: Fail because `Open()` function doesn't exist yet.

**Step 3: Commit failing tests**

```bash
git add internal/database/database_test.go
git commit -m "test: add failing tests for database connection management (#16)"
```

---

### Task 6: Implement the migration system

**Files:**
- Modify: `internal/database/migrate.go`

**Step 1: Implement Migrate()**

Replace the stub `migrate.go` with the full implementation:

```go
package database

import (
	"database/sql"
	"embed"
	"fmt"
	"sort"
	"strings"
	"time"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Migrate applies all pending database migrations.
func (db *DB) Migrate() error {
	// Create schema_migrations table
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at INTEGER NOT NULL
		)
	`)
	if err != nil {
		return fmt.Errorf("creating schema_migrations: %w", err)
	}

	// Read all migration files
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("reading migrations dir: %w", err)
	}

	// Sort by name (ensures order: 001_, 002_, etc.)
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		version := strings.TrimSuffix(name, ".sql")

		// Check if already applied
		var exists string
		err := db.QueryRow(
			"SELECT version FROM schema_migrations WHERE version = ?", version,
		).Scan(&exists)
		if err == nil {
			continue // already applied
		}
		if err != sql.ErrNoRows {
			return fmt.Errorf("checking migration %s: %w", version, err)
		}

		// Read migration SQL
		content, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return fmt.Errorf("reading migration %s: %w", name, err)
		}

		sqlStr := string(content)

		// Check for no_transaction meta flag (needed for FTS5)
		if strings.Contains(sqlStr, "META:no_transaction") {
			if err := db.execMigrationNoTx(version, sqlStr); err != nil {
				return err
			}
		} else {
			if err := db.execMigrationTx(version, sqlStr); err != nil {
				return err
			}
		}
	}

	return nil
}

func (db *DB) execMigrationTx(version, sqlStr string) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx for %s: %w", version, err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(sqlStr); err != nil {
		return fmt.Errorf("executing migration %s: %w", version, err)
	}

	if _, err := tx.Exec(
		"INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
		version, time.Now().Unix(),
	); err != nil {
		return fmt.Errorf("recording migration %s: %w", version, err)
	}

	return tx.Commit()
}

func (db *DB) execMigrationNoTx(version, sqlStr string) error {
	if _, err := db.Exec(sqlStr); err != nil {
		return fmt.Errorf("executing migration %s: %w", version, err)
	}

	if _, err := db.Exec(
		"INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
		version, time.Now().Unix(),
	); err != nil {
		return fmt.Errorf("recording migration %s: %w", version, err)
	}

	return nil
}
```

**Step 2: Run migration tests**

```bash
go test ./internal/database/ -v -count=1 -run "TestMigrate|TestSchema"
```

Expected: All migration and schema tests PASS.

**Step 3: Commit**

```bash
git add internal/database/migrate.go
git commit -m "feat: implement migration system with embedded SQL files (#16)"
```

---

### Task 7: Implement connection management

**Files:**
- Modify: `internal/database/database.go`

**Step 1: Implement Open() and Close()**

Replace the stub `database.go` with the full implementation:

```go
package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// DB wraps a sql.DB connection with Flux-specific functionality.
type DB struct {
	*sql.DB
	path string
}

// Open creates or opens a SQLite database at the given path.
// It creates parent directories, applies pragmas, and runs migrations.
func Open(path string) (*DB, error) {
	// Create parent directory
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("creating database directory: %w", err)
	}

	// Open SQLite connection
	sqlDB, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}

	// Apply pragmas
	pragmas := []string{
		"PRAGMA journal_mode=WAL",
		"PRAGMA foreign_keys=ON",
		"PRAGMA busy_timeout=5000",
	}
	for _, pragma := range pragmas {
		if _, err := sqlDB.Exec(pragma); err != nil {
			sqlDB.Close()
			return nil, fmt.Errorf("applying %s: %w", pragma, err)
		}
	}

	db := &DB{DB: sqlDB, path: path}

	// Run migrations
	if err := db.Migrate(); err != nil {
		sqlDB.Close()
		return nil, fmt.Errorf("running migrations: %w", err)
	}

	return db, nil
}

// Path returns the filesystem path to the database file.
func (db *DB) Path() string {
	return db.path
}
```

**Step 2: Run all tests**

```bash
go test ./internal/database/ -v -count=1
```

Expected: All 16 tests PASS.

**Step 3: Commit**

```bash
git add internal/database/database.go
git commit -m "feat: implement database connection management with pragmas (#16)"
```

---

### Task 8: Update TDD document with passing results

**Files:**
- Modify: `docs/tdd/016-sqlite-integration.md`

**Step 1: Run full test suite and capture output**

```bash
go test ./internal/database/ -v -count=1 2>&1
```

**Step 2: Update TDD document**

Update the TDD document with:
- Mark all acceptance criteria as checked `[x]`
- Add "Passing Test Results" section with the captured output
- Add "Implementation Summary" section listing files created/modified and design decisions

**Step 3: Commit**

```bash
git add docs/tdd/016-sqlite-integration.md
git commit -m "docs: update TDD document with passing test results (#16)"
```

---

### Task 9: Final verification

**Step 1: Run full test suite one final time**

```bash
go test ./internal/database/ -v -count=1 -race
```

Expected: All tests pass, no race conditions.

**Step 2: Verify file structure**

```bash
find internal/ -type f | sort
```

Expected:
```
internal/database/database.go
internal/database/database_test.go
internal/database/migrate.go
internal/database/migrate_test.go
internal/database/migrations/001_initial_schema.sql
internal/database/migrations/002_logs_fts5.sql
```

**Step 3: Run existing frontend tests to ensure no regressions**

```bash
cd frontend && npm test -- --watchAll=false 2>&1 | tail -5
```

Expected: All existing tests still pass.

**Step 4: Final commit if any cleanup needed, then verify clean git status**

```bash
git status
```

Expected: Clean working tree on `feature/16-sqlite-integration`.
