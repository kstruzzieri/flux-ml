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
	tables := []string{"experiments", "events", "metrics", "reward_signals", "alerts", "logs", "annotations", "projects"}
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
	expected := []string{"001_initial_schema", "002_logs_fts5", "003_cascade_deletes", "004_annotations", "005_projects", "006_alert_upsert_key"}
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
	if err := db.Migrate(); err != nil {
		t.Fatalf("second migration call failed: %v", err)
	}
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM schema_migrations").Scan(&count); err != nil {
		t.Fatalf("count query failed: %v", err)
	}
	if count != 6 {
		t.Errorf("expected 6 migration versions, got %d", count)
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

func TestSchema_CascadeDelete(t *testing.T) {
	db := openTestDB(t)
	db.Exec("PRAGMA foreign_keys = ON")

	// Create experiment with child rows in all tables
	db.Exec(`INSERT INTO experiments (id, name, status, created_at, updated_at)
		VALUES ('exp-001', 'test', 'running', 1706745600, 1706745600)`)
	db.Exec(`INSERT INTO events (experiment_id, timestamp, type, data)
		VALUES ('exp-001', 1706745600, 'metric', '{}')`)
	db.Exec(`INSERT INTO metrics (experiment_id, step, name, value, timestamp)
		VALUES ('exp-001', 1, 'loss', 0.5, 1706745600)`)
	db.Exec(`INSERT INTO reward_signals (experiment_id, step, component, value)
		VALUES ('exp-001', 1, 'helpfulness', 0.8)`)
	db.Exec(`INSERT INTO alerts (experiment_id, type, step, confidence, data, created_at)
		VALUES ('exp-001', 'length_gaming', 1, 0.9, '{}', 1706745600)`)
	db.Exec(`INSERT INTO annotations (experiment_id, step, type, label, created_at)
		VALUES ('exp-001', 1, 'checkpoint', 'test', 1706745600)`)

	// Delete the experiment — should cascade to all child tables
	_, err := db.Exec(`DELETE FROM experiments WHERE id = 'exp-001'`)
	if err != nil {
		t.Fatalf("delete experiment failed: %v", err)
	}

	// Verify all child rows are gone
	tables := []string{"events", "metrics", "reward_signals", "alerts", "annotations"}
	for _, table := range tables {
		var count int
		err := db.QueryRow(
			"SELECT COUNT(*) FROM " + table + " WHERE experiment_id = 'exp-001'",
		).Scan(&count)
		if err != nil {
			t.Fatalf("count %s failed: %v", table, err)
		}
		if count != 0 {
			t.Errorf("%s: expected 0 rows after cascade delete, got %d", table, count)
		}
	}
}

func TestSchema_ForeignKeyEnforcement(t *testing.T) {
	db := openTestDB(t)
	db.Exec("PRAGMA foreign_keys = ON")
	_, err := db.Exec(
		`INSERT INTO events (experiment_id, timestamp, type, data)
		 VALUES (?, ?, ?, ?)`,
		"nonexistent", 1706745600, "metric", `{}`,
	)
	if err == nil {
		t.Fatal("expected foreign key violation error, got nil")
	}
}

func TestSchema_ProjectsTable(t *testing.T) {
	db := openTestDB(t)

	// Verify projects table exists and accepts inserts
	_, err := db.Exec(
		`INSERT INTO projects (id, name, path, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?)`,
		"proj-001", "my-project", "/tmp/my-project", 1706745600, 1706745600,
	)
	if err != nil {
		t.Fatalf("insert into projects failed: %v", err)
	}

	var name, path string
	err = db.QueryRow("SELECT name, path FROM projects WHERE id = ?", "proj-001").
		Scan(&name, &path)
	if err != nil {
		t.Fatalf("query projects failed: %v", err)
	}
	if name != "my-project" {
		t.Errorf("name = %q, want %q", name, "my-project")
	}
	if path != "/tmp/my-project" {
		t.Errorf("path = %q, want %q", path, "/tmp/my-project")
	}

	// Verify UNIQUE constraint on path
	_, err = db.Exec(
		`INSERT INTO projects (id, name, path, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?)`,
		"proj-002", "duplicate-path", "/tmp/my-project", 1706745600, 1706745600,
	)
	if err == nil {
		t.Fatal("expected UNIQUE constraint violation for duplicate path, got nil")
	}
}

func TestSchema_ExperimentProjectID(t *testing.T) {
	db := openTestDB(t)
	db.Exec("PRAGMA foreign_keys = ON")

	// Insert a project
	db.Exec(
		`INSERT INTO projects (id, name, path, created_at, updated_at)
		 VALUES ('proj-001', 'test-project', '/tmp/test', 1706745600, 1706745600)`,
	)

	// Insert an experiment with project_id
	_, err := db.Exec(
		`INSERT INTO experiments (id, name, config, status, created_at, updated_at, project_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		"exp-001", "scoped-exp", `{}`, "pending", 1706745600, 1706745600, "proj-001",
	)
	if err != nil {
		t.Fatalf("insert experiment with project_id failed: %v", err)
	}

	// Verify project_id is stored
	var projectID *string
	err = db.QueryRow(
		"SELECT project_id FROM experiments WHERE id = ?", "exp-001",
	).Scan(&projectID)
	if err != nil {
		t.Fatalf("query project_id failed: %v", err)
	}
	if projectID == nil || *projectID != "proj-001" {
		t.Errorf("project_id = %v, want 'proj-001'", projectID)
	}

	// Verify NULL project_id still works (unscoped experiment)
	_, err = db.Exec(
		`INSERT INTO experiments (id, name, config, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		"exp-002", "unscoped-exp", `{}`, "pending", 1706745600, 1706745600,
	)
	if err != nil {
		t.Fatalf("insert unscoped experiment failed: %v", err)
	}

	// Verify the index exists
	var indexName string
	err = db.QueryRow(
		"SELECT name FROM sqlite_master WHERE type='index' AND name='idx_experiments_project'",
	).Scan(&indexName)
	if err != nil {
		t.Fatalf("idx_experiments_project index not found: %v", err)
	}

	// Verify FK violation: non-existent project_id is rejected
	_, err = db.Exec(
		`INSERT INTO experiments (id, name, config, status, created_at, updated_at, project_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		"exp-003", "bad-ref", `{}`, "pending", 1706745600, 1706745600, "nonexistent-project",
	)
	if err == nil {
		t.Fatal("expected FK violation for non-existent project_id, got nil")
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
