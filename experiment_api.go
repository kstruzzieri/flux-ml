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
	exp, err := a.experiments.Create(name, config)
	if err != nil {
		return nil, err
	}
	a.emitEvent("experiment:created", exp)
	return exp, nil
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
	if err := a.experiments.UpdateStatus(id, status); err != nil {
		return err
	}
	a.emitEvent("experiment:updated", map[string]string{"id": id, "status": status})
	return nil
}

// DeleteExperiment removes an experiment by ID.
func (a *App) DeleteExperiment(id string) error {
	if a.experiments == nil {
		return fmt.Errorf("database not initialized")
	}
	if err := a.experiments.Delete(id); err != nil {
		return err
	}
	a.emitEvent("experiment:deleted", map[string]string{"id": id})
	return nil
}
