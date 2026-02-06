package event

import (
	"fmt"
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/kstruzzieri/flux-ml/internal/database"
)

// testEventStore wraps Store with test helpers.
type testEventStore struct {
	*Store
	db           *database.DB
	experimentID string
}

// newTestEventStore creates an isolated test database with a pre-existing experiment.
func newTestEventStore(t *testing.T) *testEventStore {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := database.Open(path)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	expID := createTestExperiment(t, db, "test-experiment")
	return &testEventStore{
		Store:        NewStore(db),
		db:           db,
		experimentID: expID,
	}
}

// createTestExperiment inserts an experiment directly and returns its ID.
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

// insertEvent inserts an event with a specific timestamp directly via SQL.
func insertEvent(t *testing.T, db *database.DB, experimentID string, timestamp int64, eventType, data string) {
	t.Helper()
	_, err := db.Exec(
		`INSERT INTO events (experiment_id, timestamp, type, data) VALUES (?, ?, ?, ?)`,
		experimentID, timestamp, eventType, data,
	)
	if err != nil {
		t.Fatalf("failed to insert test event: %v", err)
	}
}

// --- Append tests ---

func TestAppend(t *testing.T) {
	store := newTestEventStore(t)
	data := `{"loss": 0.234, "reward": 0.89}`

	ev, err := store.Append(store.experimentID, TypeMetric, data)
	if err != nil {
		t.Fatalf("Append failed: %v", err)
	}

	if ev.ID <= 0 {
		t.Errorf("ID = %d, want > 0", ev.ID)
	}
	if ev.ExperimentID != store.experimentID {
		t.Errorf("ExperimentID = %q, want %q", ev.ExperimentID, store.experimentID)
	}
	if ev.Type != TypeMetric {
		t.Errorf("Type = %q, want %q", ev.Type, TypeMetric)
	}
	if ev.Data != data {
		t.Errorf("Data = %q, want %q", ev.Data, data)
	}
	now := time.Now().Unix()
	if ev.Timestamp < now-5 || ev.Timestamp > now+1 {
		t.Errorf("Timestamp = %d, want ~%d", ev.Timestamp, now)
	}
}

func TestAppend_EmptyExperimentID(t *testing.T) {
	store := newTestEventStore(t)
	_, err := store.Append("", TypeMetric, `{}`)
	if err == nil {
		t.Fatal("expected error for empty experiment ID, got nil")
	}
}

func TestAppend_InvalidType(t *testing.T) {
	store := newTestEventStore(t)
	_, err := store.Append(store.experimentID, "invalid_type", `{}`)
	if err == nil {
		t.Fatal("expected error for invalid event type, got nil")
	}
}

func TestAppend_ForeignKeyViolation(t *testing.T) {
	store := newTestEventStore(t)
	_, err := store.Append("nonexistent-id", TypeMetric, `{}`)
	if err == nil {
		t.Fatal("expected foreign key error, got nil")
	}
}

// --- Replay tests ---

func TestReplay_ChronologicalOrder(t *testing.T) {
	store := newTestEventStore(t)
	for i := 0; i < 3; i++ {
		if _, err := store.Append(store.experimentID, TypeMetric, fmt.Sprintf(`{"step": %d}`, i)); err != nil {
			t.Fatalf("Append %d failed: %v", i, err)
		}
	}

	events, err := store.Replay("", 0, 0, "")
	if err != nil {
		t.Fatalf("Replay failed: %v", err)
	}
	if len(events) != 3 {
		t.Fatalf("Replay returned %d events, want 3", len(events))
	}
	for i := 1; i < len(events); i++ {
		if events[i].Timestamp < events[i-1].Timestamp {
			t.Errorf("events not in chronological order: [%d].Timestamp=%d < [%d].Timestamp=%d",
				i, events[i].Timestamp, i-1, events[i-1].Timestamp)
		}
	}
}

func TestReplay_FilterByExperiment(t *testing.T) {
	store := newTestEventStore(t)
	exp2ID := createTestExperiment(t, store.db, "exp-2")

	store.Append(store.experimentID, TypeMetric, `{"src": "exp1"}`)
	store.Append(exp2ID, TypeMetric, `{"src": "exp2"}`)
	store.Append(store.experimentID, TypeAlert, `{"src": "exp1"}`)

	events, err := store.Replay(store.experimentID, 0, 0, "")
	if err != nil {
		t.Fatalf("Replay failed: %v", err)
	}
	if len(events) != 2 {
		t.Fatalf("Replay returned %d events, want 2", len(events))
	}
	for _, ev := range events {
		if ev.ExperimentID != store.experimentID {
			t.Errorf("ExperimentID = %q, want %q", ev.ExperimentID, store.experimentID)
		}
	}
}

