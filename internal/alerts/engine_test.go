package alerts

import (
	"path/filepath"
	"testing"

	"github.com/kstruzzieri/flux-ml/internal/database"
	"github.com/kstruzzieri/flux-ml/internal/metrics"
)

type testEngine struct {
	engine       *Engine
	alerts       *Store
	metrics      *metrics.Store
	experimentID string
}

func newTestEngine(t *testing.T) *testEngine {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := database.Open(path)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	expID := createAlertTestExperiment(t, db)
	metricStore := metrics.NewStore(db)
	alertStore := NewStore(db)
	return &testEngine{
		engine:       NewEngine(metricStore, alertStore),
		alerts:       alertStore,
		metrics:      metricStore,
		experimentID: expID,
	}
}

func TestEngineReturnsClearForInsufficientData(t *testing.T) {
	env := newTestEngine(t)

	results, err := env.engine.EvaluateExperiment(env.experimentID)
	if err != nil {
		t.Fatalf("EvaluateExperiment failed: %v", err)
	}
	if len(results) != 4 {
		t.Fatalf("expected 4 detector results, got %d", len(results))
	}
	for _, result := range results {
		if result.Status != LevelClear {
			t.Errorf("%s status = %q, want clear", result.Pattern, result.Status)
		}
	}

	persisted, err := env.alerts.ListByExperiment(env.experimentID)
	if err != nil {
		t.Fatalf("ListByExperiment failed: %v", err)
	}
	if len(persisted) != 0 {
		t.Fatalf("expected no persisted alerts, got %d", len(persisted))
	}
}

func TestEngineDetectsLengthGamingWithResponseLength(t *testing.T) {
	env := newTestEngine(t)
	recordMetricSeries(t, env.metrics, env.experimentID, "reward", []float64{0.1, 0.2, 0.4, 0.7, 1.1, 1.6})
	recordMetricSeries(t, env.metrics, env.experimentID, "response_length", []float64{100, 110, 130, 160, 200, 250})

	results, err := env.engine.EvaluateExperiment(env.experimentID)
	if err != nil {
		t.Fatalf("EvaluateExperiment failed: %v", err)
	}
	lengthGaming := findDetection(t, results, TypeLengthGaming)
	if lengthGaming.Status != LevelDetected {
		t.Fatalf("Length Gaming status = %q, want detected", lengthGaming.Status)
	}
	if lengthGaming.Confidence == nil || *lengthGaming.Confidence < 0.85 {
		t.Fatalf("Length Gaming confidence = %v, want >= 0.85", lengthGaming.Confidence)
	}

	persisted, err := env.alerts.ListByExperiment(env.experimentID)
	if err != nil {
		t.Fatalf("ListByExperiment failed: %v", err)
	}
	if len(persisted) != 1 {
		t.Fatalf("expected 1 persisted alert, got %d", len(persisted))
	}
	if persisted[0].Type != TypeLengthGaming {
		t.Errorf("persisted Type = %q, want %q", persisted[0].Type, TypeLengthGaming)
	}
}

func TestEngineDoesNotDetectLengthGamingFromSharedUpwardTrendAlone(t *testing.T) {
	env := newTestEngine(t)
	recordMetricSeries(t, env.metrics, env.experimentID, "reward", []float64{0.1, 0.2, 0.3, 0.4, 0.5, 0.6})
	recordMetricSeries(t, env.metrics, env.experimentID, "response_length", []float64{100, 150, 151, 201, 202, 252})

	results, err := env.engine.EvaluateExperiment(env.experimentID)
	if err != nil {
		t.Fatalf("EvaluateExperiment failed: %v", err)
	}
	lengthGaming := findDetection(t, results, TypeLengthGaming)
	if lengthGaming.Status != LevelClear {
		t.Fatalf("Length Gaming status = %q, want clear", lengthGaming.Status)
	}
}

