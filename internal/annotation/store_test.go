package annotation

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/kstruzzieri/flux-ml/internal/database"
)

type testAnnotationStore struct {
	*Store
	db           *database.DB
	experimentID string
}

func newTestAnnotationStore(t *testing.T) *testAnnotationStore {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := database.Open(path)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	expID := createTestExperiment(t, db, "test-experiment")
	return &testAnnotationStore{
		Store:        NewStore(db),
		db:           db,
		experimentID: expID,
	}
}

func createTestExperiment(t *testing.T, db *database.DB, name string) string {
	t.Helper()
	id := uuid.New().String()
	now := time.Now().Unix()
	_, err := db.Exec(
		`INSERT INTO experiments (id, name, config, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		id, name, `{}`, "pending", now, now,
	)
	if err != nil {
		t.Fatalf("failed to create test experiment: %v", err)
	}
	return id
}

// --- Create tests ---

func TestCreate(t *testing.T) {
	store := newTestAnnotationStore(t)
	ann, err := store.Create(store.experimentID, 100, "checkpoint", "Step 100 checkpoint", `{"path": "/tmp/ckpt"}`)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if ann.ID == 0 {
		t.Error("expected non-zero ID")
	}
	if ann.ExperimentID != store.experimentID {
		t.Errorf("ExperimentID = %q, want %q", ann.ExperimentID, store.experimentID)
	}
	if ann.Step != 100 {
		t.Errorf("Step = %d, want 100", ann.Step)
	}
	if ann.Type != "checkpoint" {
		t.Errorf("Type = %q, want %q", ann.Type, "checkpoint")
	}
	if ann.Label != "Step 100 checkpoint" {
		t.Errorf("Label = %q, want %q", ann.Label, "Step 100 checkpoint")
	}
	if ann.Data != `{"path": "/tmp/ckpt"}` {
		t.Errorf("Data = %q, want %q", ann.Data, `{"path": "/tmp/ckpt"}`)
	}
	if ann.CreatedAt == 0 {
		t.Error("expected non-zero CreatedAt")
	}
}

func TestCreate_EmptyExperimentID(t *testing.T) {
	store := newTestAnnotationStore(t)
	_, err := store.Create("", 100, "checkpoint", "label", "")
	if err == nil {
		t.Fatal("expected error for empty experiment ID, got nil")
	}
}

func TestCreate_EmptyType(t *testing.T) {
	store := newTestAnnotationStore(t)
	_, err := store.Create(store.experimentID, 100, "", "label", "")
	if err == nil {
		t.Fatal("expected error for empty type, got nil")
	}
}

func TestCreate_ForeignKeyViolation(t *testing.T) {
	store := newTestAnnotationStore(t)
	_, err := store.Create("nonexistent-id", 100, "checkpoint", "label", "")
	if err == nil {
		t.Fatal("expected foreign key error, got nil")
	}
}

func TestCreate_EmptyData(t *testing.T) {
	store := newTestAnnotationStore(t)
	ann, err := store.Create(store.experimentID, 50, "note", "A note", "")
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if ann.Data != "" {
		t.Errorf("Data = %q, want empty string", ann.Data)
	}
}

// --- Query tests ---

func TestQuery_EmptyExperimentID(t *testing.T) {
	store := newTestAnnotationStore(t)
	_, err := store.Query("", "", 0, 0)
	if err == nil {
		t.Fatal("expected error for empty experiment ID, got nil")
	}
}

func TestQuery_All(t *testing.T) {
	store := newTestAnnotationStore(t)
	store.Create(store.experimentID, 300, "alert", "Drift detected", "")
	store.Create(store.experimentID, 100, "checkpoint", "Ckpt 100", "")
	store.Create(store.experimentID, 200, "config_change", "LR changed", "")

	results, err := store.Query(store.experimentID, "", 0, 0)
	if err != nil {
		t.Fatalf("Query failed: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 annotations, got %d", len(results))
	}
	// Verify ASC order by step
	for i := 1; i < len(results); i++ {
		if results[i].Step < results[i-1].Step {
			t.Errorf("annotations not in step order: [%d].Step=%d < [%d].Step=%d",
				i, results[i].Step, i-1, results[i-1].Step)
		}
	}
}

func TestQuery_FilterByType(t *testing.T) {
	store := newTestAnnotationStore(t)
	store.Create(store.experimentID, 100, "checkpoint", "Ckpt 100", "")
	store.Create(store.experimentID, 200, "alert", "Drift", "")
	store.Create(store.experimentID, 300, "checkpoint", "Ckpt 300", "")

	results, err := store.Query(store.experimentID, "checkpoint", 0, 0)
	if err != nil {
		t.Fatalf("Query failed: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 checkpoint annotations, got %d", len(results))
	}
	for _, a := range results {
		if a.Type != "checkpoint" {
			t.Errorf("Type = %q, want %q", a.Type, "checkpoint")
		}
	}
}

func TestQuery_FilterByStepRange(t *testing.T) {
	store := newTestAnnotationStore(t)
	store.Create(store.experimentID, 50, "note", "Early", "")
	store.Create(store.experimentID, 100, "checkpoint", "Mid", "")
	store.Create(store.experimentID, 200, "alert", "Late mid", "")
	store.Create(store.experimentID, 300, "note", "Late", "")

	results, err := store.Query(store.experimentID, "", 100, 200)
	if err != nil {
		t.Fatalf("Query failed: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 annotations in step range [100,200], got %d", len(results))
	}
	for _, a := range results {
		if a.Step < 100 || a.Step > 200 {
			t.Errorf("Step = %d, want in range [100, 200]", a.Step)
		}
	}
}

func TestQuery_NoMatches(t *testing.T) {
	store := newTestAnnotationStore(t)
	results, err := store.Query(store.experimentID, "nonexistent", 0, 0)
	if err != nil {
		t.Fatalf("Query failed: %v", err)
	}
	if results == nil {
		t.Fatal("Query returned nil, want empty slice")
	}
	if len(results) != 0 {
		t.Errorf("expected 0 annotations, got %d", len(results))
	}
}

// --- Delete tests ---

func TestDelete(t *testing.T) {
	store := newTestAnnotationStore(t)
	ann, _ := store.Create(store.experimentID, 100, "note", "To be deleted", "")

	err := store.Delete(ann.ID)
	if err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	results, _ := store.Query(store.experimentID, "", 0, 0)
	if len(results) != 0 {
		t.Errorf("expected 0 annotations after delete, got %d", len(results))
	}
}

func TestDelete_NotFound(t *testing.T) {
	store := newTestAnnotationStore(t)
	err := store.Delete(99999)
	if err == nil {
		t.Fatal("expected error for non-existent ID, got nil")
	}
}

// --- Cascade delete test ---

func TestCascadeDelete(t *testing.T) {
	store := newTestAnnotationStore(t)
	store.Create(store.experimentID, 100, "checkpoint", "Ckpt", "")
	store.Create(store.experimentID, 200, "note", "Note", "")

	// Delete the experiment directly
	if _, err := store.db.Exec(`DELETE FROM experiments WHERE id = ?`, store.experimentID); err != nil {
		t.Fatalf("Delete experiment failed: %v", err)
	}

	// Annotations should be cascade-deleted
	results, err := store.Query(store.experimentID, "", 0, 0)
	if err != nil {
		t.Fatalf("Query after delete failed: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 annotations after cascade delete, got %d", len(results))
	}
}
