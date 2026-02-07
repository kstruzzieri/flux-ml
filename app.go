package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/kstruzzieri/flux-ml/internal/database"
	"github.com/kstruzzieri/flux-ml/internal/event"
	"github.com/kstruzzieri/flux-ml/internal/experiment"
	"github.com/kstruzzieri/flux-ml/internal/metrics"
	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx         context.Context
	configPath  string
	db          *database.DB
	experiments *experiment.Store
	events      *event.Store
	metrics     *metrics.Store
	dbError     string
}

// NewApp creates a new App application struct
func NewApp() *App {
	configDir, err := os.UserConfigDir()
	if err != nil {
		// Cannot determine config directory — use a visible local path
		// rather than silently falling back to "." which changes with cwd.
		home, homeErr := os.UserHomeDir()
		if homeErr != nil {
			// Both failed — this is a critical system issue
			fmt.Fprintf(os.Stderr, "cannot determine config or home directory: config=%v, home=%v\n", err, homeErr)
			return &App{dbError: fmt.Sprintf("cannot determine config directory: %v", err)}
		}
		configDir = filepath.Join(home, ".config")
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

	// If NewApp already failed to resolve a config directory, skip DB init
	if a.dbError != "" {
		wailsRuntime.LogError(ctx, a.dbError)
		return
	}

	configDir, err := os.UserConfigDir()
	if err != nil {
		home, _ := os.UserHomeDir()
		configDir = filepath.Join(home, ".config")
	}
	dbPath := filepath.Join(configDir, "Flux", "flux.db")
	db, err := database.Open(dbPath)
	if err != nil {
		a.dbError = fmt.Sprintf("failed to open database: %v", err)
		wailsRuntime.LogError(ctx, a.dbError)
		return
	}
	a.db = db
	a.experiments = experiment.NewStore(db)
	a.events = event.NewStore(db)
	a.metrics = metrics.NewStore(db)
}

// GetDBStatus returns the database initialization error, or empty string if OK.
// The frontend should call this on startup to surface DB errors to the user.
func (a *App) GetDBStatus() string {
	return a.dbError
}

// emitEvent emits a Wails event if the runtime context is available.
// Guards against nil ctx so tests without a Wails runtime don't panic.
func (a *App) emitEvent(eventName string, data ...interface{}) {
	if a.ctx != nil {
		wailsRuntime.EventsEmit(a.ctx, eventName, data...)
	}
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	if a.db != nil {
		a.db.Close()
	}
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
