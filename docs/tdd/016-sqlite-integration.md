# TDD: Issue #16 - SQLite Integration

## Issue Summary
Set up SQLite database for experiment data storage using `modernc.org/sqlite` (pure Go driver). This is the first backend package (`internal/database`), providing connection management, a migration system, and the full initial schema for all experiment-related tables.

## Acceptance Criteria
- [ ] SQLite database created on first run
- [ ] Connection works
- [ ] Basic queries execute
- [ ] Migration system works
- [ ] All schema tables created (experiments, events, metrics, reward_signals, alerts, logs)
- [ ] Foreign key enforcement works
- [ ] FTS5 full-text search works

## Rationale
This is the foundation for all backend data operations (issues #17-20). Without a working database layer, no experiment data can be persisted, queried, or streamed to the frontend. The design choices are:
1. **Pure Go driver** - `modernc.org/sqlite` requires no CGO, simplifying cross-compilation for all Wails targets
2. **WAL mode** - Write-Ahead Logging enables concurrent reads during writes, critical for streaming metrics while training runs
3. **Migration system** - Versioned, idempotent migrations allow safe schema evolution as the project grows
4. **FTS5 full-text search** - Enables fast log searching across experiment runs without external search infrastructure

## Failing Tests

### Test 1: TestOpen_CreatesDatabase
Opening a database must create the SQLite file on disk if it does not already exist.
```go
func TestOpen_CreatesDatabase(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		t.Fatal("database file was not created")
	}
}
```

### Test 2: TestOpen_CreatesParentDirectory
When the database path includes directories that do not exist, Open must create them automatically.
```go
func TestOpen_CreatesParentDirectory(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "nested", "deep", "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		t.Fatal("database file was not created in nested directory")
	}
}
```

### Test 3: TestOpen_PragmasApplied
Critical SQLite pragmas must be applied on every connection: WAL journal mode for concurrent reads, foreign keys ON for referential integrity, and busy timeout to handle write contention.
```go
func TestOpen_PragmasApplied(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	tests := []struct {
		name   string
		pragma string
		want   string
	}{
		{"journal_mode", "PRAGMA journal_mode", "wal"},
		{"foreign_keys", "PRAGMA foreign_keys", "1"},
		{"busy_timeout", "PRAGMA busy_timeout", "5000"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got string
			err := db.DB().QueryRow(tt.pragma).Scan(&got)
			if err != nil {
				t.Fatalf("QueryRow(%q) error = %v", tt.pragma, err)
			}
			if got != tt.want {
				t.Errorf("%s = %q, want %q", tt.pragma, got, tt.want)
			}
		})
	}
}
```

### Test 4: TestOpen_RunsMigrations
Opening a fresh database must automatically run all migrations, creating every schema table.
```go
func TestOpen_RunsMigrations(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	tables := []string{
		"experiments",
		"events",
		"metrics",
		"reward_signals",
		"alerts",
		"logs",
	}

	for _, table := range tables {
		t.Run(table, func(t *testing.T) {
			query := "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
			var name string
			err := db.DB().QueryRow(query, table).Scan(&name)
			if err != nil {
				t.Fatalf("table %q does not exist: %v", table, err)
			}
		})
	}
}
```

### Test 5: TestClose
Closing the database must release all resources without error.
```go
func TestClose(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}

	if err := db.Close(); err != nil {
		t.Fatalf("Close() error = %v", err)
	}
}
```

### Test 6: TestMigrate_CreatesSchemaTable
The migration system must track applied versions in a schema_migrations table.
```go
func TestMigrate_CreatesSchemaTable(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	query := "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'"
	var name string
	err = db.DB().QueryRow(query).Scan(&name)
	if err != nil {
		t.Fatal("schema_migrations table does not exist")
	}
}
```

### Test 7: TestMigrate_AppliesAllMigrations
After migration, all 6 application tables must exist in the database.
```go
func TestMigrate_AppliesAllMigrations(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	// Query all user tables (exclude sqlite internals and schema_migrations)
	rows, err := db.DB().Query(
		"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_migrations' ORDER BY name",
	)
	if err != nil {
		t.Fatalf("Query error: %v", err)
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			t.Fatalf("Scan error: %v", err)
		}
		tables = append(tables, name)
	}

	want := []string{"alerts", "events", "experiments", "logs", "metrics", "reward_signals"}
	if len(tables) != len(want) {
		t.Fatalf("got %d tables %v, want %d tables %v", len(tables), tables, len(want), want)
	}
	for i, got := range tables {
		if got != want[i] {
			t.Errorf("table[%d] = %q, want %q", i, got, want[i])
		}
	}
}
```

### Test 8: TestMigrate_RecordsVersions
Each applied migration must be recorded with its version identifier in schema_migrations.
```go
func TestMigrate_RecordsVersions(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	rows, err := db.DB().Query("SELECT version FROM schema_migrations ORDER BY version")
	if err != nil {
		t.Fatalf("Query error: %v", err)
	}
	defer rows.Close()

	var versions []string
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			t.Fatalf("Scan error: %v", err)
		}
		versions = append(versions, v)
	}

	want := []string{"001_initial_schema", "002_logs_fts5"}
	if len(versions) != len(want) {
		t.Fatalf("got %d versions %v, want %d versions %v", len(versions), versions, len(want), want)
	}
	for i, got := range versions {
		if got != want[i] {
			t.Errorf("version[%d] = %q, want %q", i, got, want[i])
		}
	}
}
```

### Test 9: TestMigrate_Idempotent
Running migrations multiple times must not produce errors or duplicate data. This ensures safe restarts.
```go
func TestMigrate_Idempotent(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	// Run Migrate a second time (first run happens inside Open)
	if err := database.Migrate(db.DB()); err != nil {
		t.Fatalf("second Migrate() error = %v", err)
	}

	// Verify no duplicate versions
	var count int
	err = db.DB().QueryRow("SELECT COUNT(*) FROM schema_migrations").Scan(&count)
	if err != nil {
		t.Fatalf("QueryRow error: %v", err)
	}
	if count != 2 {
		t.Errorf("schema_migrations has %d rows, want 2", count)
	}
}
```

### Test 10: TestSchema_ExperimentsTable
The experiments table must store experiment metadata including a JSON config column for flexible hyperparameter storage.
```go
func TestSchema_ExperimentsTable(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	_, err = db.DB().Exec(`
		INSERT INTO experiments (id, name, status, config, created_at, updated_at)
		VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
		"exp-001", "test-experiment", "running", `{"learning_rate": 0.001, "epochs": 10}`,
	)
	if err != nil {
		t.Fatalf("INSERT error: %v", err)
	}

	var name, status, config string
	err = db.DB().QueryRow("SELECT name, status, config FROM experiments WHERE id = ?", "exp-001").
		Scan(&name, &status, &config)
	if err != nil {
		t.Fatalf("SELECT error: %v", err)
	}

	if name != "test-experiment" {
		t.Errorf("name = %q, want %q", name, "test-experiment")
	}
	if status != "running" {
		t.Errorf("status = %q, want %q", status, "running")
	}
	if config != `{"learning_rate": 0.001, "epochs": 10}` {
		t.Errorf("config = %q, want JSON object", config)
	}
}
```

### Test 11: TestSchema_MetricsTable
The metrics table must enforce a composite primary key of (experiment_id, step, name) to prevent duplicate metric entries per training step.
```go
func TestSchema_MetricsTable(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	// Insert parent experiment
	_, err = db.DB().Exec(`
		INSERT INTO experiments (id, name, status, config, created_at, updated_at)
		VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
		"exp-001", "test", "running", "{}",
	)
	if err != nil {
		t.Fatalf("INSERT experiment error: %v", err)
	}

	// Insert a metric
	_, err = db.DB().Exec(`
		INSERT INTO metrics (experiment_id, step, name, value, timestamp)
		VALUES (?, ?, ?, ?, datetime('now'))`,
		"exp-001", 1, "loss", 2.345,
	)
	if err != nil {
		t.Fatalf("INSERT metric error: %v", err)
	}

	// Duplicate composite key must fail
	_, err = db.DB().Exec(`
		INSERT INTO metrics (experiment_id, step, name, value, timestamp)
		VALUES (?, ?, ?, ?, datetime('now'))`,
		"exp-001", 1, "loss", 1.234,
	)
	if err == nil {
		t.Fatal("expected error on duplicate composite key, got nil")
	}

	// Different step is allowed
	_, err = db.DB().Exec(`
		INSERT INTO metrics (experiment_id, step, name, value, timestamp)
		VALUES (?, ?, ?, ?, datetime('now'))`,
		"exp-001", 2, "loss", 1.890,
	)
	if err != nil {
		t.Fatalf("INSERT different step error: %v", err)
	}
}
```

### Test 12: TestSchema_RewardSignalsTable
The reward_signals table must store per-step reward component breakdowns with a JSON distribution column for histogram data.
```go
func TestSchema_RewardSignalsTable(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	// Insert parent experiment
	_, err = db.DB().Exec(`
		INSERT INTO experiments (id, name, status, config, created_at, updated_at)
		VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
		"exp-001", "test", "running", "{}",
	)
	if err != nil {
		t.Fatalf("INSERT experiment error: %v", err)
	}

	distribution := `{"buckets": [0.1, 0.2, 0.5, 0.15, 0.05]}`
	_, err = db.DB().Exec(`
		INSERT INTO reward_signals (experiment_id, step, component, value, weight, distribution, timestamp)
		VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
		"exp-001", 1, "helpfulness", 0.85, 1.0, distribution,
	)
	if err != nil {
		t.Fatalf("INSERT error: %v", err)
	}

	var component string
	var value, weight float64
	var dist string
	err = db.DB().QueryRow(
		"SELECT component, value, weight, distribution FROM reward_signals WHERE experiment_id = ? AND step = ?",
		"exp-001", 1,
	).Scan(&component, &value, &weight, &dist)
	if err != nil {
		t.Fatalf("SELECT error: %v", err)
	}

	if component != "helpfulness" {
		t.Errorf("component = %q, want %q", component, "helpfulness")
	}
	if value != 0.85 {
		t.Errorf("value = %f, want 0.85", value)
	}
	if dist != distribution {
		t.Errorf("distribution = %q, want %q", dist, distribution)
	}
}
```

### Test 13: TestSchema_EventsTable
The events table must store experiment lifecycle events with a foreign key reference to the experiments table.
```go
func TestSchema_EventsTable(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	// Insert parent experiment
	_, err = db.DB().Exec(`
		INSERT INTO experiments (id, name, status, config, created_at, updated_at)
		VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
		"exp-001", "test", "running", "{}",
	)
	if err != nil {
		t.Fatalf("INSERT experiment error: %v", err)
	}

	_, err = db.DB().Exec(`
		INSERT INTO events (experiment_id, type, data, timestamp)
		VALUES (?, ?, ?, datetime('now'))`,
		"exp-001", "checkpoint_saved", `{"path": "/checkpoints/step-1000"}`,
	)
	if err != nil {
		t.Fatalf("INSERT event error: %v", err)
	}

	var eventType, data string
	err = db.DB().QueryRow(
		"SELECT type, data FROM events WHERE experiment_id = ?", "exp-001",
	).Scan(&eventType, &data)
	if err != nil {
		t.Fatalf("SELECT error: %v", err)
	}

	if eventType != "checkpoint_saved" {
		t.Errorf("type = %q, want %q", eventType, "checkpoint_saved")
	}
}
```

### Test 14: TestSchema_AlertsTable
The alerts table must store detected reward hacking patterns and anomalies for each experiment.
```go
func TestSchema_AlertsTable(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	// Insert parent experiment
	_, err = db.DB().Exec(`
		INSERT INTO experiments (id, name, status, config, created_at, updated_at)
		VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
		"exp-001", "test", "running", "{}",
	)
	if err != nil {
		t.Fatalf("INSERT experiment error: %v", err)
	}

	_, err = db.DB().Exec(`
		INSERT INTO alerts (experiment_id, type, severity, message, details, step, timestamp)
		VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
		"exp-001", "length_gaming", "warning",
		"Reward-length correlation exceeds threshold",
		`{"correlation": 0.92, "threshold": 0.8}`,
		500,
	)
	if err != nil {
		t.Fatalf("INSERT alert error: %v", err)
	}

	var alertType, severity, message string
	var step int
	err = db.DB().QueryRow(
		"SELECT type, severity, message, step FROM alerts WHERE experiment_id = ?", "exp-001",
	).Scan(&alertType, &severity, &message, &step)
	if err != nil {
		t.Fatalf("SELECT error: %v", err)
	}

	if alertType != "length_gaming" {
		t.Errorf("type = %q, want %q", alertType, "length_gaming")
	}
	if severity != "warning" {
		t.Errorf("severity = %q, want %q", severity, "warning")
	}
	if step != 500 {
		t.Errorf("step = %d, want 500", step)
	}
}
```

### Test 15: TestSchema_ForeignKeyEnforcement
Inserting a row that references a non-existent experiment must fail when foreign keys are enabled.
```go
func TestSchema_ForeignKeyEnforcement(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	// Attempt to insert an event referencing a non-existent experiment
	_, err = db.DB().Exec(`
		INSERT INTO events (experiment_id, type, data, timestamp)
		VALUES (?, ?, ?, datetime('now'))`,
		"non-existent-exp", "start", "{}",
	)
	if err == nil {
		t.Fatal("expected foreign key violation error, got nil")
	}
}
```

### Test 16: TestSchema_LogsFTS
Full-text search on the logs table must return results matching the search query, enabling fast log searching across experiments.
```go
func TestSchema_LogsFTS(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	defer db.Close()

	// Insert parent experiment
	_, err = db.DB().Exec(`
		INSERT INTO experiments (id, name, status, config, created_at, updated_at)
		VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
		"exp-001", "test", "running", "{}",
	)
	if err != nil {
		t.Fatalf("INSERT experiment error: %v", err)
	}

	// Insert log entries
	logEntries := []struct {
		level   string
		message string
	}{
		{"INFO", "Training started with learning rate 0.001"},
		{"WARNING", "Gradient norm exceeded threshold at step 500"},
		{"INFO", "Checkpoint saved at step 1000"},
		{"ERROR", "CUDA out of memory during forward pass"},
	}

	for _, entry := range logEntries {
		_, err = db.DB().Exec(`
			INSERT INTO logs (experiment_id, level, message, timestamp)
			VALUES (?, ?, ?, datetime('now'))`,
			"exp-001", entry.level, entry.message,
		)
		if err != nil {
			t.Fatalf("INSERT log error: %v", err)
		}
	}

	// Full-text search for "gradient"
	var message string
	err = db.DB().QueryRow(
		"SELECT message FROM logs_fts WHERE logs_fts MATCH ?", "gradient",
	).Scan(&message)
	if err != nil {
		t.Fatalf("FTS query error: %v", err)
	}

	if message != "Gradient norm exceeded threshold at step 500" {
		t.Errorf("FTS result = %q, want message containing 'Gradient'", message)
	}

	// Search for "CUDA" should find the error log
	err = db.DB().QueryRow(
		"SELECT message FROM logs_fts WHERE logs_fts MATCH ?", "CUDA",
	).Scan(&message)
	if err != nil {
		t.Fatalf("FTS query for CUDA error: %v", err)
	}

	if message != "CUDA out of memory during forward pass" {
		t.Errorf("FTS result = %q, want CUDA error message", message)
	}
}
```

## Expected Output (Failing)
```
--- FAIL: TestOpen_CreatesDatabase (0.00s)
    database_test.go:10: Open() error = undefined: database.Open
--- FAIL: TestOpen_CreatesParentDirectory (0.00s)
    database_test.go:22: Open() error = undefined: database.Open
--- FAIL: TestOpen_PragmasApplied (0.00s)
    database_test.go:34: Open() error = undefined: database.Open
--- FAIL: TestOpen_RunsMigrations (0.00s)
    database_test.go:60: Open() error = undefined: database.Open
--- FAIL: TestClose (0.00s)
    database_test.go:83: Open() error = undefined: database.Open
--- FAIL: TestMigrate_CreatesSchemaTable (0.00s)
    migrate_test.go:10: Open() error = undefined: database.Open
--- FAIL: TestMigrate_AppliesAllMigrations (0.00s)
    migrate_test.go:24: Open() error = undefined: database.Open
--- FAIL: TestMigrate_RecordsVersions (0.00s)
    migrate_test.go:55: Open() error = undefined: database.Open
--- FAIL: TestMigrate_Idempotent (0.00s)
    migrate_test.go:85: Open() error = undefined: database.Open
--- FAIL: TestSchema_ExperimentsTable (0.00s)
    migrate_test.go:103: Open() error = undefined: database.Open
--- FAIL: TestSchema_MetricsTable (0.00s)
    migrate_test.go:130: Open() error = undefined: database.Open
--- FAIL: TestSchema_RewardSignalsTable (0.00s)
    migrate_test.go:170: Open() error = undefined: database.Open
--- FAIL: TestSchema_EventsTable (0.00s)
    migrate_test.go:210: Open() error = undefined: database.Open
--- FAIL: TestSchema_AlertsTable (0.00s)
    migrate_test.go:240: Open() error = undefined: database.Open
--- FAIL: TestSchema_ForeignKeyEnforcement (0.00s)
    migrate_test.go:276: Open() error = undefined: database.Open
--- FAIL: TestSchema_LogsFTS (0.00s)
    migrate_test.go:292: Open() error = undefined: database.Open
FAIL
FAIL    github.com/kstruzzieri/flux-ml/internal/database    0.001s
FAIL

Tests:    0 passed, 16 failed, 16 total
```
