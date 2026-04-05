package main

import (
	"path/filepath"
	"testing"

	"github.com/kstruzzieri/flux-ml/internal/annotation"
	"github.com/kstruzzieri/flux-ml/internal/database"
	"github.com/kstruzzieri/flux-ml/internal/event"
	"github.com/kstruzzieri/flux-ml/internal/experiment"
	"github.com/kstruzzieri/flux-ml/internal/metrics"
)

// newTestApp creates an App with a real temp SQLite database, nil ctx, and all stores initialized.
func newTestApp(t *testing.T) *App {
	t.Helper()
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")
	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return &App{
		db:          db,
		experiments: experiment.NewStore(db),
		events:      event.NewStore(db),
		metrics:     metrics.NewStore(db),
		annotations: annotation.NewStore(db),
	}
}

// --- Experiment API Tests ---

func TestApp_CreateExperiment(t *testing.T) {
	app := newTestApp(t)
	exp, err := app.CreateExperiment("test-model", `{"lr": 0.001}`)
	if err != nil {
		t.Fatalf("CreateExperiment failed: %v", err)
	}
	if len(exp.ID) != 36 {
		t.Errorf("ID length = %d, want 36", len(exp.ID))
	}
	if exp.Name != "test-model" {
		t.Errorf("Name = %q, want %q", exp.Name, "test-model")
	}
	if exp.Config != `{"lr": 0.001}` {
		t.Errorf("Config = %q, want %q", exp.Config, `{"lr": 0.001}`)
	}
	if exp.Status != "pending" {
		t.Errorf("Status = %q, want %q", exp.Status, "pending")
	}
}

func TestApp_ListExperiments(t *testing.T) {
	app := newTestApp(t)
	if _, err := app.CreateExperiment("exp-1", `{}`); err != nil {
		t.Fatalf("CreateExperiment 1 failed: %v", err)
	}
	if _, err := app.CreateExperiment("exp-2", `{}`); err != nil {
		t.Fatalf("CreateExperiment 2 failed: %v", err)
	}
	list, err := app.ListExperiments()
	if err != nil {
		t.Fatalf("ListExperiments failed: %v", err)
	}
	if len(list) != 2 {
		t.Errorf("got %d experiments, want 2", len(list))
	}
}

func TestApp_GetExperiment(t *testing.T) {
	app := newTestApp(t)
	created, err := app.CreateExperiment("test", `{"batch": 32}`)
	if err != nil {
		t.Fatalf("CreateExperiment failed: %v", err)
	}
	got, err := app.GetExperiment(created.ID)
	if err != nil {
		t.Fatalf("GetExperiment failed: %v", err)
	}
	if got.ID != created.ID {
		t.Errorf("ID = %q, want %q", got.ID, created.ID)
	}
	if got.Name != "test" {
		t.Errorf("Name = %q, want %q", got.Name, "test")
	}
}

func TestApp_UpdateExperimentStatus(t *testing.T) {
	app := newTestApp(t)
	created, err := app.CreateExperiment("test", `{}`)
	if err != nil {
		t.Fatalf("CreateExperiment failed: %v", err)
	}
	if err := app.UpdateExperimentStatus(created.ID, "running"); err != nil {
		t.Fatalf("UpdateExperimentStatus failed: %v", err)
	}
	got, err := app.GetExperiment(created.ID)
	if err != nil {
		t.Fatalf("GetExperiment failed: %v", err)
	}
	if got.Status != "running" {
		t.Errorf("Status = %q, want %q", got.Status, "running")
	}
}

func TestApp_DeleteExperiment(t *testing.T) {
	app := newTestApp(t)
	created, err := app.CreateExperiment("test", `{}`)
	if err != nil {
		t.Fatalf("CreateExperiment failed: %v", err)
	}
	if err := app.DeleteExperiment(created.ID); err != nil {
		t.Fatalf("DeleteExperiment failed: %v", err)
	}
	_, err = app.GetExperiment(created.ID)
	if err == nil {
		t.Fatal("expected error after delete, got nil")
	}
}

func TestApp_NilExperimentStore(t *testing.T) {
	app := &App{}
	_, err := app.CreateExperiment("test", `{}`)
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("CreateExperiment: expected 'database not initialized', got %v", err)
	}
	_, err = app.ListExperiments()
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("ListExperiments: expected 'database not initialized', got %v", err)
	}
	_, err = app.GetExperiment("id")
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("GetExperiment: expected 'database not initialized', got %v", err)
	}
	err = app.UpdateExperimentStatus("id", "running")
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("UpdateExperimentStatus: expected 'database not initialized', got %v", err)
	}
	err = app.DeleteExperiment("id")
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("DeleteExperiment: expected 'database not initialized', got %v", err)
	}
}

