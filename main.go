package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:     "Flux",
		Width:     1440,
		Height:    900,
		MinWidth:  1024,
		MinHeight: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 22, G: 27, B: 34, A: 1},
		Mac: &mac.Options{
			Appearance: mac.NSAppearanceNameDarkAqua,
		},
		OnStartup:  app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
		},
		WindowStartState: options.Maximised,
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
