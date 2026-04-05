# Project Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the "project" concept into Flux ML — a `flux.yaml`-based project model with database migration, CRUD store, YAML config parsing, project scaffold/templates, project-scoped experiments, machine-local state, and recent projects list.

**Architecture:** A new `internal/project` package provides `Store` (SQLite CRUD), `Config` (`flux.yaml` parsing), and `Scaffold` (template-based directory creation). The existing `experiments` table gains a nullable `project_id` FK. The `App` struct in `app.go` gains a `project.Store` field and new Wails-bound methods. Machine-local state (recent projects, active connector selection) lives in `~/.config/Flux/`. The frontend `experimentStore` adds an optional project filter to `ListExperiments`.

**Tech Stack:** Go 1.24, `gopkg.in/yaml.v3` (YAML parsing), `modernc.org/sqlite` (existing), `github.com/google/uuid` (existing), React + Zustand (frontend)

**Spec Reference:** `docs/superpowers/specs/2026-04-04-test-mock-project-system-design.md` — Section 1 (Project Model) + Section 2 (Demo Project & Scaffold, v1 scope only)

---

## File Structure

### New Files

```
internal/project/
  store.go           — Project CRUD (Create, GetByID, GetByPath, List, Delete) against SQLite
  store_test.go      — Tests for all Store methods
  config.go          — flux.yaml parsing (Load, Validate, Write) using gopkg.in/yaml.v3
  config_test.go     — Tests for parsing valid/invalid/missing flux.yaml files
  scaffold.go        — Directory creation from embedded templates + flux.yaml generation
  scaffold_test.go   — Tests for scaffold output
  templates/
    reward-model/
      flux.yaml      — Template flux.yaml for reward model projects
      configs/
        base.yaml    — Default training config
      src/
        train.py     — Starter training script (~80 lines)
      .gitignore     — Standard ML gitignore
    blank/
      flux.yaml      — Minimal flux.yaml
      .gitignore     — Standard gitignore

internal/database/migrations/
  005_projects.sql   — CREATE TABLE projects + ALTER TABLE experiments ADD COLUMN project_id
```

### Modified Files

```
app.go               — Add project.Store field, wire into startup/shutdown
project_api.go       — New file: Wails-bound project methods (CreateProject, OpenProject, ListRecentProjects, etc.)
experiment_api.go    — Add optional projectID parameter to ListExperiments, CreateExperiment
internal/experiment/
  store.go           — Add ListByProject(projectID), CreateWithProject(name, config, projectID) methods
  store_test.go      — Add tests for project-scoped queries
go.mod               — Add gopkg.in/yaml.v3 dependency
```

---

## Task 1: Database Migration — `005_projects.sql`

**Files:**
- Create: `internal/database/migrations/005_projects.sql`
- Test: `internal/database/migrate_test.go` (modify)

- [ ] **Step 1: Write the failing test**

Add to `internal/database/migrate_test.go`:

```go
func TestMigration_005_ProjectsTable(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	defer db.Close()

	// Verify projects table exists
	var name string
	err = db.QueryRow(
		"SELECT name FROM sqlite_master WHERE type='table' AND name='projects'",
	).Scan(&name)
	if err != nil {
		t.Fatal("projects table not found after migration")
	}

	// Verify experiments table has project_id column
	var cid int
	var colName, colType string
	var notNull, pk int
	var dfltValue sql.NullString
	rows, err := db.Query("PRAGMA table_info(experiments)")
	if err != nil {
		t.Fatalf("PRAGMA table_info failed: %v", err)
	}
	defer rows.Close()

	foundProjectID := false
	for rows.Next() {
		if err := rows.Scan(&cid, &colName, &colType, &notNull, &dfltValue, &pk); err != nil {
			t.Fatalf("scanning column info: %v", err)
		}
		if colName == "project_id" {
			foundProjectID = true
			if notNull != 0 {
				t.Error("project_id should be nullable")
			}
		}
	}
	if !foundProjectID {
		t.Fatal("project_id column not found on experiments table")
	}

	// Verify index exists
	var idxName string
	err = db.QueryRow(
		"SELECT name FROM sqlite_master WHERE type='index' AND name='idx_experiments_project'",
	).Scan(&idxName)
	if err != nil {
		t.Fatal("idx_experiments_project index not found")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/database/ -run TestMigration_005 -v`

Expected: FAIL — "projects table not found after migration"

- [ ] **Step 3: Write the migration SQL**

Create `internal/database/migrations/005_projects.sql`:

```sql
-- Projects table: represents a Flux project directory on disk.
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Add nullable project_id to experiments for project scoping.
-- Existing experiments remain valid with project_id = NULL.
ALTER TABLE experiments ADD COLUMN project_id TEXT REFERENCES projects(id);
CREATE INDEX idx_experiments_project ON experiments(project_id);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/database/ -run TestMigration_005 -v`

Expected: PASS

- [ ] **Step 5: Run full test suite to verify no regressions**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/... -v`

Expected: All tests PASS (existing experiment tests still work because project_id is nullable)

- [ ] **Step 6: Commit**

```bash
git add internal/database/migrations/005_projects.sql internal/database/migrate_test.go
git commit -m "feat(db): add 005_projects migration — projects table and experiment project_id FK"
```

---

## Task 2: Add YAML dependency

**Files:**
- Modify: `go.mod`

- [ ] **Step 1: Add the gopkg.in/yaml.v3 dependency**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go get gopkg.in/yaml.v3`

- [ ] **Step 2: Verify it resolves**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go mod tidy`

Expected: `go.mod` and `go.sum` updated, no errors.

- [ ] **Step 3: Commit**

```bash
git add go.mod go.sum
git commit -m "chore: add gopkg.in/yaml.v3 dependency for flux.yaml parsing"
```

---

## Task 3: Project Store — CRUD operations

**Files:**
- Create: `internal/project/store.go`
- Create: `internal/project/store_test.go`

- [ ] **Step 1: Write failing tests for project CRUD**

Create `internal/project/store_test.go`:

```go
package project

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

func TestCreate_Success(t *testing.T) {
	store := newTestStore(t)
	proj, err := store.Create("momentum-strategy", "/tmp/test-projects/momentum")
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if len(proj.ID) != 36 {
		t.Errorf("ID length = %d, want 36 (UUID)", len(proj.ID))
	}
	if proj.Name != "momentum-strategy" {
		t.Errorf("Name = %q, want %q", proj.Name, "momentum-strategy")
	}
	if proj.Path != "/tmp/test-projects/momentum" {
		t.Errorf("Path = %q, want %q", proj.Path, "/tmp/test-projects/momentum")
	}
	now := time.Now().Unix()
	if proj.CreatedAt < now-5 || proj.CreatedAt > now+1 {
		t.Errorf("CreatedAt = %d, want ~%d", proj.CreatedAt, now)
	}
}