// --- Event API Tests ---

func TestApp_AppendEvent(t *testing.T) {
	app := newTestApp(t)
	created, err := app.CreateExperiment("test", `{}`)
	if err != nil {
		t.Fatalf("CreateExperiment failed: %v", err)
	}
	ev, err := app.AppendEvent(created.ID, "metric", `{"loss": 0.5}`)
	if err != nil {
		t.Fatalf("AppendEvent failed: %v", err)
	}
	if ev.ExperimentID != created.ID {
		t.Errorf("ExperimentID = %q, want %q", ev.ExperimentID, created.ID)
	}
	if ev.Type != "metric" {
		t.Errorf("Type = %q, want %q", ev.Type, "metric")
	}
	if ev.Data != `{"loss": 0.5}` {
		t.Errorf("Data = %q, want %q", ev.Data, `{"loss": 0.5}`)
	}
}

func TestApp_ReplayEvents(t *testing.T) {
	app := newTestApp(t)
	created, err := app.CreateExperiment("test", `{}`)
	if err != nil {
		t.Fatalf("CreateExperiment failed: %v", err)
	}
	if _, err := app.AppendEvent(created.ID, "metric", `{"loss": 0.5}`); err != nil {
		t.Fatalf("AppendEvent 1 failed: %v", err)
	}
	if _, err := app.AppendEvent(created.ID, "alert", `{"type": "drift"}`); err != nil {
		t.Fatalf("AppendEvent 2 failed: %v", err)
	}

	// Filter by type
	events, err := app.ReplayEvents(created.ID, 0, 0, "metric")
	if err != nil {
		t.Fatalf("ReplayEvents failed: %v", err)
	}
	if len(events) != 1 {
		t.Errorf("got %d events, want 1", len(events))
	}

	// All events
	all, err := app.ReplayEvents(created.ID, 0, 0, "")
	if err != nil {
		t.Fatalf("ReplayEvents (all) failed: %v", err)
	}
	if len(all) != 2 {
		t.Errorf("got %d events, want 2", len(all))
	}
}

func TestApp_NilEventStore(t *testing.T) {
	app := &App{}
	_, err := app.AppendEvent("id", "metric", "{}")
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("AppendEvent: expected 'database not initialized', got %v", err)
	}
	_, err = app.ReplayEvents("id", 0, 0, "")
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("ReplayEvents: expected 'database not initialized', got %v", err)
	}
}

// --- Metrics API Tests ---

func TestApp_RecordMetrics(t *testing.T) {
	app := newTestApp(t)
	created, err := app.CreateExperiment("test", `{}`)
	if err != nil {
		t.Fatalf("CreateExperiment failed: %v", err)
	}
	m := []metrics.Metric{
		{Step: 1, Name: "loss", Value: 0.5, Timestamp: 1000},
		{Step: 2, Name: "loss", Value: 0.3, Timestamp: 1001},
	}
	if err := app.RecordMetrics(created.ID, m); err != nil {
		t.Fatalf("RecordMetrics failed: %v", err)
	}
	results, err := app.QueryMetrics(created.ID, "loss", 0, 0)
	if err != nil {
		t.Fatalf("QueryMetrics failed: %v", err)
	}
	if len(results) != 2 {
		t.Errorf("got %d metrics, want 2", len(results))
	}
}

func TestApp_QueryMetrics(t *testing.T) {
	app := newTestApp(t)
	created, err := app.CreateExperiment("test", `{}`)
	if err != nil {
		t.Fatalf("CreateExperiment failed: %v", err)
	}
	m := []metrics.Metric{
		{Step: 1, Name: "loss", Value: 0.5, Timestamp: 1000},
		{Step: 1, Name: "accuracy", Value: 0.8, Timestamp: 1000},
	}
	if err := app.RecordMetrics(created.ID, m); err != nil {
		t.Fatalf("RecordMetrics failed: %v", err)
	}
	results, err := app.QueryMetrics(created.ID, "accuracy", 0, 0)
	if err != nil {
		t.Fatalf("QueryMetrics failed: %v", err)
	}
	if len(results) != 1 {
		t.Errorf("got %d metrics, want 1", len(results))
	}
	if results[0].Name != "accuracy" {
		t.Errorf("Name = %q, want %q", results[0].Name, "accuracy")
	}
}

