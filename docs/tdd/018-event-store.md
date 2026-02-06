# TDD: Issue #18 - Event Store Implementation

## Issue Summary
Implement event sourcing for experiment activity tracking in the `internal/event` package. Events are immutable records of experiment activity (metrics, config changes, alerts, checkpoints). The store supports appending events, replaying by time range with filters, and subscribing to new events via in-memory channel-based pub/sub.

## Acceptance Criteria
- [ ] Events can be appended
- [ ] Events can be replayed by time range
- [ ] Event replay supports filtering by experiment ID, type, and combined filters
- [ ] Event subscription works (channel-based pub/sub)
- [ ] Subscription filtering by experiment ID works
- [ ] Unsubscribe stops event delivery
- [ ] Wails bindings expose Append and Replay to frontend

## Rationale
This is the second domain data layer building on the experiment CRUD (#17) and SQLite foundation (#16). It establishes the event sourcing pattern for experiment activity tracking. The design choices are:
1. **Store pattern** — Same `Store` struct wrapping `*database.DB` pattern as experiment store, extended with `sync.RWMutex` for thread-safe subscriber management.
2. **Channel-based pub/sub** — Go channels for subscriptions. Idiomatic, testable without Wails runtime, clean lifecycle via close-on-unsubscribe.
3. **Non-blocking notification** — `select` with `default` on buffered channels (size 64) so slow subscribers don't block writes.
4. **Optional filters** — Replay accepts experimentID, startTime, endTime, eventType — all optional (empty/zero = no filter). Dynamic WHERE clause construction.
5. **Type validation** — Only metric, config_change, alert, checkpoint accepted. Prevents invalid event types.
6. **Wails exposure** — Only Append and Replay exposed to frontend. Subscribe/Unsubscribe are internal Go APIs for backend consumers (alert detection, metrics streaming).

## Failing Tests

### Test 1: TestAppend
Appending a valid event must return an Event with auto-increment ID, recent timestamp, and correct fields.
```go
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
```

### Test 2: TestAppend_EmptyExperimentID
Appending an event with an empty experiment ID must return an error.
```go
func TestAppend_EmptyExperimentID(t *testing.T) {
	store := newTestEventStore(t)
	_, err := store.Append("", TypeMetric, `{}`)
	if err == nil {
		t.Fatal("expected error for empty experiment ID, got nil")
	}
}
```

### Test 3: TestAppend_InvalidType
Appending an event with an invalid type must return an error.
```go
func TestAppend_InvalidType(t *testing.T) {
	store := newTestEventStore(t)
	_, err := store.Append(store.experimentID, "invalid_type", `{}`)
	if err == nil {
		t.Fatal("expected error for invalid event type, got nil")
	}
}
```

### Test 4: TestAppend_ForeignKeyViolation
Appending an event with a nonexistent experiment ID must return a foreign key violation error.
```go
func TestAppend_ForeignKeyViolation(t *testing.T) {
	store := newTestEventStore(t)
	_, err := store.Append("nonexistent-id", TypeMetric, `{}`)
	if err == nil {
		t.Fatal("expected foreign key error, got nil")
	}
}
```

### Test 5: TestReplay_ChronologicalOrder
Replaying events must return them in timestamp ASC order.
```go
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
```

### Test 6: TestReplay_FilterByExperiment
Replaying with an experiment ID filter must only return events for that experiment.
```go
func TestReplay_FilterByExperiment(t *testing.T) {
	store := newTestEventStore(t)
	// Create a second experiment
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
```

### Test 7: TestReplay_FilterByTimeRange
Replaying with a time range filter must only return events within that range.
```go
func TestReplay_FilterByTimeRange(t *testing.T) {
	store := newTestEventStore(t)
	now := time.Now().Unix()

	// Insert events with explicit timestamps via direct SQL
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
```

### Test 8: TestReplay_FilterByType
Replaying with a type filter must only return events of that type.
```go
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
```

### Test 9: TestReplay_CombinedFilters
Replaying with multiple filters must apply all of them.
```go
func TestReplay_CombinedFilters(t *testing.T) {
	store := newTestEventStore(t)
	exp2ID := createTestExperiment(t, store.db, "exp-2")
	now := time.Now().Unix()

	// Insert mix of events via direct SQL for timestamp control
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
```

### Test 10: TestReplay_NoMatches
Replaying when no events match must return an empty slice, not nil.
```go
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
```

### Test 11: TestSubscribe_ReceivesEvents
A subscriber must receive appended events on its channel.
```go
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
```

### Test 12: TestSubscribe_FilteredByExperiment
A subscriber filtered by experiment ID must only receive events for that experiment.
```go
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
```

### Test 13: TestUnsubscribe
After unsubscribing, no more events should be received on the channel.
```go
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
```

## Test Helper

All tests use shared helpers that create an isolated database with a pre-existing experiment:
```go
package event

import (
	"fmt"
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/kstruzzieri/flux-ml/internal/database"
)

type testEventStore struct {
	*Store
	db           *database.DB
	experimentID string
}

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
```

## Expected Output (Failing)
```
--- FAIL: TestAppend (0.00s)
    store_test.go:XX: Append failed: <nil return from stub>
--- FAIL: TestAppend_EmptyExperimentID (0.00s)
    store_test.go:XX: expected error for empty experiment ID, got nil
--- FAIL: TestAppend_InvalidType (0.00s)
    store_test.go:XX: expected error for invalid event type, got nil
--- FAIL: TestAppend_ForeignKeyViolation (0.00s)
    store_test.go:XX: expected foreign key error, got nil
--- FAIL: TestReplay_ChronologicalOrder (0.00s)
    store_test.go:XX: Replay returned 0 events, want 3
--- FAIL: TestReplay_FilterByExperiment (0.00s)
    store_test.go:XX: Replay returned 0 events, want 2
--- FAIL: TestReplay_FilterByTimeRange (0.00s)
    store_test.go:XX: Replay returned 0 events, want 1
--- FAIL: TestReplay_FilterByType (0.00s)
    store_test.go:XX: Replay returned 0 events, want 1
--- FAIL: TestReplay_CombinedFilters (0.00s)
    store_test.go:XX: Replay returned 0 events, want 1
--- FAIL: TestReplay_NoMatches (0.00s)
    store_test.go:XX: Replay returned nil, want empty slice
--- FAIL: TestSubscribe_ReceivesEvents (0.00s)
    store_test.go:XX: timed out waiting for event
--- FAIL: TestSubscribe_FilteredByExperiment (0.00s)
    store_test.go:XX: timed out waiting for event
--- FAIL: TestUnsubscribe (0.00s)
FAIL    github.com/kstruzzieri/flux-ml/internal/event    0.001s
Tests:    0 passed, 13 failed, 13 total
```