func TestEngineElevatesKLDriftWhenRewardAlsoRises(t *testing.T) {
	env := newTestEngine(t)
	recordMetricSeries(t, env.metrics, env.experimentID, "reward", []float64{0.2, 0.22, 0.25, 0.4, 0.55, 0.7})
	recordMetricSeries(t, env.metrics, env.experimentID, "kl", []float64{0.01, 0.012, 0.014, 0.03, 0.05, 0.08})

	results, err := env.engine.EvaluateExperiment(env.experimentID)
	if err != nil {
		t.Fatalf("EvaluateExperiment failed: %v", err)
	}
	kl := findDetection(t, results, TypeKLDrift)
	if kl.Status != LevelElevated {
		t.Fatalf("KL Drift status = %q, want elevated", kl.Status)
	}
	if kl.Confidence == nil || *kl.Confidence < 0.65 {
		t.Fatalf("KL Drift confidence = %v, want >= 0.65", kl.Confidence)
	}
}

func TestEngineReadOnlyDetectionsDoNotPersistAlerts(t *testing.T) {
	env := newTestEngine(t)
	recordMetricSeries(t, env.metrics, env.experimentID, "reward", []float64{0.2, 0.22, 0.25, 0.4, 0.55, 0.7})
	recordMetricSeries(t, env.metrics, env.experimentID, "kl", []float64{0.01, 0.012, 0.014, 0.03, 0.05, 0.08})

	results, err := env.engine.DetectExperiment(env.experimentID)
	if err != nil {
		t.Fatalf("DetectExperiment failed: %v", err)
	}
	kl := findDetection(t, results, TypeKLDrift)
	if kl.Status != LevelElevated {
		t.Fatalf("KL Drift status = %q, want elevated", kl.Status)
	}

	persisted, err := env.alerts.ListByExperiment(env.experimentID)
	if err != nil {
		t.Fatalf("ListByExperiment failed: %v", err)
	}
	if len(persisted) != 0 {
		t.Fatalf("read-only detection persisted %d alerts", len(persisted))
	}
}

func TestEngineDetectsSycophancy(t *testing.T) {
	env := newTestEngine(t)
	recordMetricSeries(t, env.metrics, env.experimentID, "kl", []float64{0.01, 0.012, 0.014, 0.025, 0.04, 0.06})
	recordMetricSeries(t, env.metrics, env.experimentID, "policy_entropy", []float64{4.2, 4.0, 3.8, 3.2, 2.6, 2.1})

	results, err := env.engine.EvaluateExperiment(env.experimentID)
	if err != nil {
		t.Fatalf("EvaluateExperiment failed: %v", err)
	}
	sycophancy := findDetection(t, results, TypeSycophancy)
	if sycophancy.Status != LevelElevated {
		t.Fatalf("Sycophancy status = %q, want elevated", sycophancy.Status)
	}
}

func TestEngineDetectsRewardCollapse(t *testing.T) {
	env := newTestEngine(t)
	recordMetricSeries(t, env.metrics, env.experimentID, "reward_variance", []float64{0.9, 0.8, 0.7, 0.25, 0.12, 0.04})
	if err := env.metrics.RecordRewardSignals(env.experimentID, []metrics.RewardSignal{
		{Step: 6, Component: "helpfulness", Value: 0.9},
		{Step: 6, Component: "harmlessness", Value: 0.2},
		{Step: 6, Component: "honesty", Value: 0.35},
	}); err != nil {
		t.Fatalf("RecordRewardSignals failed: %v", err)
	}

	results, err := env.engine.EvaluateExperiment(env.experimentID)
	if err != nil {
		t.Fatalf("EvaluateExperiment failed: %v", err)
	}
	collapse := findDetection(t, results, TypeRewardCollapse)
	if collapse.Status != LevelElevated {
		t.Fatalf("Reward Collapse status = %q, want elevated", collapse.Status)
	}
}

func recordMetricSeries(t *testing.T, store *metrics.Store, experimentID, name string, values []float64) {
	t.Helper()
	rows := make([]metrics.Metric, 0, len(values))
	for i, value := range values {
		step := int64(i + 1)
		rows = append(rows, metrics.Metric{
			Step:      step,
			Name:      name,
			Value:     value,
			Timestamp: 1000 + step,
		})
	}
	if err := store.RecordMetrics(experimentID, rows); err != nil {
		t.Fatalf("RecordMetrics(%s) failed: %v", name, err)
	}
}

func findDetection(t *testing.T, results []DetectionResult, alertType string) DetectionResult {
	t.Helper()
	for _, result := range results {
		if result.Type == alertType {
			return result
		}
	}
	t.Fatalf("detection %q not found", alertType)
	return DetectionResult{}
}
