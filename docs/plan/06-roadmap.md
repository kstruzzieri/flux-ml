# Flux Development Roadmap

## Overview

This is a fresh start with ML at the forefront. The old flux-ide repo is archived; this roadmap is for the new repo.

## Phase 1: Foundation (Weeks 1-3)

### 1A: Project Setup
- [ ] Create new GitHub repo
- [ ] Initialize Wails project
- [ ] Set up React + Vite + TypeScript
- [ ] Configure ESLint, Prettier, testing
- [ ] CI/CD with GitHub Actions
- [ ] Basic app shell renders

### 1B: Layout System
- [ ] Header component
- [ ] Resizable panel system (left, main, right, bottom)
- [ ] Panel collapse/expand
- [ ] Layout state persistence
- [ ] Navigation between views

### 1C: Design System
- [ ] Color tokens (CSS variables)
- [ ] Typography system (Inter + JetBrains Mono)
- [ ] Base components (Button, Card, Badge, Input)
- [ ] Icon system
- [ ] Animation utilities

## Phase 2: Experiments Core (Weeks 4-6)

### 2A: Data Layer
- [ ] SQLite integration in Go
- [ ] Experiment CRUD operations
- [ ] Event store implementation
- [ ] Metrics storage
- [ ] Wails bindings for data access

### 2B: Experiment List
- [ ] Experiment list component
- [ ] Status indicators (running, completed, failed)
- [ ] Inline metrics display
- [ ] Sparkline charts
- [ ] Selection state

### 2C: Experiment Detail
- [ ] Detail view layout
- [ ] Metric cards with trends
- [ ] Basic chart (loss/reward over time)
- [ ] Config display in inspector

## Phase 3: Charts & Visualization (Weeks 7-9)

### 3A: Chart System
- [ ] uPlot integration
- [ ] Reusable chart components
- [ ] Live data updates
- [ ] Annotations (events, checkpoints)
- [ ] Zoom/pan controls

### 3B: Reward Components Chart
- [ ] Multi-line chart for components
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
- [ ] Alert pattern interface (Go)
- [ ] Length gaming detector
- [ ] KL divergence drift detector
- [ ] Alert storage and retrieval

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
- [ ] View list of experiments with status
- [ ] See live metrics during training
- [ ] Reward component divergence chart
- [ ] At least 1 reward hack pattern detected
- [ ] Click config value → see source
- [ ] Compare 2 experiments side-by-side

### Should Have
- [ ] Multiple alert patterns
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
