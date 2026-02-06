package main

import (
	"fmt"

	"github.com/kstruzzieri/flux-ml/internal/metrics"
)

// RecordMetrics inserts a batch of training metrics for an experiment.
func (a *App) RecordMetrics(experimentID string, m []metrics.Metric) error {
	if a.metrics == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.metrics.RecordMetrics(experimentID, m)
}

// QueryMetrics returns metrics matching the given filters, ordered by step ASC.
// name, startStep, and endStep are optional (empty/zero = no filter).
func (a *App) QueryMetrics(experimentID, name string, startStep, endStep int64) ([]metrics.Metric, error) {
	if a.metrics == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.metrics.QueryMetrics(experimentID, name, startStep, endStep)
}

// RecordRewardSignals inserts a batch of reward signal measurements for an experiment.
func (a *App) RecordRewardSignals(experimentID string, signals []metrics.RewardSignal) error {
	if a.metrics == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.metrics.RecordRewardSignals(experimentID, signals)
}

// QueryRewardSignals returns reward signals matching the given filters, ordered by step ASC.
// component, startStep, and endStep are optional (empty/zero = no filter).
func (a *App) QueryRewardSignals(experimentID, component string, startStep, endStep int64) ([]metrics.RewardSignal, error) {
	if a.metrics == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.metrics.QueryRewardSignals(experimentID, component, startStep, endStep)
}
