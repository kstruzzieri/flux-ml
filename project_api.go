package main

import (
	"fmt"
	"path/filepath"

	"github.com/kstruzzieri/flux-ml/internal/project"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// CurrentProjectStatus represents the full status of the active project.
type CurrentProjectStatus struct {
	Project     *project.Project    `json:"project,omitempty"`
	Config      *project.FluxConfig `json:"config,omitempty"`
	ConfigError string              `json:"configError,omitempty"`
	Warnings    []string            `json:"warnings,omitempty"`
	Degraded    bool                `json:"degraded"`
}

// CreateProject scaffolds and registers a new project.
func (a *App) CreateProject(name, dir, template string, seedDemo bool) (*project.Project, error) {
	if a.projects == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	// Scaffold the project directory
	if err := project.Scaffold(dir, name, template); err != nil {
		return nil, fmt.Errorf("scaffolding project: %w", err)
	}

	// Register in database
	proj, err := a.projects.Create(name, dir)
	if err != nil {
		return nil, fmt.Errorf("registering project: %w", err)
	}

	// Seed demo data if requested
	if seedDemo {
		a.seedProjectData(proj.ID)
	}

	// Open the newly created project
	a.setCurrentProject(proj, dir) // degraded mode is not fatal

	a.emitEvent("project:created", proj)
	return proj, nil
}

// OpenProject opens an existing project by directory path.
// Requires flux.yaml to exist. Supports degraded mode for malformed configs.
func (a *App) OpenProject(dir string) (*project.Project, error) {
	if a.projects == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	canonical, err := project.CanonicalProjectPath(dir)
	if err != nil {
		return nil, fmt.Errorf("canonicalizing path: %w", err)
	}

	if !project.IsProject(canonical) {
		return nil, fmt.Errorf("no flux.yaml found at %q", canonical)
	}

	// Find or register the project
	proj, err := a.projects.GetByPath(canonical)
	if err != nil {
		// Not registered yet — register using config name or dirname
		name := filepath.Base(canonical)
		cfg, _, loadErr := project.LoadConfig(canonical)
		if loadErr == nil && cfg.Name != "" {
			name = cfg.Name
		}
		proj, err = a.projects.Create(name, canonical)
		if err != nil {
			return nil, fmt.Errorf("registering project: %w", err)
		}
	}

	a.setCurrentProject(proj, canonical) // degraded mode is not fatal

	a.emitEvent("project:opened", proj)
	return proj, nil
}

// OpenFolderAsProject imports an existing folder as a Flux project.
// If flux.yaml doesn't exist, a minimal config is created.
func (a *App) OpenFolderAsProject(dir, name string, seedDemo bool) (*project.Project, error) {
	if a.projects == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	canonical, err := project.CanonicalProjectPath(dir)
	if err != nil {
		return nil, fmt.Errorf("canonicalizing path: %w", err)
	}

	// Write minimal config if flux.yaml doesn't exist
	if !project.IsProject(canonical) {
		cfg := project.BuildMinimalConfig(name)
		if err := project.WriteConfig(canonical, cfg); err != nil {
			return nil, fmt.Errorf("writing minimal config: %w", err)
		}
	}

	// Register in database
	proj, err := a.projects.GetByPath(canonical)
	if err != nil {
		proj, err = a.projects.Create(name, canonical)
		if err != nil {
			return nil, fmt.Errorf("registering project: %w", err)
		}
	}

	if seedDemo {
		a.seedProjectData(proj.ID)
	}

	a.setCurrentProject(proj, canonical) // degraded mode is not fatal

	a.emitEvent("project:imported", proj)
	return proj, nil
}

// CloseProject clears the active project session.
func (a *App) CloseProject() {
	a.currentProject = nil
	a.currentProjectConfig = nil
	a.currentProjectConfigError = ""
	a.currentProjectWarnings = nil
	a.emitEvent("project:closed")
}

// GetCurrentProject returns the active project, or nil if none.
func (a *App) GetCurrentProject() *project.Project {
	return a.currentProject
}

// GetCurrentProjectStatus returns the full status of the active project.
func (a *App) GetCurrentProjectStatus() CurrentProjectStatus {
	return CurrentProjectStatus{
		Project:     a.currentProject,
		Config:      a.currentProjectConfig,
		ConfigError: a.currentProjectConfigError,
		Warnings:    a.currentProjectWarnings,
		Degraded:    a.currentProjectConfigError != "",
	}
}

// ListRecentProjects returns the recently opened projects list.
func (a *App) ListRecentProjects() ([]project.RecentProject, error) {
	if a.localState == nil {
		return []project.RecentProject{}, nil
	}
	return a.localState.RecentProjects()
}

// GetProjectConfig reads and returns the config for a directory.
func (a *App) GetProjectConfig(dir string) (*project.FluxConfig, []string, error) {
	return project.LoadConfig(dir)
}

// IsFluxProject checks if the directory contains a flux.yaml.
func (a *App) IsFluxProject(dir string) bool {
	return project.IsProject(dir)
}

// setCurrentProject loads config and sets active project session state.
func (a *App) setCurrentProject(proj *project.Project, dir string) error {
	a.currentProject = proj
	a.currentProjectConfig = nil
	a.currentProjectConfigError = ""
	a.currentProjectWarnings = nil

	// Always update recent projects — even in degraded mode
	if a.localState != nil {
		a.localState.AddRecentProject(dir, proj.Name)
	}

	cfg, warnings, err := project.LoadConfig(dir)
	if err != nil {
		// Degraded mode: project opens but config is unavailable
		a.currentProjectConfigError = err.Error()
		a.emitEvent("project:status", a.GetCurrentProjectStatus())
		return err
	}

	a.currentProjectConfig = cfg
	a.currentProjectWarnings = warnings

	a.emitEvent("project:status", a.GetCurrentProjectStatus())
	return nil
}

// seedProjectData seeds demo experiments and metrics for a project.
func (a *App) seedProjectData(projectID string) {
	if a.experiments != nil {
		if err := a.experiments.SeedDemoExperiments(projectID); err != nil {
			a.logWarning("failed to seed demo experiments: %v", err)
		}
	}
	if a.metrics != nil {
		if err := a.metrics.SeedDemoMetrics(); err != nil {
			a.logWarning("failed to seed demo metrics: %v", err)
		}
	}
	if a.annotations != nil {
		if err := a.annotations.SeedDemoAnnotations(); err != nil {
			a.logWarning("failed to seed demo annotations: %v", err)
		}
	}
}

// logWarning logs a warning message if the runtime context is available.
func (a *App) logWarning(format string, args ...interface{}) {
	if a.ctx != nil {
		wailsRuntime.LogWarning(a.ctx, fmt.Sprintf(format, args...))
	}
}
