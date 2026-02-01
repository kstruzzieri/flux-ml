# Flux

![Flux Banner](assets/branding/banner.svg)

**The ML development environment.**
*Write code. Watch it learn.*

---

## Overview

Flux is a lightweight, workspace-focused IDE designed specifically for machine learning development. Built with [Wails](https://wails.io) (Go + React), it delivers native desktop performance in a ~15MB binary.

### Key Features (Planned)

- **Workspace Model**: Multiple focused workspaces per repository with independent layouts and run configurations
- **Run Profiles**: First-class support for ML training scripts, experiments, and deployment commands
- **Integrated Visualizations**: Real-time training metrics, loss curves, and model performance charts
- **Reward Signal Monitoring**: Track helpfulness, harmlessness, and honesty metrics for RLHF workflows
- **Language Server Support**: TypeScript, Python, and Go via LSP
- **Performance-First**: Cold start < 2-4s, near-zero idle CPU, ~200-450MB RAM

## Tech Stack

- **Framework**: [Wails v2](https://wails.io) - Go backend + React frontend
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Go 1.23+
- **Platforms**: macOS, Windows, Linux

## Development

### Prerequisites

- Go 1.23+
- Node.js 18+
- Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/kstruzzieri/flux-ml.git
cd flux-ml

# Install frontend dependencies
cd frontend && npm install && cd ..

# Run in development mode
wails dev

# Build for production
wails build
```

## Project Status

This project is in active development. See the [GitHub Issues](https://github.com/kstruzzieri/flux-ml/issues) for the roadmap.

### Phases

1. **Foundation** - Wails setup, core infrastructure
2. **File System** - File explorer, editor, workspace management
3. **Editor Core** - CodeMirror integration, syntax highlighting
4. **Run System** - Run profiles, terminal integration
5. **ML Features** - Visualizations, metrics, experiment tracking
6. **Polish** - Performance optimization, packaging

## Architecture

```
flux-ml/
├── main.go              # Application entry point
├── app.go               # Wails application logic / Go backend
├── frontend/            # React + TypeScript frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── stores/      # Zustand state management
│   │   └── wailsjs/     # Generated Wails bindings
│   └── ...
├── docs/                # Design docs and TDD documentation
└── assets/              # Branding and static assets
```

## License

MIT
