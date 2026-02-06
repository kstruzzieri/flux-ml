package metrics

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/kstruzzieri/flux-ml/internal/database"
)

// testMetricsStore wraps Store with test helpers.
type testMetricsStore struct {
	*Store
	db           *database.DB
	experimentID string
}

// newTestMetricsStore creates an isolated test database with a pre-existing experiment.
func newTestMetricsStore(t *testing.T) *testMetricsStore {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := database.Open(path)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	expID := createTestExperiment(t, db, "test-experiment")
	return &testMetricsStore{
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

// --- RecordMetrics tests ---

func TestRecordMetrics(t *testing.T) {
	store := newTestMetricsStore(t)
	now := time.Now().Unix()

	metrics := []Metric{
		{Step: 100, Name: "loss", Value: 0.5, Timestamp: now},
		{Step: 100, Name: "reward", Value: 0.8, Timestamp: now},
		{Step: 200, Name: "loss", Value: 0.3, Timestamp: now + 1},
	}

	err := store.RecordMetrics(store.experimentID, metrics)
	if err != nil {
		t.Fatalf("RecordMetrics failed: %v", err)
	}

	// Verify all metrics were inserted by querying them back
	results, err := store.QueryMetrics(store.experimentID, "", 0, 0)
	if err != nil {
		t.Fatalf("QueryMetrics failed: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 metrics, got %d", len(results))
	}
}

func TestRecordMetrics_EmptyExperimentID(t *testing.T) {
	store := newTestMetricsStore(t)
	err := store.RecordMetrics("", []Metric{{Step: 1, Name: "loss", Value: 0.5, Timestamp: 1}})
	if err == nil {
		t.Fatal("expected error for empty experiment ID, got nil")
	}
}

func TestRecordMetrics_EmptySlice(t *testing.T) {
	store := newTestMetricsStore(t)
	err := store.RecordMetrics(store.experimentID, []Metric{})
	if err == nil {
		t.Fatal("expected error for empty metrics slice, got nil")
	}
}

func TestRecordMetrics_ForeignKeyViolation(t *testing.T) {
	store := newTestMetricsStore(t)
	err := store.RecordMetrics("nonexistent-id", []Metric{
		{Step: 1, Name: "loss", Value: 0.5, Timestamp: 1},
	})
	if err == nil {
		t.Fatal("expected foreign key error, got nil")
	}
}

// --- QueryMetrics tests ---

func TestQueryMetrics_All(t *testing.T) {
	store := newTestMetricsStore(t)
	now := time.Now().Unix()

	if err := store.RecordMetrics(store.experimentID, []Metric{
		{Step: 300, Name: "loss", Value: 0.1, Timestamp: now},
		{Step: 100, Name: "loss", Value: 0.5, Timestamp: now},
		{Step: 200, Name: "reward", Value: 0.8, Timestamp: now},
	}); err != nil {
		t.Fatalf("RecordMetrics failed: %v", err)
	}

	results, err := store.QueryMetrics(store.experimentID, "", 0, 0)
	if err != nil {
		t.Fatalf("QueryMetrics failed: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 metrics, got %d", len(results))
	}
	// Verify ASC order by step
	for i := 1; i < len(results); i++ {
		if results[i].Step < results[i-1].Step {
			t.Errorf("metrics not in step order: [%d].Step=%d < [%d].Step=%d",
				i, results[i].Step, i-1, results[i-1].Step)
		}
	}
}

func TestQueryMetrics_FilterByName(t *testing.T) {
	store := newTestMetricsStore(t)
	now := time.Now().Unix()

	if err := store.RecordMetrics(store.experimentID, []Metric{
		{Step: 100, Name: "loss", Value: 0.5, Timestamp: now},
		{Step: 100, Name: "reward", Value: 0.8, Timestamp: now},
		{Step: 200, Name: "loss", Value: 0.3, Timestamp: now},
	}); err != nil {
		t.Fatalf("RecordMetrics failed: %v", err)
	}

	results, err := store.QueryMetrics(store.experimentID, "loss", 0, 0)
	if err != nil {
		t.Fatalf("QueryMetrics failed: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 metrics named 'loss', got %d", len(results))
	}
	for _, m := range results {
		if m.Name != "loss" {
			t.Errorf("Name = %q, want %q", m.Name, "loss")
		}
	}
}

func TestQueryMetrics_FilterByStepRange(t *testing.T) {
	store := newTestMetricsStore(t)
	now := time.Now().Unix()

	if err := store.RecordMetrics(store.experimentID, []Metric{
		{Step: 50, Name: "loss", Value: 0.9, Timestamp: now},
		{Step: 100, Name: "loss", Value: 0.5, Timestamp: now},
		{Step: 200, Name: "loss", Value: 0.3, Timestamp: now},
		{Step: 300, Name: "loss", Value: 0.1, Timestamp: now},
	}); err != nil {
		t.Fatalf("RecordMetrics failed: %v", err)
	}

	results, err := store.QueryMetrics(store.experimentID, "", 100, 200)
	if err != nil {
		t.Fatalf("QueryMetrics failed: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 metrics in step range [100,200], got %d", len(results))
	}
	for _, m := range results {
		if m.Step < 100 || m.Step > 200 {
			t.Errorf("Step = %d, want in range [100, 200]", m.Step)
		}
	}
}

func TestQueryMetrics_NoMatches(t *testing.T) {
	store := newTestMetricsStore(t)
	results, err := store.QueryMetrics(store.experimentID, "nonexistent", 0, 0)
	if err != nil {
		t.Fatalf("QueryMetrics failed: %v", err)
	}
	if results == nil {
		t.Fatal("QueryMetrics returned nil, want empty slice")
	}
	if len(results) != 0 {
		t.Errorf("expected 0 metrics, got %d", len(results))
	}
}

// --- RecordRewardSignals tests ---

func TestRecordRewardSignals(t *testing.T) {
	store := newTestMetricsStore(t)

	signals := []RewardSignal{
		{Step: 100, Component: "helpfulness", Value: 0.89, Distribution: `{"buckets": [0.1, 0.2], "counts": [10, 20]}`},
		{Step: 100, Component: "harmlessness", Value: 0.92, Distribution: ""},
		{Step: 200, Component: "helpfulness", Value: 0.91, Distribution: `{"buckets": [0.2, 0.3], "counts": [15, 25]}`},
	}

	err := store.RecordRewardSignals(store.experimentID, signals)
	if err != nil {
		t.Fatalf("RecordRewardSignals failed: %v", err)
	}

	// Verify all signals were inserted
	results, err := store.QueryRewardSignals(store.experimentID, "", 0, 0)
	if err != nil {
		t.Fatalf("QueryRewardSignals failed: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 signals, got %d", len(results))
	}
	// Verify distribution JSON preserved
	for _, s := range results {
		if s.Component == "helpfulness" && s.Step == 100 {
			if s.Distribution != `{"buckets": [0.1, 0.2], "counts": [10, 20]}` {
				t.Errorf("Distribution not preserved: %q", s.Distribution)
			}
		}
	}
}

func TestRecordRewardSignals_EmptyExperimentID(t *testing.T) {
	store := newTestMetricsStore(t)
	err := store.RecordRewardSignals("", []RewardSignal{{Step: 1, Component: "helpfulness", Value: 0.5}})
	if err == nil {
		t.Fatal("expected error for empty experiment ID, got nil")
	}
}

func TestRecordRewardSignals_EmptySlice(t *testing.T) {
	store := newTestMetricsStore(t)
	err := store.RecordRewardSignals(store.experimentID, []RewardSignal{})
	if err == nil {
		t.Fatal("expected error for empty signals slice, got nil")
	}
}

// --- QueryRewardSignals tests ---

func TestQueryRewardSignals_All(t *testing.T) {
	store := newTestMetricsStore(t)

	if err := store.RecordRewardSignals(store.experimentID, []RewardSignal{
		{Step: 300, Component: "honesty", Value: 0.85},
		{Step: 100, Component: "helpfulness", Value: 0.89},
		{Step: 200, Component: "harmlessness", Value: 0.92},
	}); err != nil {
		t.Fatalf("RecordRewardSignals failed: %v", err)
	}

	results, err := store.QueryRewardSignals(store.experimentID, "", 0, 0)
	if err != nil {
		t.Fatalf("QueryRewardSignals failed: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 signals, got %d", len(results))
	}
	// Verify ASC order by step
	for i := 1; i < len(results); i++ {
		if results[i].Step < results[i-1].Step {
			t.Errorf("signals not in step order: [%d].Step=%d < [%d].Step=%d",
				i, results[i].Step, i-1, results[i-1].Step)
		}
	}
}

func TestQueryRewardSignals_FilterByComponent(t *testing.T) {
	store := newTestMetricsStore(t)

	if err := store.RecordRewardSignals(store.experimentID, []RewardSignal{
		{Step: 100, Component: "helpfulness", Value: 0.89},
		{Step: 100, Component: "harmlessness", Value: 0.92},
		{Step: 200, Component: "helpfulness", Value: 0.91},
	}); err != nil {
		t.Fatalf("RecordRewardSignals failed: %v", err)
	}

	results, err := store.QueryRewardSignals(store.experimentID, "helpfulness", 0, 0)
	if err != nil {
		t.Fatalf("QueryRewardSignals failed: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 signals for 'helpfulness', got %d", len(results))
	}
	for _, s := range results {
		if s.Component != "helpfulness" {
			t.Errorf("Component = %q, want %q", s.Component, "helpfulness")
		}
	}
}

func TestQueryRewardSignals_FilterByStepRange(t *testing.T) {
	store := newTestMetricsStore(t)

	if err := store.RecordRewardSignals(store.experimentID, []RewardSignal{
		{Step: 50, Component: "helpfulness", Value: 0.80},
		{Step: 100, Component: "helpfulness", Value: 0.89},
		{Step: 200, Component: "helpfulness", Value: 0.91},
		{Step: 300, Component: "helpfulness", Value: 0.93},
	}); err != nil {
		t.Fatalf("RecordRewardSignals failed: %v", err)
	}

	results, err := store.QueryRewardSignals(store.experimentID, "", 100, 200)
	if err != nil {
		t.Fatalf("QueryRewardSignals failed: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 signals in step range [100,200], got %d", len(results))
	}
	for _, s := range results {
		if s.Step < 100 || s.Step > 200 {
			t.Errorf("Step = %d, want in range [100, 200]", s.Step)
		}
	}
}

// --- Cascade delete test ---

func TestCascadeDelete(t *testing.T) {
	store := newTestMetricsStore(t)
	now := time.Now().Unix()

	// Insert metrics and reward signals
	if err := store.RecordMetrics(store.experimentID, []Metric{
		{Step: 100, Name: "loss", Value: 0.5, Timestamp: now},
	}); err != nil {
		t.Fatalf("RecordMetrics failed: %v", err)
	}
	if err := store.RecordRewardSignals(store.experimentID, []RewardSignal{
		{Step: 100, Component: "helpfulness", Value: 0.89},
	}); err != nil {
		t.Fatalf("RecordRewardSignals failed: %v", err)
	}

	// Delete the experiment directly
	if _, err := store.db.Exec(`DELETE FROM experiments WHERE id = ?`, store.experimentID); err != nil {
		t.Fatalf("Delete experiment failed: %v", err)
	}

	// Metrics should be cascade-deleted
	metrics, err := store.QueryMetrics(store.experimentID, "", 0, 0)
	if err != nil {
		t.Fatalf("QueryMetrics after delete failed: %v", err)
	}
	if len(metrics) != 0 {
		t.Errorf("expected 0 metrics after cascade delete, got %d", len(metrics))
	}

	// Reward signals should be cascade-deleted
	signals, err := store.QueryRewardSignals(store.experimentID, "", 0, 0)
	if err != nil {
		t.Fatalf("QueryRewardSignals after delete failed: %v", err)
	}
	if len(signals) != 0 {
		t.Errorf("expected 0 reward signals after cascade delete, got %d", len(signals))
	}
}
