# Flux Development Roadmap

## Overview

Flux is an ML development environment focused on reward model workflows, experiment tracking, and training visualization.

## Current Status (May 16, 2026)

- `develop` is current through PR #130 (`codex/alert-engine-v1`).
- Completed: Phase 1 foundation, Phase 2A data layer, Phase 2B experiment list, Phase 2C experiment detail/chart foundation, the project model/project UI foundation, and Phase 4A alert engine v1.
- Recently landed: project open/import/new-project flows, recent-project handling, canonical project path fixes, seeded-project reopen behavior, wizard/default-folder follow-ups, and backend reward-hack detections with alert persistence/retrieval.
- Verification baseline: `npm test -- --runInBand`, `npm run typecheck`, `npm run lint`, `go test ./...`, and `git diff --check`.
- Next focus: finish reward component divergence/anomaly visualization, then build Phase 4B alert UI evidence/actions/header surfaces on top of the persisted alert engine.

## Phase 1: Foundation (Weeks 1-3)

### 1A: Project Setup
- [x] Create new GitHub repo
- [x] Initialize Wails project
- [x] Set up React + Vite + TypeScript
- [x] Configure ESLint, Prettier, testing
- [x] CI/CD with GitHub Actions
- [x] Basic app shell renders

### 1B: Layout System
- [x] Header component
- [x] Resizable panel system (left, main, right, bottom)
- [x] Panel collapse/expand
- [x] Layout state persistence
- [x] Navigation between views

### 1C: Design System
- [x] Color tokens (CSS variables)
- [x] Typography system (Inter + JetBrains Mono)
- [x] Base components (Button, Card, Badge, Input)
- [x] Icon system
- [x] Animation utilities

## Phase 2: Experiments Core & Projects (Weeks 4-6)

### 2A: Data Layer
- [x] SQLite integration in Go
- [x] Experiment CRUD operations
- [x] Event store implementation
- [x] Metrics storage
- [x] Wails bindings for data access

### 2B: Experiment List
- [x] Experiment list component
- [x] Status indicators (running, completed, failed)
- [x] Inline metrics display
- [x] Sparkline charts
- [x] Selection state

### 2C: Experiment Detail
- [x] Detail view layout
- [x] Metric cards with trends
- [x] Basic chart (loss/reward over time)
- [x] Config display in inspector

### 2D: Project Model & Project UI
- [x] `flux.yaml` project model, canonical path identity, and guarded project store
- [x] Project-scoped experiment listing/creation and unscoped claim flow
- [x] Safe scaffold/import flows, recent-project state, and degraded open mode
- [x] Welcome screen, New Project wizard, Import dialog, and project switcher
- [x] PR #128 follow-ups: cancel controls, folder/open refresh, stale recent errors, seeded-project reopen, and user folder preservation

## Phase 3: Charts & Visualization (Weeks 7-9)

### 3A: Chart System
- [x] uPlot integration
- [x] Reusable chart components
- [x] Live data updates
- [x] Annotations (events, checkpoints)
- [ ] Zoom/pan controls

### 3B: Reward Components Chart
- [x] Multi-line chart for components
- [ ] Divergence visualization
- [ ] Anomaly zone highlighting
- [ ] Click-to-inspect interactions

### 3C: Distribution Charts
- [ ] Histogram component
- [ ] Reward distribution view
- [ ] Response length distribution
- [ ] Baseline comparison overlay

## Phase 4: Alert System (Weeks 10-11)

### 4A: Detection Engine
- [x] Alert pattern interface (Go)
- [x] Length gaming detector
- [x] KL divergence drift detector
- [x] Alert storage and retrieval
- [x] Sycophancy and reward collapse detectors
- [x] Backend detections wired into reward-hack status card

### 4B: Alert UI
- [ ] Alert card component
- [ ] Evidence display
- [ ] Alert actions (view examples, ignore)
- [ ] Alert badge in header
- [ ] Inline alerts in training output

## Phase 5: Integration (Weeks 12-14)

### 5A: Training Integration
- [ ] Structured log parser
- [ ] Real-time log streaming
- [ ] Training output panel
- [ ] Process management (start/stop)

### 5B: File System
- [ ] File tree component
- [ ] File reading/writing
- [ ] Config file editing
- [ ] Click-to-source navigation

### 5C: Comparison View
- [ ] Side-by-side layout
- [ ] Overlaid chart trajectories
- [ ] Config diff highlighting
- [ ] Metric comparison table

## Phase 6: Polish (Weeks 15-16)

### 6A: Performance
- [ ] Virtual scrolling for lists
- [ ] Chart performance optimization
- [ ] Lazy loading throughout
- [ ] Memory profiling

### 6B: UX Polish
- [ ] Keyboard shortcuts
- [ ] Command palette
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states

### 6C: Export & Extras
- [ ] Parquet export
- [ ] Screenshot/share experiment
- [ ] Settings panel
- [ ] Documentation

## Success Criteria

### Must Have (MVP)
- [x] View list of experiments with status
- [x] See live metrics during training
- [ ] Reward component divergence chart
- [x] At least 1 reward hack pattern detected
- [ ] Click config value → see source
- [ ] Compare 2 experiments side-by-side

### Should Have
- [x] Multiple alert patterns
- [ ] Parquet export
- [ ] Full keyboard navigation
- [ ] Smooth animations

### Nice to Have
- [ ] GPU monitoring
- [ ] Environment detection
- [ ] TensorBoard integration

## What We're NOT Building

- LSP / code intelligence
- Git integration
- Debugger (DAP)
- Preview pane
- Plugin system
- MLflow/W&B adapters (future)
