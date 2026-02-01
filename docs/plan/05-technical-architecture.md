# Flux Technical Architecture

## Tech Stack

### Core
- **Framework:** Wails (Go backend + React frontend)
- **Frontend:** React + Vite + TypeScript
- **Backend:** Go
- **Database:** SQLite (embedded, no server)
- **Charts:** uPlot (29KB, Canvas-based, handles 100k+ points)

### Why Wails
- System webview (not Electron) = ~15MB binary
- Native performance, low memory
- Go backend handles heavy lifting
- Single binary distribution

## Performance Budgets

| Metric | Target |
|--------|--------|
| Binary size | ~15MB |
| Core RAM | ~200-450MB (without language servers) |
| Cold start | < 2-4 seconds |
| Idle CPU | Near 0% (no polling) |

## Data Architecture

### SQLite Schema

```sql
-- Experiments
CREATE TABLE experiments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config JSON,
    parent_id TEXT,  -- For forking/lineage
    status TEXT,     -- pending, running, completed, failed
    created_at INTEGER,
    updated_at INTEGER
);

-- Event sourcing
CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL,  -- metric, config_change, alert, checkpoint
    data JSON,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);

-- Metrics (denormalized for fast queries)
CREATE TABLE metrics (
    experiment_id TEXT,
    step INTEGER,
    name TEXT,
    value REAL,
    timestamp INTEGER,
    PRIMARY KEY (experiment_id, step, name)
);

-- Reward signals (specialized for RM work)
CREATE TABLE reward_signals (
    experiment_id TEXT,
    step INTEGER,
    component TEXT,  -- helpfulness, harmlessness, honesty
    value REAL,
    distribution JSON,  -- histogram data
    PRIMARY KEY (experiment_id, step, component)
);

-- Alerts
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY,
    experiment_id TEXT,
    type TEXT,       -- length_gaming, sycophancy, etc.
    step INTEGER,
    confidence REAL,
    data JSON,       -- evidence
    acknowledged INTEGER DEFAULT 0,
    created_at INTEGER
);

-- Full-text search on logs
CREATE VIRTUAL TABLE logs USING fts5(
    experiment_id, content, level, category
);
```

### Structured Logging Protocol

Training output parsed into JSON Lines:

```json
{"ts": 1706745600, "type": "metric", "step": 1000, "data": {"loss": 0.234, "reward": 0.89, "kl": 0.012}}
{"ts": 1706745601, "type": "alert", "category": "length_gaming", "data": {"correlation": 0.73, "step": 6200}}
{"ts": 1706745602, "type": "checkpoint", "data": {"path": "/checkpoints/step-8000"}}
```

### Parquet Export

For notebook analysis, export to Parquet:
- Matches what ML researchers expect
- Compatible with pandas, Spark
- Button: "Export to Parquet" → saves to experiment directory

## Backend Structure (Go)

```
internal/
├── events/
│   ├── store.go       # Event sourcing storage
│   └── bus.go         # Event pub/sub
├── experiment/
│   ├── config.go      # Typed experiment config
│   ├── runner.go      # Launch/stop experiments
│   └── tracker.go     # Status tracking
├── metrics/
│   ├── store.go       # SQLite metrics store
│   ├── streaming.go   # Real-time ingestion
│   └── aggregation.go # Rollups, stats
├── alerts/
│   ├── detector.go    # Pattern detection engine
│   ├── patterns/      # Individual pattern implementations
│   │   ├── length_gaming.go
│   │   ├── sycophancy.go
│   │   └── kl_drift.go
│   └── notifier.go    # Alert delivery
├── filesystem/
│   ├── watcher.go     # File system events
│   └── reader.go      # File operations
└── export/
    └── parquet.go     # Parquet export
```

## Frontend Structure (TypeScript)

```
src/
├── stores/
│   ├── experimentStore.ts   # Experiment state
│   ├── metricsStore.ts      # Live metrics
│   ├── alertStore.ts        # Alerts state
│   └── uiStore.ts           # Layout, navigation
├── components/
│   ├── Layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Inspector.tsx
│   │   └── BottomPanel.tsx
│   ├── Experiments/
│   │   ├── ExperimentList.tsx
│   │   ├── ExperimentDetail.tsx
│   │   └── ExperimentCard.tsx
│   ├── Charts/
│   │   ├── MetricsChart.tsx
│   │   ├── RewardComponents.tsx
│   │   └── Distribution.tsx
│   ├── Alerts/
│   │   ├── AlertCard.tsx
│   │   └── AlertEvidence.tsx
│   ├── Compare/
│   │   └── CompareView.tsx
│   └── Editor/
│       └── CodeEditor.tsx
├── hooks/
│   ├── useExperiment.ts
│   ├── useLiveMetrics.ts
│   └── useAlerts.ts
└── utils/
    ├── formatting.ts
    └── colors.ts
```

## Real-Time Data Flow

```
Training Process
      │
      ▼ (stdout/file)
┌─────────────────┐
│   Go Backend    │
│  Log Parser     │
└────────┬────────┘
         │ (structured events)
         ▼
┌─────────────────┐
│    SQLite       │
│  Event Store    │
└────────┬────────┘
         │ (Wails events)
         ▼
┌─────────────────┐
│   React UI      │
│  Live Updates   │
└─────────────────┘
```

## Lightweight Principles

1. **Lazy Loading**
   - Directory children loaded on expand
   - Metrics fetched on-demand
   - Charts use windowed data (last N points)

2. **Streaming Over Buffering**
   - Logs streamed line-by-line
   - Metrics appended to SQLite, not held in memory

3. **Go Backend Processing**
   - Heavy computation (diff, aggregation) in Go
   - Frontend receives pre-computed results

4. **No Background Polling**
   - File watching via fsnotify (event-driven)
   - Training updates via Wails events
   - GPU stats polled only when panel visible