func TestApp_RecordRewardSignals(t *testing.T) {
	app := newTestApp(t)
	created, err := app.CreateExperiment("test", `{}`)
	if err != nil {
		t.Fatalf("CreateExperiment failed: %v", err)
	}
	signals := []metrics.RewardSignal{
		{Step: 1, Component: "helpfulness", Value: 0.8},
		{Step: 1, Component: "harmlessness", Value: 0.9},
	}
	if err := app.RecordRewardSignals(created.ID, signals); err != nil {
		t.Fatalf("RecordRewardSignals failed: %v", err)
	}
	results, err := app.QueryRewardSignals(created.ID, "", 0, 0)
	if err != nil {
		t.Fatalf("QueryRewardSignals failed: %v", err)
	}
	if len(results) != 2 {
		t.Errorf("got %d signals, want 2", len(results))
	}
}

func TestApp_QueryRewardSignals(t *testing.T) {
	app := newTestApp(t)
	created, err := app.CreateExperiment("test", `{}`)
	if err != nil {
		t.Fatalf("CreateExperiment failed: %v", err)
	}
	signals := []metrics.RewardSignal{
		{Step: 1, Component: "helpfulness", Value: 0.8},
		{Step: 1, Component: "harmlessness", Value: 0.9},
	}
	if err := app.RecordRewardSignals(created.ID, signals); err != nil {
		t.Fatalf("RecordRewardSignals failed: %v", err)
	}
	results, err := app.QueryRewardSignals(created.ID, "helpfulness", 0, 0)
	if err != nil {
		t.Fatalf("QueryRewardSignals failed: %v", err)
	}
	if len(results) != 1 {
		t.Errorf("got %d signals, want 1", len(results))
	}
	if results[0].Component != "helpfulness" {
		t.Errorf("Component = %q, want %q", results[0].Component, "helpfulness")
	}
}

func TestApp_GetLatestMetrics(t *testing.T) {
	app := newTestApp(t)
	exp, _ := app.CreateExperiment("test-latest", "{}")

	app.RecordMetrics(exp.ID, []metrics.Metric{
		{Step: 1, Name: "loss", Value: 2.5, Timestamp: 1000},
		{Step: 5, Name: "loss", Value: 0.3, Timestamp: 5000},
		{Step: 3, Name: "reward", Value: 0.7, Timestamp: 3000},
	})

	results, err := app.GetLatestMetrics(exp.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 metrics, got %d", len(results))
	}
}

func TestApp_NilMetricsStore(t *testing.T) {
	app := &App{}
	err := app.RecordMetrics("id", nil)
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("RecordMetrics: expected 'database not initialized', got %v", err)
	}
	_, err = app.QueryMetrics("id", "", 0, 0)
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("QueryMetrics: expected 'database not initialized', got %v", err)
	}
	err = app.RecordRewardSignals("id", nil)
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("RecordRewardSignals: expected 'database not initialized', got %v", err)
	}
	_, err = app.QueryRewardSignals("id", "", 0, 0)
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("QueryRewardSignals: expected 'database not initialized', got %v", err)
	}
	_, err = app.GetLatestMetrics("id")
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("GetLatestMetrics: expected 'database not initialized', got %v", err)
	}
}

// --- Event Emission Safety Tests ---

func TestApp_EmitEvent_NilCtx(t *testing.T) {
	app := newTestApp(t)
	// ctx is nil — mutations must not panic
	exp, err := app.CreateExperiment("test", `{}`)
	if err != nil {
		t.Fatalf("CreateExperiment with nil ctx should not fail: %v", err)
	}
	if exp == nil {
		t.Fatal("expected non-nil experiment")
	}

	// UpdateExperimentStatus with nil ctx
	if err := app.UpdateExperimentStatus(exp.ID, "running"); err != nil {
		t.Fatalf("UpdateExperimentStatus with nil ctx should not fail: %v", err)
	}

	// DeleteExperiment with nil ctx
	if err := app.DeleteExperiment(exp.ID); err != nil {
		t.Fatalf("DeleteExperiment with nil ctx should not fail: %v", err)
	}

	// AppendEvent with nil ctx — need a new experiment since we deleted the last one
	exp2, _ := app.CreateExperiment("test2", `{}`)
	if _, err := app.AppendEvent(exp2.ID, "metric", `{}`); err != nil {
		t.Fatalf("AppendEvent with nil ctx should not fail: %v", err)
	}

	// RecordMetrics with nil ctx
	m := []metrics.Metric{{Step: 1, Name: "loss", Value: 0.1, Timestamp: 1000}}
	if err := app.RecordMetrics(exp2.ID, m); err != nil {
		t.Fatalf("RecordMetrics with nil ctx should not fail: %v", err)
	}

	// RecordRewardSignals with nil ctx
	signals := []metrics.RewardSignal{{Step: 1, Component: "test", Value: 0.5}}
	if err := app.RecordRewardSignals(exp2.ID, signals); err != nil {
		t.Fatalf("RecordRewardSignals with nil ctx should not fail: %v", err)
	}
}

