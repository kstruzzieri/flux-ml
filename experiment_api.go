package main

import (
	"fmt"

	"github.com/kstruzzieri/flux-ml/internal/experiment"
)

// CreateExperiment creates a new experiment with the given name and config JSON.
func (a *App) CreateExperiment(name, config string) (*experiment.Experiment, error) {
	if a.experiments == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.experiments.Create(name, config)
}

// ListExperiments returns all experiments ordered by creation time (newest first).
func (a *App) ListExperiments() ([]experiment.Experiment, error) {
	if a.experiments == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.experiments.List()
}

// GetExperiment returns a single experiment by ID.
func (a *App) GetExperiment(id string) (*experiment.Experiment, error) {
	if a.experiments == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.experiments.GetByID(id)
}

// UpdateExperimentStatus changes the status of an experiment.
func (a *App) UpdateExperimentStatus(id, status string) error {
	if a.experiments == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.experiments.UpdateStatus(id, status)
}

// DeleteExperiment removes an experiment by ID.
func (a *App) DeleteExperiment(id string) error {
	if a.experiments == nil {
		return fmt.Errorf("database not initialized")
	}
	return a.experiments.Delete(id)
}
