package main

import (
	"context"
	"fmt"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
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
