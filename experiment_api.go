package main

import (
	"fmt"

	"github.com/kstruzzieri/flux-ml/internal/experiment"
)

// CreateExperiment creates a new experiment with the given name and config JSON.
// When a project is active, the experiment is automatically scoped to it.
func (a *App) CreateExperiment(name, config string) (*experiment.Experiment, error) {
	if a.experiments == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	var exp *experiment.Experiment
	var err error
	if a.currentProject != nil {
		exp, err = a.experiments.CreateWithProject(name, config, a.currentProject.ID)
	} else {
		exp, err = a.experiments.Create(name, config)
	}
	if err != nil {
		return nil, err
	}
	a.emitEvent("experiment:created", exp)
	return exp, nil
}

// ListExperiments returns experiments based on the current project state.
// When a project is active, returns only that project's experiments.
// When no project is active, returns all experiments.
func (a *App) ListExperiments() ([]experiment.Experiment, error) {
	if a.experiments == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	if a.currentProject != nil {
		return a.experiments.ListByProject(a.currentProject.ID)
	}
	return a.experiments.List()
}

// ListUnscopedExperiments returns experiments not scoped to any project.
func (a *App) ListUnscopedExperiments() ([]experiment.Experiment, error) {
	if a.experiments == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.experiments.ListUnscoped()
}

// ClaimExperimentToProject moves an unscoped experiment into the given project.
func (a *App) ClaimExperimentToProject(experimentID, projectID string) error {
	if a.experiments == nil {
		return fmt.Errorf("database not initialized")
	}
	if err := a.experiments.ClaimExperimentToProject(experimentID, projectID); err != nil {
		return err
	}
	a.emitEvent("experiment:updated", map[string]string{"id": experimentID, "projectId": projectID})
	return nil
}

// ClaimExperimentToCurrentProject moves an unscoped experiment into the active project.
func (a *App) ClaimExperimentToCurrentProject(experimentID string) error {
	if a.currentProject == nil {
		return fmt.Errorf("no project is currently open")
	}
	return a.ClaimExperimentToProject(experimentID, a.currentProject.ID)
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
