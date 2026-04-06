package project

import (
	"path/filepath"
	"testing"

	"github.com/kstruzzieri/flux-ml/internal/database"
)

func newTestStore(t *testing.T) *Store {
	t.Helper()
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")
	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return NewStore(db)
}

func TestCreate_Success(t *testing.T) {
	store := newTestStore(t)
	dir := t.TempDir()

	proj, err := store.Create("my-project", dir)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if len(proj.ID) != 36 {
		t.Errorf("ID length = %d, want 36 (UUID)", len(proj.ID))
	}
	if proj.Name != "my-project" {
		t.Errorf("Name = %q, want %q", proj.Name, "my-project")
	}
	// Path should be canonicalized (absolute)
	if !filepath.IsAbs(proj.Path) {
		t.Errorf("Path %q is not absolute", proj.Path)
	}
	if proj.CreatedAt == 0 {
		t.Error("CreatedAt should not be zero")
	}
	if proj.UpdatedAt == 0 {
		t.Error("UpdatedAt should not be zero")
	}
}

func TestCreate_EmptyName(t *testing.T) {
	store := newTestStore(t)
	_, err := store.Create("", "/tmp/whatever")
	if err == nil {
		t.Fatal("expected error for empty name, got nil")
	}
}

func TestCreate_EmptyPath(t *testing.T) {
	store := newTestStore(t)
	_, err := store.Create("proj", "")
	if err == nil {
		t.Fatal("expected error for empty path, got nil")
	}
}

func TestCreate_DuplicatePath(t *testing.T) {
	store := newTestStore(t)
	dir := t.TempDir()

	_, err := store.Create("proj-1", dir)
	if err != nil {
		t.Fatalf("first Create failed: %v", err)
	}
	_, err = store.Create("proj-2", dir)
	if err == nil {
		t.Fatal("expected error for duplicate path, got nil")
	}
}

func TestCreate_DuplicatePathAfterCanonicalization(t *testing.T) {
	store := newTestStore(t)
	dir := t.TempDir()

	// First create with canonical path
	_, err := store.Create("proj-1", dir)
	if err != nil {
		t.Fatalf("first Create failed: %v", err)
	}

	// Second create with trailing slash — should canonicalize to the same path
	_, err = store.Create("proj-2", dir+"/")
	if err == nil {
		t.Fatal("expected error for duplicate path after canonicalization, got nil")
	}
}

func TestGetByPath_Canonicalizes(t *testing.T) {
	store := newTestStore(t)
	dir := t.TempDir()

	created, err := store.Create("my-project", dir)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Look up with trailing slash
	got, err := store.GetByPath(dir + "/")
	if err != nil {
		t.Fatalf("GetByPath failed: %v", err)
	}
	if got.ID != created.ID {
		t.Errorf("GetByPath returned ID=%q, want %q", got.ID, created.ID)
	}
}

func TestGetByID_Found(t *testing.T) {
	store := newTestStore(t)
	dir := t.TempDir()

	created, err := store.Create("my-project", dir)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	got, err := store.GetByID(created.ID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}
	if got.Name != "my-project" {
		t.Errorf("Name = %q, want %q", got.Name, "my-project")
	}
}

func TestGetByID_NotFound(t *testing.T) {
	store := newTestStore(t)
	_, err := store.GetByID("nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent ID, got nil")
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
		t.Errorf("List returned %d projects, want 0", len(list))
	}
}

func TestList_ReturnsAll(t *testing.T) {
	store := newTestStore(t)
	dirs := []string{t.TempDir(), t.TempDir(), t.TempDir()}
	for i, dir := range dirs {
		if _, err := store.Create("proj-"+string(rune('a'+i)), dir); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	list, err := store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(list) != 3 {
		t.Errorf("List returned %d projects, want 3", len(list))
	}
}

func TestDelete_EmptyProject(t *testing.T) {
	store := newTestStore(t)
	dir := t.TempDir()

	created, err := store.Create("my-project", dir)
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

func TestDelete_WithScopedExperiments(t *testing.T) {
	store := newTestStore(t)
	dir := t.TempDir()

	proj, err := store.Create("my-project", dir)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Insert a scoped experiment directly
	_, err = store.db.Exec(
		`INSERT INTO experiments (id, name, config, status, created_at, updated_at, project_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		"exp-001", "scoped", `{}`, "pending", 1706745600, 1706745600, proj.ID,
	)
	if err != nil {
		t.Fatalf("insert scoped experiment failed: %v", err)
	}

	err = store.Delete(proj.ID)
	if err == nil {
		t.Fatal("expected error deleting project with scoped experiments, got nil")
	}

	// Verify project still exists
	_, err = store.GetByID(proj.ID)
	if err != nil {
		t.Fatalf("project should still exist after failed delete: %v", err)
	}
}

func TestDelete_NotFound(t *testing.T) {
	store := newTestStore(t)
	err := store.Delete("nonexistent")
	if err == nil {
		t.Fatal("expected error for nonexistent ID, got nil")
	}
}
