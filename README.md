# Flux

**The ML development environment.**
*Write code. Watch it learn.*

![Flux Screenshot](docs/screenshots/024-sparkline-charts.png)

<p align="center">
  <img src="https://img.shields.io/badge/status-in%20development-blue" alt="Status">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.23+-00ADD8?logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Wails-2-DF0000?logo=wails&logoColor=white" alt="Wails">
  <img src="https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white" alt="SQLite">
</p>

---

## Overview

Flux is a lightweight, workspace-focused IDE designed specifically for machine learning development. Built with [Wails](https://wails.io) (Go + React), it delivers native desktop performance in a ~15MB binary.

### Features

- **Experiment Tracking**: Create, manage, and monitor ML experiments with real-time status updates
- **Inline Metrics**: Live loss and reward values displayed on each experiment card
- **Sparkline Charts**: Mini SVG trend charts with LTTB downsampling for at-a-glance metric visualization
- **Resizable Panel Layout**: Persistent, draggable panel arrangement with collapsible columns
- **Event-Driven Updates**: Real-time metric streaming via Wails event system — no polling
- **Performance-First**: Cold start < 2-4s, near-zero idle CPU, ~200-450MB RAM

### Planned

- **Run Profiles**: First-class support for ML training scripts and deployment commands
- **Reward Signal Monitoring**: Track helpfulness, harmlessness, and honesty metrics for RLHF workflows
- **Language Server Support**: TypeScript, Python, and Go via LSP
- **Integrated Visualizations**: Full-size training metric charts with uPlot

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

### Completed

- **Phase 1: Foundation** — Wails setup, core UI shell with resizable panels, icon system, design tokens
- **Phase 2A: Data Layer** — SQLite integration, experiment CRUD, event sourcing, metrics storage (59 Go tests across 4 packages)
- **Phase 2B: Experiment List** — Wails bindings, experiment list UI, inline metrics display, sparkline charts (171 frontend tests across 17 suites)

### Phases

1. **Foundation** - Wails setup, core infrastructure
2. **Data Layer & Experiment List** - SQLite, experiment management, metrics storage, experiment UI
3. **File System** - File explorer, editor, workspace management
4. **Editor Core** - CodeMirror integration, syntax highlighting
5. **Run System** - Run profiles, terminal integration
6. **ML Features** - Full visualizations, reward hack detection
7. **Polish** - Performance optimization, packaging

## Architecture

```
flux-ml/
├── main.go              # Application entry point
├── app.go               # Wails application logic / Go backend
├── internal/            # Go backend packages
│   ├── database/        # SQLite infrastructure, migrations
│   ├── experiment/      # Experiment CRUD store
│   ├── event/           # Event sourcing store
│   └── metrics/         # Metrics and reward signal storage
├── frontend/            # React + TypeScript frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── stores/      # Zustand state management
│   │   ├── utils/       # Shared utilities (formatting, downsampling)
│   │   ├── hooks/       # Custom React hooks
│   │   └── styles/      # CSS design tokens and components
│   └── wailsjs/         # Generated Wails bindings
├── docs/                # Design docs and TDD documentation
└── assets/              # Branding and static assets
```

### Architecture Decisions

Key technical choices and their rationale:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CSS | Vanilla CSS + BEM | Zero runtime overhead, optimal for fixed desktop UI |
| State | Zustand | Lightweight, minimal boilerplate, scales well with domain stores |
| Charts | uPlot (planned) | Lightweight Canvas-based, handles 100k+ points |
| Database | SQLite (`modernc.org/sqlite`) | Embedded, pure Go, no CGo, works offline |

See [`docs/plan/08-frontend-architecture.md`](docs/plan/08-frontend-architecture.md) for detailed documentation.

## License

MIT
