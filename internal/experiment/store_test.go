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

	// Create 3 experiments
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

	// Verify all names present
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

// --- Project Scoping Tests ---

// helper: create a project directly in the DB for testing
func createTestProject(t *testing.T, store *Store, id, name, path string) {
	t.Helper()
	_, err := store.db.Exec(
		`INSERT INTO projects (id, name, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		id, name, path, 1706745600, 1706745600,
	)
	if err != nil {
		t.Fatalf("insert test project failed: %v", err)
	}
}

func TestExperiment_ProjectID(t *testing.T) {
	store := newTestStore(t)
	createTestProject(t, store, "proj-001", "test-project", "/tmp/test")

	exp, err := store.CreateWithProject("scoped-exp", `{}`, "proj-001")
	if err != nil {
		t.Fatalf("CreateWithProject failed: %v", err)
	}
	if exp.ProjectID == nil || *exp.ProjectID != "proj-001" {
		t.Errorf("ProjectID = %v, want 'proj-001'", exp.ProjectID)
	}

	// Regular Create should leave ProjectID nil
	unscoped, err := store.Create("unscoped", `{}`)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if unscoped.ProjectID != nil {
		t.Errorf("unscoped ProjectID = %v, want nil", unscoped.ProjectID)
	}
}

func TestCreateWithProject_EmptyProjectID(t *testing.T) {
	store := newTestStore(t)
	_, err := store.CreateWithProject("test", `{}`, "")
	if err == nil {
		t.Fatal("expected error for empty projectID, got nil")
	}
}

func TestListByProject(t *testing.T) {
	store := newTestStore(t)
	createTestProject(t, store, "proj-001", "project-a", "/tmp/a")
	createTestProject(t, store, "proj-002", "project-b", "/tmp/b")

	// Create experiments scoped to different projects
	store.CreateWithProject("exp-a1", `{}`, "proj-001")
	store.CreateWithProject("exp-a2", `{}`, "proj-001")
	store.CreateWithProject("exp-b1", `{}`, "proj-002")
	store.Create("unscoped", `{}`)

	list, err := store.ListByProject("proj-001")
	if err != nil {
		t.Fatalf("ListByProject failed: %v", err)
	}
	if len(list) != 2 {
		t.Errorf("ListByProject returned %d, want 2", len(list))
	}
	for _, exp := range list {
		if exp.ProjectID == nil || *exp.ProjectID != "proj-001" {
			t.Errorf("experiment %q has wrong project: %v", exp.Name, exp.ProjectID)
		}
	}
}

func TestListUnscoped(t *testing.T) {
	store := newTestStore(t)
	createTestProject(t, store, "proj-001", "project", "/tmp/proj")

	store.CreateWithProject("scoped", `{}`, "proj-001")
	store.Create("unscoped-1", `{}`)
	store.Create("unscoped-2", `{}`)

	list, err := store.ListUnscoped()
	if err != nil {
		t.Fatalf("ListUnscoped failed: %v", err)
	}
	if len(list) != 2 {
		t.Errorf("ListUnscoped returned %d, want 2", len(list))
	}
	for _, exp := range list {
		if exp.ProjectID != nil {
			t.Errorf("experiment %q has project_id: %v", exp.Name, exp.ProjectID)
		}
	}
}

func TestListAll_StillReturnsEverything(t *testing.T) {
	store := newTestStore(t)
	createTestProject(t, store, "proj-001", "project", "/tmp/proj")

	store.CreateWithProject("scoped", `{}`, "proj-001")
	store.Create("unscoped", `{}`)

	list, err := store.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(list) != 2 {
		t.Errorf("List returned %d, want 2 (all experiments)", len(list))
	}
}

func TestClaimExperimentToProject_Success(t *testing.T) {
	store := newTestStore(t)
	createTestProject(t, store, "proj-001", "project", "/tmp/proj")

	exp, _ := store.Create("unscoped", `{}`)
	err := store.ClaimExperimentToProject(exp.ID, "proj-001")
	if err != nil {
		t.Fatalf("ClaimExperimentToProject failed: %v", err)
	}

	got, _ := store.GetByID(exp.ID)
	if got.ProjectID == nil || *got.ProjectID != "proj-001" {
		t.Errorf("after claim, ProjectID = %v, want 'proj-001'", got.ProjectID)
	}
}

func TestClaimExperimentToProject_AlreadyScoped(t *testing.T) {
	store := newTestStore(t)
	createTestProject(t, store, "proj-001", "project-a", "/tmp/a")
	createTestProject(t, store, "proj-002", "project-b", "/tmp/b")

	exp, _ := store.CreateWithProject("already-scoped", `{}`, "proj-001")
	err := store.ClaimExperimentToProject(exp.ID, "proj-002")
	if err == nil {
		t.Fatal("expected error when claiming already-scoped experiment, got nil")
	}
}

func TestClaimExperimentToProject_NotFound(t *testing.T) {
	store := newTestStore(t)
	createTestProject(t, store, "proj-001", "project", "/tmp/proj")

	err := store.ClaimExperimentToProject("nonexistent", "proj-001")
	if err == nil {
		t.Fatal("expected error for nonexistent experiment, got nil")
	}
}