func TestCreate_EmptyName(t *testing.T) {
	store := newTestStore(t)
	_, err := store.Create("", "/tmp/test")
	if err == nil {
		t.Fatal("expected error for empty name, got nil")
	}
}

func TestCreate_EmptyPath(t *testing.T) {
	store := newTestStore(t)
	_, err := store.Create("test", "")
	if err == nil {
		t.Fatal("expected error for empty path, got nil")
	}
}

func TestCreate_DuplicatePath(t *testing.T) {
	store := newTestStore(t)
	_, err := store.Create("proj-a", "/tmp/test-project")
	if err != nil {
		t.Fatalf("first Create failed: %v", err)
	}
	_, err = store.Create("proj-b", "/tmp/test-project")
	if err == nil {
		t.Fatal("expected error for duplicate path, got nil")
	}
}

func TestGetByID_Found(t *testing.T) {
	store := newTestStore(t)
	created, err := store.Create("test-proj", "/tmp/test")
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
	if got.Name != "test-proj" {
		t.Errorf("Name = %q, want %q", got.Name, "test-proj")
	}
}

func TestGetByID_NotFound(t *testing.T) {
	store := newTestStore(t)
	_, err := store.GetByID("nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent ID, got nil")
	}
}

func TestGetByPath_Found(t *testing.T) {
	store := newTestStore(t)
	created, err := store.Create("test-proj", "/tmp/test-path")
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	got, err := store.GetByPath("/tmp/test-path")
	if err != nil {
		t.Fatalf("GetByPath failed: %v", err)
	}
	if got.ID != created.ID {
		t.Errorf("ID = %q, want %q", got.ID, created.ID)
	}
}

func TestGetByPath_NotFound(t *testing.T) {
	store := newTestStore(t)
	_, err := store.GetByPath("/nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent path, got nil")
	}
}

func TestList_ReturnsAll(t *testing.T) {
	store := newTestStore(t)
	for i, name := range []string{"proj-a", "proj-b", "proj-c"} {
		if _, err := store.Create(name, filepath.Join("/tmp", name, string(rune('0'+i)))); err != nil {
			t.Fatalf("Create %q failed: %v", name, err)
		}
	}
	list, err := store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(list) != 3 {
		t.Fatalf("List returned %d, want 3", len(list))
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
		t.Errorf("List returned %d, want 0", len(list))
	}
}

func TestDelete_Success(t *testing.T) {
	store := newTestStore(t)
	created, err := store.Create("test-proj", "/tmp/test")
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if err := store.Delete(created.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
	_, err = store.GetByID(created.ID)
	if err == nil {
		t.Fatal("expected error after delete, got nil")
	}
}

func TestDelete_NotFound(t *testing.T) {
	store := newTestStore(t)
	err := store.Delete("nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent ID, got nil")
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -v`

Expected: FAIL — package does not exist yet

- [ ] **Step 3: Write the Store implementation**

Create `internal/project/store.go`:

```go
package project

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kstruzzieri/flux-ml/internal/database"
)

// Project represents a Flux project directory on disk.
type Project struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Path      string `json:"path"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

// Store provides CRUD operations for projects.
type Store struct {
	db *database.DB
}

// NewStore creates a new project store.
func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// Create creates a new project record. Path must be unique.
func (s *Store) Create(name, path string) (*Project, error) {
	if name == "" {
		return nil, fmt.Errorf("project name cannot be empty")
	}
	if path == "" {
		return nil, fmt.Errorf("project path cannot be empty")
	}

	now := time.Now().Unix()
	id := uuid.New().String()

	_, err := s.db.Exec(
		`INSERT INTO projects (id, name, path, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?)`,
		id, name, path, now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("inserting project: %w", err)
	}

	return &Project{
		ID:        id,
		Name:      name,
		Path:      path,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// GetByID returns a single project by ID.
func (s *Store) GetByID(id string) (*Project, error) {
	var proj Project
	err := s.db.QueryRow(
		`SELECT id, name, path, created_at, updated_at FROM projects WHERE id = ?`, id,
	).Scan(&proj.ID, &proj.Name, &proj.Path, &proj.CreatedAt, &proj.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("project not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("querying project: %w", err)
	}
	return &proj, nil
}

// GetByPath returns a project by its filesystem path.
func (s *Store) GetByPath(path string) (*Project, error) {
	var proj Project
	err := s.db.QueryRow(
		`SELECT id, name, path, created_at, updated_at FROM projects WHERE path = ?`, path,
	).Scan(&proj.ID, &proj.Name, &proj.Path, &proj.CreatedAt, &proj.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("project not found at path: %s", path)
	}
	if err != nil {
		return nil, fmt.Errorf("querying project by path: %w", err)
	}
	return &proj, nil
}

// List returns all projects ordered by updated_at descending.
func (s *Store) List() ([]Project, error) {
	rows, err := s.db.Query(
		`SELECT id, name, path, created_at, updated_at
		 FROM projects ORDER BY updated_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("querying projects: %w", err)
	}
	defer rows.Close()

	projects := []Project{}
	for rows.Next() {
		var proj Project
		if err := rows.Scan(&proj.ID, &proj.Name, &proj.Path, &proj.CreatedAt, &proj.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning project: %w", err)
		}
		projects = append(projects, proj)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating projects: %w", err)
	}
	return projects, nil
}

// Delete removes a project by ID.
func (s *Store) Delete(id string) error {
	result, err := s.db.Exec(`DELETE FROM projects WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("deleting project: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("checking rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("project not found: %s", id)
	}
	return nil
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -v`

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add internal/project/store.go internal/project/store_test.go
git commit -m "feat(project): add project Store with CRUD operations"
```

---

## Task 4: flux.yaml Config Parsing

**Files:**
- Create: `internal/project/config.go`
- Create: `internal/project/config_test.go`

- [ ] **Step 1: Write failing tests for config parsing**

Create `internal/project/config_test.go`:

```go
package project

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConfig_Valid(t *testing.T) {
	dir := t.TempDir()
	yamlContent := `version: 1
name: "momentum-strategy"
description: "XGBoost momentum model"
template: reward-model
ignore:
  - ".flux/**"
  - "checkpoints/**"
defaults:
  training:
    config: configs/base.yaml
    script: src/train.py
`
	if err := os.WriteFile(filepath.Join(dir, "flux.yaml"), []byte(yamlContent), 0644); err != nil {
		t.Fatalf("writing flux.yaml: %v", err)
	}

	cfg, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig failed: %v", err)
	}
	if cfg.Version != 1 {
		t.Errorf("Version = %d, want 1", cfg.Version)
	}
	if cfg.Name != "momentum-strategy" {
		t.Errorf("Name = %q, want %q", cfg.Name, "momentum-strategy")
	}
	if cfg.Description != "XGBoost momentum model" {
		t.Errorf("Description = %q, want %q", cfg.Description, "XGBoost momentum model")
	}
	if cfg.Template != "reward-model" {
		t.Errorf("Template = %q, want %q", cfg.Template, "reward-model")
	}
	if len(cfg.Ignore) != 2 {
		t.Fatalf("Ignore length = %d, want 2", len(cfg.Ignore))
	}
	if cfg.Ignore[0] != ".flux/**" {
		t.Errorf("Ignore[0] = %q, want %q", cfg.Ignore[0], ".flux/**")
	}
}

func TestLoadConfig_MissingFile(t *testing.T) {
	dir := t.TempDir()
	_, err := LoadConfig(dir)
	if err == nil {
		t.Fatal("expected error for missing flux.yaml, got nil")
	}
}

func TestLoadConfig_MissingVersion(t *testing.T) {
	dir := t.TempDir()
	yamlContent := `name: "test-project"
`
	if err := os.WriteFile(filepath.Join(dir, "flux.yaml"), []byte(yamlContent), 0644); err != nil {
		t.Fatalf("writing flux.yaml: %v", err)
	}

	cfg, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig failed: %v", err)
	}
	// Missing version defaults to 1 per spec
	if cfg.Version != 1 {
		t.Errorf("Version = %d, want 1 (default for missing version)", cfg.Version)
	}
}

