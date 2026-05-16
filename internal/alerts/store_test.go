package alerts

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/kstruzzieri/flux-ml/internal/database"
)

type testAlertStore struct {
	*Store
	db           *database.DB
	experimentID string
}

func newTestAlertStore(t *testing.T) *testAlertStore {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := database.Open(path)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	expID := createAlertTestExperiment(t, db)
	return &testAlertStore{
		Store:        NewStore(db),
		db:           db,
		experimentID: expID,
	}
}

func createAlertTestExperiment(t *testing.T, db *database.DB) string {
	t.Helper()
	id := uuid.New().String()
	now := time.Now().Unix()
	_, err := db.Exec(
		`INSERT INTO experiments (id, name, config, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		id, "alert-test", `{}`, "running", now, now,
	)
	if err != nil {
		t.Fatalf("failed to create test experiment: %v", err)
	}
	return id
}

func TestStoreUpsertAlert(t *testing.T) {
	store := newTestAlertStore(t)

	inserted, err := store.UpsertAlert(Alert{
		ExperimentID: store.experimentID,
		Type:         TypeKLDrift,
		Step:         10,
		Confidence:   0.72,
		Data:         `{"kl":"up"}`,
		CreatedAt:    1000,
	})
	if err != nil {
		t.Fatalf("UpsertAlert failed: %v", err)
	}
	if inserted.ID == 0 {
		t.Fatal("expected inserted alert ID")
	}
	if inserted.Pattern != PatternKLDrift {
		t.Errorf("Pattern = %q, want %q", inserted.Pattern, PatternKLDrift)
	}
	if inserted.Status != LevelElevated {
		t.Errorf("Status = %q, want %q", inserted.Status, LevelElevated)
	}

	updated, err := store.UpsertAlert(Alert{
		ExperimentID: store.experimentID,
		Type:         TypeKLDrift,
		Step:         10,
		Confidence:   0.91,
		Data:         `{"kl":"steep_up"}`,
		CreatedAt:    1001,
	})
	if err != nil {
		t.Fatalf("second UpsertAlert failed: %v", err)
	}
	if updated.ID != inserted.ID {
		t.Errorf("upsert inserted duplicate ID %d, want %d", updated.ID, inserted.ID)
	}
	if updated.CreatedAt != inserted.CreatedAt {
		t.Errorf("CreatedAt changed on upsert: got %d, want %d", updated.CreatedAt, inserted.CreatedAt)
	}
	if updated.Status != LevelDetected {
		t.Errorf("Status = %q, want %q", updated.Status, LevelDetected)
	}

	alerts, err := store.ListByExperiment(store.experimentID)
	if err != nil {
		t.Fatalf("ListByExperiment failed: %v", err)
	}
	if len(alerts) != 1 {
		t.Fatalf("expected 1 deduped alert, got %d", len(alerts))
	}
	if alerts[0].Confidence != 0.91 {
		t.Errorf("Confidence = %.2f, want 0.91", alerts[0].Confidence)
	}
}

func TestStoreUpsertAlertDoesNotMutateAcknowledgedHistory(t *testing.T) {
	store := newTestAlertStore(t)

	inserted, err := store.UpsertAlert(Alert{
		ExperimentID: store.experimentID,
		Type:         TypeSycophancy,
		Step:         5,
		Confidence:   0.7,
		Data:         `{"entropy":"down"}`,
		CreatedAt:    1000,
	})
	if err != nil {
		t.Fatalf("UpsertAlert failed: %v", err)
	}

	if _, err := store.db.Exec(`UPDATE alerts SET acknowledged = 1 WHERE id = ?`, inserted.ID); err != nil {
		t.Fatalf("failed to acknowledge alert: %v", err)
	}

	updated, err := store.UpsertAlert(Alert{
		ExperimentID: store.experimentID,
		Type:         TypeSycophancy,
		Step:         5,
		Confidence:   0.8,
		Data:         `{"entropy":"steep_down"}`,
		CreatedAt:    1001,
	})
	if err != nil {
		t.Fatalf("second UpsertAlert failed: %v", err)
	}
	if updated.ID == inserted.ID {
		t.Fatal("expected acknowledged alert to remain historical and a new open alert to be created")
	}
	if updated.Acknowledged {
		t.Fatal("expected new alert episode to be open")
	}

	var acknowledged int
	var createdAt int64
	if err := store.db.QueryRow(
		`SELECT acknowledged, created_at FROM alerts WHERE id = ?`,
		inserted.ID,
	).Scan(&acknowledged, &createdAt); err != nil {
		t.Fatalf("failed to query historical alert: %v", err)
	}
	if acknowledged != 1 {
		t.Fatal("expected original alert to remain acknowledged")
	}
	if createdAt != inserted.CreatedAt {
		t.Errorf("historical CreatedAt changed: got %d, want %d", createdAt, inserted.CreatedAt)
	}
}

func TestStoreUpsertAlertRefreshesOpenAlertInsteadOfAppendingEveryStep(t *testing.T) {
	store := newTestAlertStore(t)

	inserted, err := store.UpsertAlert(Alert{
		ExperimentID: store.experimentID,
		Type:         TypeRewardCollapse,
		Step:         10,
		Confidence:   0.7,
		Data:         `{"variance":"down"}`,
		CreatedAt:    1000,
	})
	if err != nil {
		t.Fatalf("UpsertAlert failed: %v", err)
	}

	updated, err := store.UpsertAlert(Alert{
		ExperimentID: store.experimentID,
		Type:         TypeRewardCollapse,
		Step:         11,
		Confidence:   0.75,
		Data:         `{"variance":"still_down"}`,
		CreatedAt:    1001,
	})
	if err != nil {
		t.Fatalf("second UpsertAlert failed: %v", err)
	}
	if updated.ID != inserted.ID {
		t.Errorf("open alert ID = %d, want %d", updated.ID, inserted.ID)
	}
	if updated.Step != 11 {
		t.Errorf("Step = %d, want latest step 11", updated.Step)
	}

	alerts, err := store.ListByExperiment(store.experimentID)
	if err != nil {
		t.Fatalf("ListByExperiment failed: %v", err)
	}
	if len(alerts) != 1 {
		t.Fatalf("expected 1 open alert after refresh, got %d", len(alerts))
	}
}

func TestStoreUpsertAlertCreatesNewEpisodeAfterAcknowledgement(t *testing.T) {
	store := newTestAlertStore(t)

	inserted, err := store.UpsertAlert(Alert{
		ExperimentID: store.experimentID,
		Type:         TypeLengthGaming,
		Step:         10,
		Confidence:   0.9,
		CreatedAt:    1000,
	})
	if err != nil {
		t.Fatalf("UpsertAlert failed: %v", err)
	}
	if _, err := store.db.Exec(`UPDATE alerts SET acknowledged = 1 WHERE id = ?`, inserted.ID); err != nil {
		t.Fatalf("failed to acknowledge alert: %v", err)
	}

	next, err := store.UpsertAlert(Alert{
		ExperimentID: store.experimentID,
		Type:         TypeLengthGaming,
		Step:         11,
		Confidence:   0.92,
		CreatedAt:    1001,
	})
	if err != nil {
		t.Fatalf("second UpsertAlert failed: %v", err)
	}
	if next.ID == inserted.ID {
		t.Fatal("expected new alert episode after acknowledgement")
	}

	alerts, err := store.ListByExperiment(store.experimentID)
	if err != nil {
		t.Fatalf("ListByExperiment failed: %v", err)
	}
	if len(alerts) != 2 {
		t.Fatalf("expected acknowledged history plus new open alert, got %d", len(alerts))
	}
}

func TestStoreListByExperimentEmpty(t *testing.T) {
	store := newTestAlertStore(t)

	alerts, err := store.ListByExperiment(store.experimentID)
	if err != nil {
		t.Fatalf("ListByExperiment failed: %v", err)
	}
	if alerts == nil {
		t.Fatal("ListByExperiment returned nil, want empty slice")
	}
	if len(alerts) != 0 {
		t.Fatalf("expected 0 alerts, got %d", len(alerts))
	}
}

func TestStoreUpsertAlertValidation(t *testing.T) {
	store := newTestAlertStore(t)

	if _, err := store.UpsertAlert(Alert{}); err == nil {
		t.Fatal("expected validation error for empty alert")
	}
}
