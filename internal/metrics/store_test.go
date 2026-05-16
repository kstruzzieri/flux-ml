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

func TestQueryMetrics_EmptyExperimentID(t *testing.T) {
	store := newTestMetricsStore(t)
	_, err := store.QueryMetrics("", "", 0, 0)
	if err == nil {
		t.Fatal("expected error for empty experiment ID, got nil")
	}
}

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

func TestQueryRecentMetrics(t *testing.T) {
	store := newTestMetricsStore(t)
	now := time.Now().Unix()

	if err := store.RecordMetrics(store.experimentID, []Metric{
		{Step: 1, Name: "reward", Value: 0.1, Timestamp: now},
		{Step: 2, Name: "reward", Value: 0.2, Timestamp: now},
		{Step: 3, Name: "reward", Value: 0.3, Timestamp: now},
		{Step: 4, Name: "reward", Value: 0.4, Timestamp: now},
		{Step: 5, Name: "reward", Value: 0.5, Timestamp: now},
		{Step: 5, Name: "loss", Value: 0.9, Timestamp: now},
	}); err != nil {
		t.Fatalf("RecordMetrics failed: %v", err)
	}

	results, err := store.QueryRecentMetrics(store.experimentID, "reward", 3)
	if err != nil {
		t.Fatalf("QueryRecentMetrics failed: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 metrics, got %d", len(results))
	}
	wantSteps := []int64{3, 4, 5}
	for i, want := range wantSteps {
		if results[i].Step != want {
			t.Errorf("results[%d].Step = %d, want %d", i, results[i].Step, want)
		}
	}
}

func TestQueryRecentMetricsValidation(t *testing.T) {
	store := newTestMetricsStore(t)
	if _, err := store.QueryRecentMetrics("", "reward", 3); err == nil {
		t.Fatal("expected error for empty experiment ID")
	}
	if _, err := store.QueryRecentMetrics(store.experimentID, "", 3); err == nil {
		t.Fatal("expected error for empty metric name")
	}
	if _, err := store.QueryRecentMetrics(store.experimentID, "reward", 0); err == nil {
		t.Fatal("expected error for non-positive limit")
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

func TestQueryRewardSignals_EmptyExperimentID(t *testing.T) {
	store := newTestMetricsStore(t)
	_, err := store.QueryRewardSignals("", "", 0, 0)
	if err == nil {
		t.Fatal("expected error for empty experiment ID, got nil")
	}
}

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

// --- LatestMetrics tests ---

func TestLatestMetrics_ReturnsHighestStep(t *testing.T) {
	ts := newTestMetricsStore(t)
	expID := createTestExperiment(t, ts.db, "test-latest")

	ts.RecordMetrics(expID, []Metric{
		{Step: 1, Name: "loss", Value: 2.5, Timestamp: 1000},
		{Step: 2, Name: "loss", Value: 1.8, Timestamp: 2000},
		{Step: 3, Name: "loss", Value: 0.9, Timestamp: 3000},
		{Step: 1, Name: "reward", Value: 0.1, Timestamp: 1000},
		{Step: 2, Name: "reward", Value: 0.5, Timestamp: 2000},
	})

	results, err := ts.LatestMetrics(expID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 metrics, got %d", len(results))
	}

	byName := make(map[string]Metric)
	for _, m := range results {
		byName[m.Name] = m
	}
	if byName["loss"].Value != 0.9 {
		t.Errorf("expected loss=0.9, got %f", byName["loss"].Value)
	}
	if byName["loss"].Step != 3 {
		t.Errorf("expected loss step=3, got %d", byName["loss"].Step)
	}
	if byName["reward"].Value != 0.5 {
		t.Errorf("expected reward=0.5, got %f", byName["reward"].Value)
	}
	if byName["reward"].Step != 2 {
		t.Errorf("expected reward step=2, got %d", byName["reward"].Step)
	}
}

func TestLatestMetrics_EmptyExperimentID(t *testing.T) {
	ts := newTestMetricsStore(t)
	_, err := ts.LatestMetrics("")
	if err == nil {
		t.Fatal("expected error for empty experiment ID")
	}
}

func TestLatestMetrics_NoMetrics(t *testing.T) {
	ts := newTestMetricsStore(t)
	expID := createTestExperiment(t, ts.db, "test-no-metrics")
	results, err := ts.LatestMetrics(expID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("expected 0 metrics, got %d", len(results))
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