// --- Annotation API Tests ---

func TestApp_CreateAnnotation(t *testing.T) {
	app := newTestApp(t)
	exp, err := app.CreateExperiment("test", `{}`)
	if err != nil {
		t.Fatalf("CreateExperiment failed: %v", err)
	}
	ann, err := app.CreateAnnotation(exp.ID, 100, "checkpoint", "Step 100", `{"path": "/ckpt"}`)
	if err != nil {
		t.Fatalf("CreateAnnotation failed: %v", err)
	}
	if ann.ID == 0 {
		t.Error("expected non-zero ID")
	}
	if ann.Step != 100 {
		t.Errorf("Step = %d, want 100", ann.Step)
	}
	if ann.Type != "checkpoint" {
		t.Errorf("Type = %q, want %q", ann.Type, "checkpoint")
	}
}

func TestApp_QueryAnnotations(t *testing.T) {
	app := newTestApp(t)
	exp, _ := app.CreateExperiment("test", `{}`)
	app.CreateAnnotation(exp.ID, 100, "checkpoint", "Ckpt 100", "")
	app.CreateAnnotation(exp.ID, 200, "alert", "Drift", "")
	app.CreateAnnotation(exp.ID, 300, "checkpoint", "Ckpt 300", "")

	// All annotations
	all, err := app.QueryAnnotations(exp.ID, "", 0, 0)
	if err != nil {
		t.Fatalf("QueryAnnotations failed: %v", err)
	}
	if len(all) != 3 {
		t.Errorf("got %d annotations, want 3", len(all))
	}

	// Filter by type
	checkpoints, err := app.QueryAnnotations(exp.ID, "checkpoint", 0, 0)
	if err != nil {
		t.Fatalf("QueryAnnotations (checkpoint) failed: %v", err)
	}
	if len(checkpoints) != 2 {
		t.Errorf("got %d checkpoints, want 2", len(checkpoints))
	}
}

func TestApp_DeleteAnnotation(t *testing.T) {
	app := newTestApp(t)
	exp, _ := app.CreateExperiment("test", `{}`)
	ann, _ := app.CreateAnnotation(exp.ID, 100, "note", "Delete me", "")

	err := app.DeleteAnnotation(exp.ID, ann.ID)
	if err != nil {
		t.Fatalf("DeleteAnnotation failed: %v", err)
	}

	results, _ := app.QueryAnnotations(exp.ID, "", 0, 0)
	if len(results) != 0 {
		t.Errorf("got %d annotations after delete, want 0", len(results))
	}
}

func TestApp_NilAnnotationStore(t *testing.T) {
	app := &App{}
	_, err := app.CreateAnnotation("id", 100, "checkpoint", "label", "")
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("CreateAnnotation: expected 'database not initialized', got %v", err)
	}
	_, err = app.QueryAnnotations("id", "", 0, 0)
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("QueryAnnotations: expected 'database not initialized', got %v", err)
	}
	err = app.DeleteAnnotation("id", 1)
	if err == nil || err.Error() != "database not initialized" {
		t.Errorf("DeleteAnnotation: expected 'database not initialized', got %v", err)
	}
}

func TestApp_GetDBStatus_NoDB(t *testing.T) {
	app := &App{dbError: "test error"}
	status := app.GetDBStatus()
	if status != "test error" {
		t.Errorf("GetDBStatus = %q, want %q", status, "test error")
	}

	// No error case
	app2 := &App{}
	status2 := app2.GetDBStatus()
	if status2 != "" {
		t.Errorf("GetDBStatus = %q, want empty string", status2)
	}
}