func TestLoadConfig_MissingName(t *testing.T) {
	dir := t.TempDir()
	yamlContent := `version: 1
`
	if err := os.WriteFile(filepath.Join(dir, "flux.yaml"), []byte(yamlContent), 0644); err != nil {
		t.Fatalf("writing flux.yaml: %v", err)
	}

	_, err := LoadConfig(dir)
	if err == nil {
		t.Fatal("expected error for missing name, got nil")
	}
}

func TestLoadConfig_InvalidYAML(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "flux.yaml"), []byte("{{invalid yaml"), 0644); err != nil {
		t.Fatalf("writing flux.yaml: %v", err)
	}

	_, err := LoadConfig(dir)
	if err == nil {
		t.Fatal("expected error for invalid YAML, got nil")
	}
}

func TestLoadConfig_Connectors(t *testing.T) {
	dir := t.TempDir()
	yamlContent := `version: 1
name: "test-project"
connectors:
  - type: grpc
    name: mock-training
    address: localhost:50051
    protocol: flux-training
`
	if err := os.WriteFile(filepath.Join(dir, "flux.yaml"), []byte(yamlContent), 0644); err != nil {
		t.Fatalf("writing flux.yaml: %v", err)
	}

	cfg, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig failed: %v", err)
	}
	if len(cfg.Connectors) != 1 {
		t.Fatalf("Connectors length = %d, want 1", len(cfg.Connectors))
	}
	conn := cfg.Connectors[0]
	if conn.Type != "grpc" {
		t.Errorf("Connector.Type = %q, want %q", conn.Type, "grpc")
	}
	if conn.Name != "mock-training" {
		t.Errorf("Connector.Name = %q, want %q", conn.Name, "mock-training")
	}
	if conn.Address != "localhost:50051" {
		t.Errorf("Connector.Address = %q, want %q", conn.Address, "localhost:50051")
	}
	if conn.Protocol != "flux-training" {
		t.Errorf("Connector.Protocol = %q, want %q", conn.Protocol, "flux-training")
	}
}

func TestWriteConfig(t *testing.T) {
	dir := t.TempDir()
	cfg := &FluxConfig{
		Version:     1,
		Name:        "written-project",
		Description: "A test",
		Ignore:      []string{".flux/**"},
	}
	if err := WriteConfig(dir, cfg); err != nil {
		t.Fatalf("WriteConfig failed: %v", err)
	}

	// Read it back
	loaded, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig after write failed: %v", err)
	}
	if loaded.Name != "written-project" {
		t.Errorf("Name = %q, want %q", loaded.Name, "written-project")
	}
	if loaded.Version != 1 {
		t.Errorf("Version = %d, want 1", loaded.Version)
	}
}

