package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// App struct
type App struct {
	ctx        context.Context
	configPath string
}

// NewApp creates a new App application struct
func NewApp() *App {
	// Get user config directory
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	fluxDir := filepath.Join(configDir, "Flux")
	os.MkdirAll(fluxDir, 0755)

	return &App{
		configPath: filepath.Join(fluxDir, "layout.json"),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// AppInfo contains application metadata
type AppInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// GetAppInfo returns application metadata for the frontend
func (a *App) GetAppInfo() AppInfo {
	return AppInfo{
		Name:    "Flux",
		Version: "0.1.0",
	}
}

// LayoutState represents the panel layout configuration
type LayoutState struct {
	LeftWidth       int  `json:"leftWidth"`
	RightWidth      int  `json:"rightWidth"`
	OutputHeight    int  `json:"outputHeight"`
	LeftTopHeight   int  `json:"leftTopHeight"`
	RightTopHeight  int  `json:"rightTopHeight"`
	LeftCollapsed   bool `json:"leftCollapsed"`
	RightCollapsed  bool `json:"rightCollapsed"`
	OutputCollapsed bool `json:"outputCollapsed"`
}

// GetLayout loads the saved layout from disk
func (a *App) GetLayout() LayoutState {
	// Default layout
	defaultLayout := LayoutState{
		LeftWidth:       280,
		RightWidth:      320,
		OutputHeight:    180,
		LeftTopHeight:   200,
		RightTopHeight:  200,
		LeftCollapsed:   false,
		RightCollapsed:  false,
		OutputCollapsed: false,
	}

	data, err := os.ReadFile(a.configPath)
	if err != nil {
		return defaultLayout
	}

	var layout LayoutState
	if err := json.Unmarshal(data, &layout); err != nil {
		return defaultLayout
	}

	return layout
}

// SaveLayout saves the layout to disk
func (a *App) SaveLayout(layout LayoutState) error {
	data, err := json.MarshalIndent(layout, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.configPath, data, 0644)
}