func TestReplay_FilterByTimeRange(t *testing.T) {
	store := newTestEventStore(t)
	now := time.Now().Unix()

	insertEvent(t, store.db, store.experimentID, now-100, TypeMetric, `{"old": true}`)
	insertEvent(t, store.db, store.experimentID, now, TypeMetric, `{"current": true}`)
	insertEvent(t, store.db, store.experimentID, now+100, TypeMetric, `{"future": true}`)

	events, err := store.Replay("", now-50, now+50, "")
	if err != nil {
		t.Fatalf("Replay failed: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("Replay returned %d events, want 1", len(events))
	}
	if events[0].Data != `{"current": true}` {
		t.Errorf("Data = %q, want current event", events[0].Data)
	}
}

func TestReplay_FilterByType(t *testing.T) {
	store := newTestEventStore(t)
	store.Append(store.experimentID, TypeMetric, `{"type": "metric"}`)
	store.Append(store.experimentID, TypeAlert, `{"type": "alert"}`)
	store.Append(store.experimentID, TypeCheckpoint, `{"type": "checkpoint"}`)

	events, err := store.Replay("", 0, 0, TypeAlert)
	if err != nil {
		t.Fatalf("Replay failed: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("Replay returned %d events, want 1", len(events))
	}
	if events[0].Type != TypeAlert {
		t.Errorf("Type = %q, want %q", events[0].Type, TypeAlert)
	}
}

func TestReplay_CombinedFilters(t *testing.T) {
	store := newTestEventStore(t)
	exp2ID := createTestExperiment(t, store.db, "exp-2")
	now := time.Now().Unix()

	insertEvent(t, store.db, store.experimentID, now, TypeMetric, `{"match": true}`)
	insertEvent(t, store.db, store.experimentID, now, TypeAlert, `{"wrong_type": true}`)
	insertEvent(t, store.db, exp2ID, now, TypeMetric, `{"wrong_exp": true}`)
	insertEvent(t, store.db, store.experimentID, now-200, TypeMetric, `{"too_old": true}`)

	events, err := store.Replay(store.experimentID, now-50, now+50, TypeMetric)
	if err != nil {
		t.Fatalf("Replay failed: %v", err)
	}
	if len(events) != 1 {
		t.Fatalf("Replay returned %d events, want 1", len(events))
	}
	if events[0].Data != `{"match": true}` {
		t.Errorf("Data = %q, want match event", events[0].Data)
	}
}

func TestReplay_NoMatches(t *testing.T) {
	store := newTestEventStore(t)
	events, err := store.Replay("nonexistent", 0, 0, "")
	if err != nil {
		t.Fatalf("Replay failed: %v", err)
	}
	if events == nil {
		t.Fatal("Replay returned nil, want empty slice")
	}
	if len(events) != 0 {
		t.Errorf("Replay returned %d events, want 0", len(events))
	}
}

// --- Subscribe tests ---

func TestSubscribe_ReceivesEvents(t *testing.T) {
	store := newTestEventStore(t)
	sub := store.Subscribe("")
	defer store.Unsubscribe(sub)

	store.Append(store.experimentID, TypeMetric, `{"step": 1}`)

	select {
	case ev := <-sub.Events():
		if ev.Type != TypeMetric {
			t.Errorf("Type = %q, want %q", ev.Type, TypeMetric)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for event")
	}
}

func TestSubscribe_FilteredByExperiment(t *testing.T) {
	store := newTestEventStore(t)
	exp2ID := createTestExperiment(t, store.db, "exp-2")

	sub := store.Subscribe(store.experimentID)
	defer store.Unsubscribe(sub)

	store.Append(exp2ID, TypeMetric, `{"src": "exp2"}`)
	store.Append(store.experimentID, TypeMetric, `{"src": "exp1"}`)

	select {
	case ev := <-sub.Events():
		if ev.ExperimentID != store.experimentID {
			t.Errorf("ExperimentID = %q, want %q", ev.ExperimentID, store.experimentID)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for event")
	}
}

func TestUnsubscribe(t *testing.T) {
	store := newTestEventStore(t)
	sub := store.Subscribe("")
	ch := sub.Events()

	store.Unsubscribe(sub)

	store.Append(store.experimentID, TypeMetric, `{"after": "unsub"}`)

	select {
	case _, ok := <-ch:
		if ok {
			t.Fatal("received event after unsubscribe")
		}
		// Channel closed — expected
	case <-time.After(100 * time.Millisecond):
		// No event received — also acceptable
	}
}