func TestIsProject(t *testing.T) {
	dir := t.TempDir()
	if IsProject(dir) {
		t.Fatal("empty dir should not be a project")
	}

	if err := os.WriteFile(filepath.Join(dir, "flux.yaml"), []byte("version: 1\nname: test\n"), 0644); err != nil {
		t.Fatalf("writing flux.yaml: %v", err)
	}
	if !IsProject(dir) {
		t.Fatal("dir with flux.yaml should be a project")
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -run "TestLoadConfig|TestWriteConfig|TestIsProject" -v`

Expected: FAIL — `LoadConfig`, `WriteConfig`, `IsProject` not defined

- [ ] **Step 3: Write the config implementation**

Create `internal/project/config.go`:

```go
package project

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// FluxConfig represents the contents of a flux.yaml project file.
type FluxConfig struct {
	Version     int               `yaml:"version"     json:"version"`
	Name        string            `yaml:"name"        json:"name"`
	Description string            `yaml:"description" json:"description,omitempty"`
	Template    string            `yaml:"template"    json:"template,omitempty"`
	Ignore      []string          `yaml:"ignore"      json:"ignore,omitempty"`
	Connectors  []ConnectorConfig `yaml:"connectors"  json:"connectors,omitempty"`
	Defaults    *DefaultsConfig   `yaml:"defaults"    json:"defaults,omitempty"`
}

// ConnectorConfig describes an external service connection.
type ConnectorConfig struct {
	Type     string `yaml:"type"     json:"type"`
	Name     string `yaml:"name"     json:"name"`
	Address  string `yaml:"address"  json:"address"`
	Protocol string `yaml:"protocol" json:"protocol"`
	Adapter  string `yaml:"adapter"  json:"adapter,omitempty"`
}

// DefaultsConfig holds default training configuration references.
type DefaultsConfig struct {
	Training *TrainingDefaults `yaml:"training" json:"training,omitempty"`
}

// TrainingDefaults references default training config and script.
type TrainingDefaults struct {
	Config string `yaml:"config" json:"config,omitempty"`
	Script string `yaml:"script" json:"script,omitempty"`
}

const configFileName = "flux.yaml"

// IsProject returns true if the directory contains a flux.yaml file.
func IsProject(dir string) bool {
	_, err := os.Stat(filepath.Join(dir, configFileName))
	return err == nil
}

// LoadConfig reads and parses flux.yaml from the given directory.
func LoadConfig(dir string) (*FluxConfig, error) {
	path := filepath.Join(dir, configFileName)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", configFileName, err)
	}

	var cfg FluxConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parsing %s: %w", configFileName, err)
	}

	// Missing version defaults to 1 per spec
	if cfg.Version == 0 {
		cfg.Version = 1
	}

	if err := validateConfig(&cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}

// WriteConfig writes a FluxConfig to flux.yaml in the given directory.
func WriteConfig(dir string, cfg *FluxConfig) error {
	if cfg.Version == 0 {
		cfg.Version = 1
	}
	data, err := yaml.Marshal(cfg)
	if err != nil {
		return fmt.Errorf("marshaling %s: %w", configFileName, err)
	}
	path := filepath.Join(dir, configFileName)
	return os.WriteFile(path, data, 0644)
}

func validateConfig(cfg *FluxConfig) error {
	if cfg.Name == "" {
		return fmt.Errorf("%s: name is required", configFileName)
	}
	return nil
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -run "TestLoadConfig|TestWriteConfig|TestIsProject" -v`

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add internal/project/config.go internal/project/config_test.go
git commit -m "feat(project): add flux.yaml config parsing (Load, Write, IsProject)"
```

---

## Task 5: Project-Scoped Experiment Queries

**Files:**
- Modify: `internal/experiment/store.go`
- Modify: `internal/experiment/store_test.go`

- [ ] **Step 1: Write failing tests for project-scoped methods**

Add to `internal/experiment/store_test.go`:

```go
func TestCreateWithProject_Success(t *testing.T) {
	store := newTestStore(t)

	// First create a project in the DB (direct SQL since project store is separate)
	_, err := store.db.Exec(
		`INSERT INTO projects (id, name, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		"proj-1", "test-proj", "/tmp/test", 1000, 1000,
	)
	if err != nil {
		t.Fatalf("inserting project: %v", err)
	}

	exp, err := store.CreateWithProject("my-exp", `{"lr":0.01}`, "proj-1")
	if err != nil {
		t.Fatalf("CreateWithProject failed: %v", err)
	}
	if exp.ProjectID == nil {
		t.Fatal("ProjectID is nil, want non-nil")
	}
	if *exp.ProjectID != "proj-1" {
		t.Errorf("ProjectID = %q, want %q", *exp.ProjectID, "proj-1")
	}
}

func TestCreateWithProject_EmptyProjectID(t *testing.T) {
	store := newTestStore(t)
	_, err := store.CreateWithProject("my-exp", `{}`, "")
	if err == nil {
		t.Fatal("expected error for empty project ID, got nil")
	}
}

func TestListByProject_FiltersCorrectly(t *testing.T) {
	store := newTestStore(t)

	// Create two projects
	_, err := store.db.Exec(
		`INSERT INTO projects (id, name, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		"proj-a", "proj-a", "/tmp/a", 1000, 1000,
	)
	if err != nil {
		t.Fatalf("inserting project a: %v", err)
	}
	_, err = store.db.Exec(
		`INSERT INTO projects (id, name, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		"proj-b", "proj-b", "/tmp/b", 1000, 1000,
	)
	if err != nil {
		t.Fatalf("inserting project b: %v", err)
	}

	// Create experiments: 2 for proj-a, 1 for proj-b, 1 unscoped
	if _, err := store.CreateWithProject("exp-a1", `{}`, "proj-a"); err != nil {
		t.Fatalf("create exp-a1: %v", err)
	}
	if _, err := store.CreateWithProject("exp-a2", `{}`, "proj-a"); err != nil {
		t.Fatalf("create exp-a2: %v", err)
	}
	if _, err := store.CreateWithProject("exp-b1", `{}`, "proj-b"); err != nil {
		t.Fatalf("create exp-b1: %v", err)
	}
	if _, err := store.Create("exp-unscoped", `{}`); err != nil {
		t.Fatalf("create unscoped: %v", err)
	}

	// ListByProject should return only proj-a experiments
	list, err := store.ListByProject("proj-a")
	if err != nil {
		t.Fatalf("ListByProject failed: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("ListByProject returned %d, want 2", len(list))
	}
	for _, exp := range list {
		if exp.ProjectID == nil || *exp.ProjectID != "proj-a" {
			t.Errorf("experiment %q has ProjectID %v, want proj-a", exp.Name, exp.ProjectID)
		}
	}

	// Original List still returns all 4
	all, err := store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(all) != 4 {
		t.Fatalf("List returned %d, want 4", len(all))
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/experiment/ -run "TestCreateWithProject|TestListByProject" -v`

Expected: FAIL — `CreateWithProject` and `ListByProject` not defined, `ProjectID` field missing

- [ ] **Step 3: Update the Experiment struct and add new methods**

In `internal/experiment/store.go`, add the `ProjectID` field to the `Experiment` struct:

```go
// Experiment represents an ML training run.
type Experiment struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Config    string  `json:"config"`
	ParentID  *string `json:"parentId"`
	ProjectID *string `json:"projectId"`
	Status    string  `json:"status"`
	CreatedAt int64   `json:"createdAt"`
	UpdatedAt int64   `json:"updatedAt"`
}
```

Update the `Create` method's SQL and scan to include `project_id` (selecting NULL):

In `Create`, change the INSERT to:

```go
_, err := s.db.Exec(
	`INSERT INTO experiments (id, name, config, status, created_at, updated_at)
	 VALUES (?, ?, ?, ?, ?, ?)`,
	id, name, config, StatusPending, now, now,
)
```

(This is unchanged — `project_id` defaults to NULL.)

Update the return struct to include `ProjectID: nil`.

Update `List` and `GetByID` scan calls to include `project_id`:

In `List`, change the query and scan:

```go
rows, err := s.db.Query(
	`SELECT id, name, config, parent_id, project_id, status, created_at, updated_at
	 FROM experiments ORDER BY created_at DESC`,
)
```

And the scan:

```go
var parentID, projectID sql.NullString
if err := rows.Scan(&exp.ID, &exp.Name, &exp.Config, &parentID, &projectID, &exp.Status, &exp.CreatedAt, &exp.UpdatedAt); err != nil {
```

After the scan, add:

```go
if projectID.Valid {
	exp.ProjectID = &projectID.String
}
```

Apply the same pattern to `GetByID`.

Add the two new methods at the end of `store.go`:

```go
// CreateWithProject creates a new experiment scoped to a project.
func (s *Store) CreateWithProject(name, config, projectID string) (*Experiment, error) {
	if name == "" {
		return nil, fmt.Errorf("experiment name cannot be empty")
	}
	if projectID == "" {
		return nil, fmt.Errorf("project ID cannot be empty")
	}

	now := time.Now().Unix()
	id := uuid.New().String()

	_, err := s.db.Exec(
		`INSERT INTO experiments (id, name, config, project_id, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, name, config, projectID, StatusPending, now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("inserting experiment: %w", err)
	}

	return &Experiment{
		ID:        id,
		Name:      name,
		Config:    config,
		ParentID:  nil,
		ProjectID: &projectID,
		Status:    StatusPending,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// ListByProject returns experiments scoped to a specific project.
func (s *Store) ListByProject(projectID string) ([]Experiment, error) {
	rows, err := s.db.Query(
		`SELECT id, name, config, parent_id, project_id, status, created_at, updated_at
		 FROM experiments WHERE project_id = ? ORDER BY created_at DESC`,
		projectID,
	)
	if err != nil {
		return nil, fmt.Errorf("querying experiments by project: %w", err)
	}
	defer rows.Close()

	experiments := []Experiment{}
	for rows.Next() {
		var exp Experiment
		var parentID, projID sql.NullString
		if err := rows.Scan(&exp.ID, &exp.Name, &exp.Config, &parentID, &projID, &exp.Status, &exp.CreatedAt, &exp.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning experiment: %w", err)
		}
		if parentID.Valid {
			exp.ParentID = &parentID.String
		}
		if projID.Valid {
			exp.ProjectID = &projID.String
		}
		experiments = append(experiments, exp)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating experiments: %w", err)
	}
	return experiments, nil
}
```

- [ ] **Step 4: Run all experiment tests to verify they pass**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/experiment/ -v`

Expected: All PASS (existing tests still pass, new tests pass)

- [ ] **Step 5: Commit**

```bash
git add internal/experiment/store.go internal/experiment/store_test.go
git commit -m "feat(experiment): add ProjectID field, CreateWithProject, ListByProject"
```

---

## Task 6: Project Scaffold — Template-Based Directory Creation

**Files:**
- Create: `internal/project/scaffold.go`
- Create: `internal/project/scaffold_test.go`
- Create: `internal/project/templates/reward-model/flux.yaml`
- Create: `internal/project/templates/reward-model/configs/base.yaml`
- Create: `internal/project/templates/reward-model/src/train.py`
- Create: `internal/project/templates/reward-model/.gitignore`
- Create: `internal/project/templates/blank/flux.yaml`
- Create: `internal/project/templates/blank/.gitignore`

- [ ] **Step 1: Create the embedded template files**

Create `internal/project/templates/blank/flux.yaml`:

```yaml
version: 1
name: "{{.Name}}"
description: ""

ignore:
  - ".flux/**"
  - ".venv/**"
  - "__pycache__/**"
```

Create `internal/project/templates/blank/.gitignore`:

```
# Flux ephemeral session state
.flux/

# Python
.venv/
__pycache__/
*.pyc

# Data
checkpoints/
*.bin
```

Create `internal/project/templates/reward-model/flux.yaml`:

```yaml
version: 1
name: "{{.Name}}"
description: "Reward model training project"
template: reward-model

ignore:
  - ".flux/**"
  - "checkpoints/**"
  - "data/*.bin"
  - ".venv/**"
  - "__pycache__/**"

defaults:
  training:
    config: configs/base.yaml
    script: src/train.py
```

Create `internal/project/templates/reward-model/configs/base.yaml`:

```yaml
# Base training configuration
model: llama-7b
learning_rate: 1e-5
batch_size: 32
kl_coef: 0.1
optimizer: adamw
max_steps: 20000
warmup_steps: 500

reward_components:
  helpfulness: 0.4
  harmlessness: 0.35
  honesty: 0.25
```

Create `internal/project/templates/reward-model/src/train.py`:

```python
"""Reward model training loop.

This is a starter training script scaffolded by Flux.
Modify it to match your training setup.
"""

import argparse
import yaml


def load_config(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def train_step(step: int, config: dict) -> dict:
    """Execute one training step. Replace with your training logic."""
    # Placeholder — replace with actual training code
    return {
        "loss": 2.5 * (0.97 ** step),
        "reward": 0.1 * (1.03 ** min(step, 50)),
        "kl": 0.01 + 0.0005 * step,
    }


def main():
    parser = argparse.ArgumentParser(description="Train reward model")
    parser.add_argument("--config", default="configs/base.yaml", help="Config file path")
    parser.add_argument("--steps", type=int, default=100, help="Number of training steps")
    args = parser.parse_args()

    config = load_config(args.config)
    print(f"Training with config: {config}")

    for step in range(args.steps):
        metrics = train_step(step, config)
        if step % 10 == 0:
            print(f"Step {step}: loss={metrics['loss']:.4f} reward={metrics['reward']:.4f}")

    print("Training complete.")


if __name__ == "__main__":
    main()
```

Create `internal/project/templates/reward-model/.gitignore`:

```
# Flux ephemeral session state
.flux/

# Python
.venv/
__pycache__/
*.pyc

# Data & checkpoints
checkpoints/
data/*.bin

# Model artifacts
*.pt
*.onnx
```

- [ ] **Step 2: Write failing tests for scaffold**

Create `internal/project/scaffold_test.go`:

```go
package project

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestScaffold_Blank(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "my-project")

	err := Scaffold(dir, "my-project", "blank")
	if err != nil {
		t.Fatalf("Scaffold failed: %v", err)
	}

	// flux.yaml should exist and contain the project name
	data, err := os.ReadFile(filepath.Join(dir, "flux.yaml"))
	if err != nil {
		t.Fatalf("reading flux.yaml: %v", err)
	}
	if !strings.Contains(string(data), "my-project") {
		t.Error("flux.yaml does not contain project name")
	}

	// .gitignore should exist
	if _, err := os.Stat(filepath.Join(dir, ".gitignore")); err != nil {
		t.Error(".gitignore not created")
	}
}

func TestScaffold_RewardModel(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "rm-project")

	err := Scaffold(dir, "rm-project", "reward-model")
	if err != nil {
		t.Fatalf("Scaffold failed: %v", err)
	}

	// Check expected files exist
	expectedFiles := []string{
		"flux.yaml",
		".gitignore",
		"configs/base.yaml",
		"src/train.py",
	}
	for _, f := range expectedFiles {
		if _, err := os.Stat(filepath.Join(dir, f)); err != nil {
			t.Errorf("expected file %q not created", f)
		}
	}

	// Check expected directories exist
	expectedDirs := []string{"configs", "src", "data", "checkpoints"}
	for _, d := range expectedDirs {
		info, err := os.Stat(filepath.Join(dir, d))
		if err != nil {
			t.Errorf("expected dir %q not created", d)
			continue
		}
		if !info.IsDir() {
			t.Errorf("%q is not a directory", d)
		}
	}

	// flux.yaml should contain the project name
	data, err := os.ReadFile(filepath.Join(dir, "flux.yaml"))
	if err != nil {
		t.Fatalf("reading flux.yaml: %v", err)
	}
	if !strings.Contains(string(data), "rm-project") {
		t.Error("flux.yaml does not contain project name")
	}
}

func TestScaffold_UnknownTemplate(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "bad")
	err := Scaffold(dir, "test", "nonexistent-template")
	if err == nil {
		t.Fatal("expected error for unknown template, got nil")
	}
}

func TestScaffold_DirAlreadyExists(t *testing.T) {
	dir := t.TempDir()
	// Write a file in the dir to make it non-empty
	if err := os.WriteFile(filepath.Join(dir, "existing.txt"), []byte("hi"), 0644); err != nil {
		t.Fatalf("writing file: %v", err)
	}
	// Scaffold should still work (creates flux.yaml alongside existing files)
	err := Scaffold(dir, "test", "blank")
	if err != nil {
		t.Fatalf("Scaffold into existing dir failed: %v", err)
	}
	// Both existing file and flux.yaml should be present
	if _, err := os.Stat(filepath.Join(dir, "existing.txt")); err != nil {
		t.Error("existing file was removed")
	}
	if _, err := os.Stat(filepath.Join(dir, "flux.yaml")); err != nil {
		t.Error("flux.yaml not created")
	}
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -run TestScaffold -v`

Expected: FAIL — `Scaffold` not defined

- [ ] **Step 4: Write the scaffold implementation**

Create `internal/project/scaffold.go`:

```go
package project

import (
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

//go:embed templates
var templatesFS embed.FS

// validTemplates lists the available project templates.
var validTemplates = map[string]bool{
	"blank":        true,
	"reward-model": true,
}

// Scaffold creates a new project directory from a template.
// The projectName is substituted into the flux.yaml template.
// If the directory already exists, files are created alongside existing content.
func Scaffold(dir, projectName, template string) error {
	if !validTemplates[template] {
		return fmt.Errorf("unknown template: %q (available: blank, reward-model)", template)
	}

	// Create the project directory
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("creating project directory: %w", err)
	}

	// Walk the template directory and copy files
	templateRoot := filepath.Join("templates", template)
	err := fs.WalkDir(templatesFS, templateRoot, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Compute the relative path from the template root
		rel, err := filepath.Rel(templateRoot, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}

		target := filepath.Join(dir, rel)

		if d.IsDir() {
			return os.MkdirAll(target, 0755)
		}

		data, err := templatesFS.ReadFile(path)
		if err != nil {
			return fmt.Errorf("reading template file %s: %w", path, err)
		}

		// Substitute template variables in flux.yaml
		content := string(data)
		if filepath.Base(rel) == "flux.yaml" {
			content = strings.ReplaceAll(content, "{{.Name}}", projectName)
		}

		return os.WriteFile(target, []byte(content), 0644)
	})
	if err != nil {
		return fmt.Errorf("scaffolding template %q: %w", template, err)
	}

	// Create empty directories that don't have files in the template
	if template == "reward-model" {
		for _, d := range []string{"data", "checkpoints"} {
			if err := os.MkdirAll(filepath.Join(dir, d), 0755); err != nil {
				return fmt.Errorf("creating %s directory: %w", d, err)
			}
		}
	}

	return nil
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -run TestScaffold -v`

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add internal/project/scaffold.go internal/project/scaffold_test.go internal/project/templates/
git commit -m "feat(project): add project scaffold with blank and reward-model templates"
```

---

## Task 7: Machine-Local State — Recent Projects & Project State

**Files:**
- Create: `internal/project/localstate.go`
- Create: `internal/project/localstate_test.go`

- [ ] **Step 1: Write failing tests**

Create `internal/project/localstate_test.go`:

```go
package project

import (
	"path/filepath"
	"testing"
)

func TestRecentProjects_RoundTrip(t *testing.T) {
	dir := t.TempDir()
	ls := NewLocalState(dir)

	// Initially empty
	recent, err := ls.RecentProjects()
	if err != nil {
		t.Fatalf("RecentProjects failed: %v", err)
	}
	if len(recent) != 0 {
		t.Fatalf("expected 0 recent projects, got %d", len(recent))
	}

	// Add a project
	if err := ls.AddRecentProject("/tmp/proj-a", "proj-a"); err != nil {
		t.Fatalf("AddRecentProject failed: %v", err)
	}
	recent, _ = ls.RecentProjects()
	if len(recent) != 1 {
		t.Fatalf("expected 1 recent project, got %d", len(recent))
	}
	if recent[0].Path != "/tmp/proj-a" {
		t.Errorf("Path = %q, want %q", recent[0].Path, "/tmp/proj-a")
	}
	if recent[0].Name != "proj-a" {
		t.Errorf("Name = %q, want %q", recent[0].Name, "proj-a")
	}
}

func TestRecentProjects_DuplicateMoveToTop(t *testing.T) {
	dir := t.TempDir()
	ls := NewLocalState(dir)

	ls.AddRecentProject("/tmp/a", "a")
	ls.AddRecentProject("/tmp/b", "b")
	ls.AddRecentProject("/tmp/a", "a") // re-add a

	recent, _ := ls.RecentProjects()
	if len(recent) != 2 {
		t.Fatalf("expected 2 recent projects, got %d", len(recent))
	}
	// "a" should be first (most recent)
	if recent[0].Path != "/tmp/a" {
		t.Errorf("first project = %q, want /tmp/a", recent[0].Path)
	}
}

func TestRecentProjects_MaxEntries(t *testing.T) {
	dir := t.TempDir()
	ls := NewLocalState(dir)

	// Add 25 projects (max is 20)
	for i := 0; i < 25; i++ {
		ls.AddRecentProject(filepath.Join("/tmp", string(rune('a'+i))), "proj")
	}
	recent, _ := ls.RecentProjects()
	if len(recent) > 20 {
		t.Errorf("recent projects count = %d, want <= 20", len(recent))
	}
}

func TestProjectState_RoundTrip(t *testing.T) {
	dir := t.TempDir()
	ls := NewLocalState(dir)

	projectPath := "/tmp/my-project"

	// No state initially
	state, err := ls.GetProjectState(projectPath)
	if err != nil {
		t.Fatalf("GetProjectState failed: %v", err)
	}
	if state.ActiveConnector != "" {
		t.Errorf("ActiveConnector = %q, want empty", state.ActiveConnector)
	}

	// Set state
	state.ActiveConnector = "mock-training"
	if err := ls.SetProjectState(projectPath, state); err != nil {
		t.Fatalf("SetProjectState failed: %v", err)
	}

	// Read it back
	got, _ := ls.GetProjectState(projectPath)
	if got.ActiveConnector != "mock-training" {
		t.Errorf("ActiveConnector = %q, want %q", got.ActiveConnector, "mock-training")
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -run "TestRecentProjects|TestProjectState" -v`

Expected: FAIL — `NewLocalState`, `LocalState` not defined

- [ ] **Step 3: Write the local state implementation**

Create `internal/project/localstate.go`:

```go
package project

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

const maxRecentProjects = 20

// RecentProject is an entry in the recent projects list.
type RecentProject struct {
	Path       string `json:"path"`
	Name       string `json:"name"`
	LastOpened int64  `json:"lastOpened"`
}

// ProjectState holds machine-local per-project state.
type ProjectState struct {
	ActiveConnector string `json:"activeConnector,omitempty"`
	RecordingMode   string `json:"recordingMode,omitempty"` // "", "off", "on-failure", "always"
}

// LocalState manages machine-local Flux configuration files.
type LocalState struct {
	dir string
}

// NewLocalState creates a LocalState rooted at the given config directory.
func NewLocalState(dir string) *LocalState {
	return &LocalState{dir: dir}
}

// RecentProjects loads the recent projects list.
func (ls *LocalState) RecentProjects() ([]RecentProject, error) {
	path := filepath.Join(ls.dir, "recent-projects.json")
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []RecentProject{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("reading recent projects: %w", err)
	}

	var recent []RecentProject
	if err := json.Unmarshal(data, &recent); err != nil {
		return nil, fmt.Errorf("parsing recent projects: %w", err)
	}
	return recent, nil
}

// AddRecentProject adds or moves a project to the top of the recent list.
func (ls *LocalState) AddRecentProject(projectPath, name string) error {
	recent, err := ls.RecentProjects()
	if err != nil {
		recent = []RecentProject{}
	}

	// Remove existing entry with same path
	filtered := make([]RecentProject, 0, len(recent))
	for _, r := range recent {
		if r.Path != projectPath {
			filtered = append(filtered, r)
		}
	}

	// Prepend new entry
	entry := RecentProject{
		Path:       projectPath,
		Name:       name,
		LastOpened: time.Now().Unix(),
	}
	filtered = append([]RecentProject{entry}, filtered...)

	// Trim to max
	if len(filtered) > maxRecentProjects {
		filtered = filtered[:maxRecentProjects]
	}

	return ls.writeJSON("recent-projects.json", filtered)
}

// GetProjectState loads per-project machine-local state.
func (ls *LocalState) GetProjectState(projectPath string) (ProjectState, error) {
	allState, err := ls.loadProjectStates()
	if err != nil {
		return ProjectState{}, err
	}

	state, ok := allState[projectPath]
	if !ok {
		return ProjectState{}, nil
	}
	return state, nil
}

// SetProjectState saves per-project machine-local state.
func (ls *LocalState) SetProjectState(projectPath string, state ProjectState) error {
	allState, err := ls.loadProjectStates()
	if err != nil {
		allState = make(map[string]ProjectState)
	}
	allState[projectPath] = state
	return ls.writeJSON("project-state.json", allState)
}

func (ls *LocalState) loadProjectStates() (map[string]ProjectState, error) {
	path := filepath.Join(ls.dir, "project-state.json")
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return make(map[string]ProjectState), nil
	}
	if err != nil {
		return nil, fmt.Errorf("reading project state: %w", err)
	}

	var states map[string]ProjectState
	if err := json.Unmarshal(data, &states); err != nil {
		return nil, fmt.Errorf("parsing project state: %w", err)
	}
	return states, nil
}

func (ls *LocalState) writeJSON(filename string, v any) error {
	if err := os.MkdirAll(ls.dir, 0755); err != nil {
		return fmt.Errorf("creating config dir: %w", err)
	}
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling %s: %w", filename, err)
	}
	path := filepath.Join(ls.dir, filename)
	return os.WriteFile(path, data, 0644)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -run "TestRecentProjects|TestProjectState" -v`

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add internal/project/localstate.go internal/project/localstate_test.go
git commit -m "feat(project): add machine-local state (recent projects, per-project state)"
```

---

## Task 8: Wire Project Store into App + Wails API

**Files:**
- Modify: `app.go`
- Create: `project_api.go`

- [ ] **Step 1: Update app.go to include project store and local state**

In `app.go`, add the import:

```go
"github.com/kstruzzieri/flux-ml/internal/project"
```

Add fields to the `App` struct:

```go
type App struct {
	ctx         context.Context
	configPath  string
	configDir   string
	db          *database.DB
	experiments *experiment.Store
	events      *event.Store
	metrics     *metrics.Store
	annotations *annotation.Store
	projects    *project.Store
	localState  *project.LocalState
	dbError     string
}
```

In `NewApp()`, store the `fluxDir` in `configDir`:

```go
return &App{
	configPath: filepath.Join(fluxDir, "layout.json"),
	configDir:  fluxDir,
}
```

In `startup()`, after creating the annotation store, add:

```go
a.projects = project.NewStore(db)
a.localState = project.NewLocalState(filepath.Dir(dbPath))
```

(The `filepath.Dir(dbPath)` is `~/.config/Flux/`, same as `fluxDir`.)

- [ ] **Step 2: Create project_api.go with Wails-bound methods**

Create `project_api.go`:

```go
package main

import (
	"fmt"

	"github.com/kstruzzieri/flux-ml/internal/project"
)

// CreateProject creates a new project from a template and registers it in the database.
func (a *App) CreateProject(name, dir, template string) (*project.Project, error) {
	if a.projects == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	// Scaffold the directory
	if err := project.Scaffold(dir, name, template); err != nil {
		return nil, fmt.Errorf("scaffolding project: %w", err)
	}

	// Register in database
	proj, err := a.projects.Create(name, dir)
	if err != nil {
		return nil, fmt.Errorf("registering project: %w", err)
	}

	// Add to recent projects
	if a.localState != nil {
		a.localState.AddRecentProject(dir, name)
	}

	a.emitEvent("project:created", proj)
	return proj, nil
}

// OpenProject opens an existing project directory. It reads flux.yaml,
// registers the project if not already in the database, and returns the project.
func (a *App) OpenProject(dir string) (*project.Project, error) {
	if a.projects == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	if !project.IsProject(dir) {
		return nil, fmt.Errorf("not a Flux project: %s (no flux.yaml found)", dir)
	}

	cfg, err := project.LoadConfig(dir)
	if err != nil {
		return nil, fmt.Errorf("reading project config: %w", err)
	}

	// Check if already registered
	proj, err := a.projects.GetByPath(dir)
	if err != nil {
		// Not registered — create a new record
		proj, err = a.projects.Create(cfg.Name, dir)
		if err != nil {
			return nil, fmt.Errorf("registering project: %w", err)
		}
	}

	// Update recent projects
	if a.localState != nil {
		a.localState.AddRecentProject(dir, cfg.Name)
	}

	a.emitEvent("project:opened", proj)
	return proj, nil
}

// ListRecentProjects returns the user's recently opened projects.
func (a *App) ListRecentProjects() ([]project.RecentProject, error) {
	if a.localState == nil {
		return []project.RecentProject{}, nil
	}
	return a.localState.RecentProjects()
}

// GetProjectConfig reads and returns the flux.yaml config for a project directory.
func (a *App) GetProjectConfig(dir string) (*project.FluxConfig, error) {
	return project.LoadConfig(dir)
}

// IsFluxProject returns true if the given directory contains a flux.yaml file.
func (a *App) IsFluxProject(dir string) bool {
	return project.IsProject(dir)
}
```

- [ ] **Step 3: Verify the app compiles**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go build ./...`

Expected: Build succeeds with no errors

- [ ] **Step 4: Run all tests to verify no regressions**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/... -v`

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add app.go project_api.go
git commit -m "feat: wire project store and local state into App, add Wails-bound project API"
```

---

## Task 9: Update Experiment API for Project Scoping

**Files:**
- Modify: `experiment_api.go`

- [ ] **Step 1: Add ListExperimentsByProject to experiment_api.go**

Add to `experiment_api.go`:

```go
// ListExperimentsByProject returns experiments scoped to a specific project.
func (a *App) ListExperimentsByProject(projectID string) ([]experiment.Experiment, error) {
	if a.experiments == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.experiments.ListByProject(projectID)
}

// CreateExperimentInProject creates a new experiment scoped to a project.
func (a *App) CreateExperimentInProject(name, config, projectID string) (*experiment.Experiment, error) {
	if a.experiments == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	exp, err := a.experiments.CreateWithProject(name, config, projectID)
	if err != nil {
		return nil, err
	}
	a.emitEvent("experiment:created", exp)
	return exp, nil
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go build ./...`

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add experiment_api.go
git commit -m "feat(api): add ListExperimentsByProject and CreateExperimentInProject"
```

---

## Task 10: Full Integration Test

**Files:**
- Create: `internal/project/integration_test.go`

- [ ] **Step 1: Write an end-to-end integration test**

Create `internal/project/integration_test.go`:

```go
package project

import (
	"path/filepath"
	"testing"

	"github.com/kstruzzieri/flux-ml/internal/database"
	"github.com/kstruzzieri/flux-ml/internal/experiment"
)

func TestProjectIntegration_FullWorkflow(t *testing.T) {
	// Set up database
	dbDir := t.TempDir()
	dbPath := filepath.Join(dbDir, "test.db")
	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("Open DB failed: %v", err)
	}
	defer db.Close()

	projStore := NewStore(db)
	expStore := experiment.NewStore(db)

	// 1. Scaffold a project
	projDir := filepath.Join(t.TempDir(), "my-project")
	if err := Scaffold(projDir, "my-project", "reward-model"); err != nil {
		t.Fatalf("Scaffold failed: %v", err)
	}

	// 2. Verify flux.yaml is readable
	if !IsProject(projDir) {
		t.Fatal("scaffolded directory is not a project")
	}
	cfg, err := LoadConfig(projDir)
	if err != nil {
		t.Fatalf("LoadConfig failed: %v", err)
	}
	if cfg.Name != "my-project" {
		t.Errorf("config Name = %q, want %q", cfg.Name, "my-project")
	}

	// 3. Register project in DB
	proj, err := projStore.Create(cfg.Name, projDir)
	if err != nil {
		t.Fatalf("Create project failed: %v", err)
	}

	// 4. Create experiments scoped to this project
	exp1, err := expStore.CreateWithProject("run-1", `{"lr":0.01}`, proj.ID)
	if err != nil {
		t.Fatalf("CreateWithProject run-1 failed: %v", err)
	}
	if exp1.ProjectID == nil || *exp1.ProjectID != proj.ID {
		t.Errorf("exp1 ProjectID = %v, want %q", exp1.ProjectID, proj.ID)
	}

	exp2, err := expStore.CreateWithProject("run-2", `{"lr":0.001}`, proj.ID)
	if err != nil {
		t.Fatalf("CreateWithProject run-2 failed: %v", err)
	}

	// 5. Create an unscoped experiment
	_, err = expStore.Create("unscoped-run", `{}`)
	if err != nil {
		t.Fatalf("Create unscoped failed: %v", err)
	}

	// 6. ListByProject returns only project experiments
	projectExps, err := expStore.ListByProject(proj.ID)
	if err != nil {
		t.Fatalf("ListByProject failed: %v", err)
	}
	if len(projectExps) != 2 {
		t.Fatalf("ListByProject returned %d, want 2", len(projectExps))
	}

	// 7. Regular List returns all 3
	allExps, err := expStore.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(allExps) != 3 {
		t.Fatalf("List returned %d, want 3", len(allExps))
	}

	// 8. Test local state
	localDir := t.TempDir()
	ls := NewLocalState(localDir)
	if err := ls.AddRecentProject(projDir, cfg.Name); err != nil {
		t.Fatalf("AddRecentProject failed: %v", err)
	}
	recent, err := ls.RecentProjects()
	if err != nil {
		t.Fatalf("RecentProjects failed: %v", err)
	}
	if len(recent) != 1 || recent[0].Path != projDir {
		t.Errorf("recent projects: got %v", recent)
	}

	_ = exp2 // used above in creation
}
```

- [ ] **Step 2: Run the integration test**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -run TestProjectIntegration -v`

Expected: PASS

- [ ] **Step 3: Run the full test suite**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/... -v`

Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add internal/project/integration_test.go
git commit -m "test(project): add end-to-end integration test for project workflow"
```

---

## Task 11: TDD Documentation

**Files:**
- Create: `docs/tdd/034-project-model.md`

- [ ] **Step 1: Create the TDD document**

Create `docs/tdd/034-project-model.md` following the pattern of existing TDD docs in the project. Include:

- **Issue Summary:** Introduces the project model — `flux.yaml`, `projects` table, project-scoped experiments, scaffold templates, machine-local state
- **Acceptance Criteria:**
  - `005_projects.sql` migration creates `projects` table and adds `project_id` FK to experiments
  - `project.Store` provides Create, GetByID, GetByPath, List, Delete
  - `LoadConfig` parses `flux.yaml` with validation; `IsProject` detects project dirs
  - `Scaffold` creates directories from `blank` and `reward-model` templates
  - `LocalState` manages recent projects list and per-project machine-local state
  - Existing experiments (no `project_id`) continue to work unchanged
  - `experiment.Store` gains `CreateWithProject` and `ListByProject`
  - App gains Wails-bound project API methods
- **Rationale:** Flux is evolving from a global dashboard to a project-scoped ML IDE. The nullable FK migration preserves backward compatibility while enabling project scoping.
- **Test Summary:** All tests in `internal/project/` and `internal/experiment/` pass. Integration test covers full workflow.

- [ ] **Step 2: Commit**

```bash
git add docs/tdd/034-project-model.md
git commit -m "docs: add TDD document for project model (issue #34)"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | DB Migration | `005_projects.sql` | `migrate_test.go` |
| 2 | YAML Dependency | — | `go.mod`, `go.sum` |
| 3 | Project Store CRUD | `store.go`, `store_test.go` | — |
| 4 | Config Parsing | `config.go`, `config_test.go` | — |
| 5 | Project-Scoped Experiments | — | `experiment/store.go`, `store_test.go` |
| 6 | Scaffold + Templates | `scaffold.go`, `scaffold_test.go`, templates/ | — |
| 7 | Local State | `localstate.go`, `localstate_test.go` | — |
| 8 | App Wiring | `project_api.go` | `app.go` |
| 9 | Experiment API Update | — | `experiment_api.go` |
| 10 | Integration Test | `integration_test.go` | — |
| 11 | TDD Documentation | `docs/tdd/034-project-model.md` | — |
