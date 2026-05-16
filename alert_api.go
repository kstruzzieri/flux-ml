package main

import (
	"fmt"

	"github.com/kstruzzieri/flux-ml/internal/alerts"
)

// GetDetections evaluates the reward-hack detectors for an experiment and
// returns all detector statuses, including clear results.
func (a *App) GetDetections(experimentID string) ([]alerts.DetectionResult, error) {
	if a.metrics == nil || a.alerts == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	engine := alerts.NewEngine(a.metrics, a.alerts)
	return engine.DetectExperiment(experimentID)
}

// GetAlerts returns persisted non-clear alerts for an experiment.
func (a *App) GetAlerts(experimentID string) ([]alerts.Alert, error) {
	if a.alerts == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.alerts.ListByExperiment(experimentID)
}

func (a *App) evaluateAlertsForExperiment(experimentID string) {
	if a.metrics == nil || a.alerts == nil {
		return
	}
	engine := alerts.NewEngine(a.metrics, a.alerts)
	detections, err := engine.EvaluateExperiment(experimentID)
	if err != nil {
		a.logWarning("failed to evaluate alerts for experiment %s: %v", experimentID, err)
		a.emitEvent("alerts:error", map[string]interface{}{"experimentId": experimentID, "error": err.Error()})
		return
	}
	active := 0
	for _, detection := range detections {
		if detection.Status != alerts.LevelClear {
			active++
		}
	}
	a.emitEvent("alerts:updated", map[string]interface{}{"experimentId": experimentID, "count": active})
}
