# Data Layer Implementation Plan

This document covers the full backend data layer: SQLite infrastructure, experiment CRUD, and event sourcing. These correspond to issues #16, #17, and #18 in the roadmap (Phase 2A: Data Layer).

## Overview

| Issue | Component | Package | Status |
|-------|-----------|---------|--------|
| #16 | SQLite integration | `internal/database/` | Complete |
| #17 | Experiment CRUD | `internal/experiment/` | Complete |
| #18 | Event store | `internal/event/` | In Progress |

## Shared Architecture

All data layer packages follow the same patterns:

- **Store pattern**: Domain packages expose a `Store` struct wrapping `*database.DB`
- **Constructor**: `NewStore(db *database.DB) *Store`
- **Error handling**: `fmt.Errorf("operation: %w", err)` wrapping
- **Wails API**: Thin pass-through methods in `<domain>_api.go` on `App` struct with nil-check guards
- **Testing**: Isolated SQLite via `t.TempDir()` + `database.Open()` + `t.Cleanup()`

---

## Issue #16: SQLite Integration

**Branch:** `feature/16-sqlite-integration` (merged)
**TDD doc:** `docs/tdd/016-sqlite-integration.md`

### What was built

Infrastructure package (`internal/database/`) providing:

- **`database.go`** — `DB` struct wrapping `*sql.DB`, `Open(path)` creates dirs + opens connection + applies pragmas + runs migrations
- **`migrate.go`** — Embedded SQL migration runner with `//go:embed`, `schema_migrations` tracking table, transaction support, `META:no_transaction` flag for FTS5
- **`migrations/001_initial_schema.sql`** — All core tables (experiments, events, metrics, reward_signals, alerts)
- **`migrations/002_logs_fts5.sql`** — Full-text search on logs

### Schema

```sql
-- Experiments
CREATE TABLE experiments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config JSON,
    parent_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES experiments(id)
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
    experiment_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    name TEXT NOT NULL,
    value REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    PRIMARY KEY (experiment_id, step, name),
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);

-- Reward signals (specialized for RM work)
CREATE TABLE reward_signals (
    experiment_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    component TEXT NOT NULL,
    value REAL NOT NULL,
    distribution JSON,
    PRIMARY KEY (experiment_id, step, component),
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);

-- Alerts
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    type TEXT NOT NULL,
    step INTEGER NOT NULL,
    confidence REAL NOT NULL,
    data JSON,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);

-- Full-text search on logs (FTS5, no-transaction migration)
CREATE VIRTUAL TABLE logs USING fts5(
    experiment_id, content, level, category
);
```

### Design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Driver | `modernc.org/sqlite` (pure Go) | No CGo, easier cross-compilation |
| DB location | `~/Library/Application Support/Flux/flux.db` | OS convention |
| Migrations | Embedded SQL via `//go:embed` | Transparent, reviewable |
| Journal mode | WAL | Concurrent reads during writes |
| Foreign keys | `PRAGMA foreign_keys=ON` | Referential integrity |
| Busy timeout | 5000ms | Handles brief lock contention |

### Tests (14 passing)

Connection management (5): Open creates DB, creates parent dirs, applies pragmas (WAL + FK + busy_timeout), runs migrations, Close works.

Migration system (4): Creates schema_migrations table, applies all migrations, records versions, idempotent.

Schema validation (5): Experiments, metrics, reward_signals, events, alerts tables work; FK enforcement; FTS5 search.

---

## Issue #17: Experiment CRUD

**Branch:** `feature/17-experiment-crud` (merged)
**TDD doc:** `docs/tdd/017-experiment-crud.md`

### What was built

Domain package (`internal/experiment/`) providing:

- **`store.go`** — `Experiment` struct, status constants, `Store` with Create/List/GetByID/UpdateStatus/Delete
- **`store_test.go`** — 11 tests

Wails integration:

- **`experiment_api.go`** — Thin pass-through methods on `App` struct
- **`app.go`** — DB + experiment store initialization in startup/shutdown lifecycle

### API

| Method | Signature | Notes |
|--------|-----------|-------|
| Create | `Create(name, config string) (*Experiment, error)` | UUID v4 ID, validates name not empty |
| List | `List() ([]Experiment, error)` | Ordered by created_at DESC, returns `[]` not nil |
| GetByID | `GetByID(id string) (*Experiment, error)` | Returns error if not found |
| UpdateStatus | `UpdateStatus(id, status string) error` | Validates status against allowed set |
| Delete | `Delete(id string) error` | Returns error if not found |

### Design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary key | UUID v4 (`github.com/google/uuid`) | Offline creation, merge-safe |
| Status validation | Application-layer map check | Prevents invalid states before DB |
| Timestamps | Unix epoch integers | Simple, timezone-neutral |
| Not-found detection | `RowsAffected()` check | Fewer round-trips than query-first |
| Empty slice guarantee | `[]Experiment{}` init | Clean JSON serialization |

### Tests (11 passing)

Create (2): Success with UUID/timestamps/fields, empty name error.
List (2): Returns all experiments, returns empty slice not nil.
GetByID (2): Found returns correct data, not found returns error.
UpdateStatus (3): Valid status persists + updates timestamp, invalid status errors, not found errors.
Delete (2): Success removes from DB, not found errors.

---

## Issue #18: Event Store

**Branch:** `feature/18-event-store` (current)
**TDD doc:** `docs/tdd/018-event-store.md` (to be created)

### What will be built

Domain package (`internal/event/`) providing:

- **`store.go`** — `Event` struct, type constants, `Store` with Append/Replay/Subscribe/Unsubscribe
- **`store_test.go`** — 13 tests

Wails integration:

- **`event_api.go`** — AppendEvent + ReplayEvents pass-through methods on `App`
- **`app.go`** — Add `events *event.Store` field and initialization

### Data types

```go
type Event struct {
    ID           int64  `json:"id"`
    ExperimentID string `json:"experiment_id"`
    Timestamp    int64  `json:"timestamp"`
    Type         string `json:"type"`
    Data         string `json:"data"`
}

const (
    TypeMetric       = "metric"
    TypeConfigChange = "config_change"
    TypeAlert        = "alert"
    TypeCheckpoint   = "checkpoint"
)

type Subscription struct {
    ch           chan Event
    experimentID string  // empty = all events
    id           int
}

type Store struct {
    db          *database.DB
    mu          sync.RWMutex
    subscribers map[int]*Subscription
    nextID      int
}
```

### API

| Method | Signature | Notes |
|--------|-----------|-------|
| Append | `Append(experimentID, eventType, data string) (*Event, error)` | Validates inputs, notifies subscribers |
| Replay | `Replay(experimentID string, startTime, endTime int64, eventType string) ([]Event, error)` | All filters optional (empty/zero = skip), ASC order |
| Subscribe | `Subscribe(experimentID string) *Subscription` | Buffered channel (64), empty ID = all events |
| Unsubscribe | `Unsubscribe(sub *Subscription)` | Removes from map, closes channel |
| Events | `(s *Subscription) Events() <-chan Event` | Read-only channel accessor |

### Design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Subscription model | Channel-based pub/sub | Idiomatic Go, testable without Wails |
| Subscribe filtering | By experiment ID at subscribe time | Most common use case |
| Replay filters | Time range + experiment + type | Covers requirements plus type filtering |
| Notification | Non-blocking send, buffered channel (64) | Slow subscriber doesn't block writes |
| Wails exposure | Append + Replay only | Subscribe/Unsubscribe are internal Go APIs |

### Test plan (13 tests)

Append (4): Success with ID/timestamp/fields, empty experimentID error, invalid type error, FK violation error.
Replay (6): Chronological order (ASC), filter by experiment, filter by time range, filter by type, combined filters, no matches returns empty slice.
Subscribe (3): Receives appended events, filtered by experiment ID, unsubscribe stops delivery.

### Implementation steps

1. Create TDD doc (`docs/tdd/018-event-store.md`)
2. Write failing tests (`internal/event/store_test.go`) with minimal stub (`store.go`)
3. Implement store methods
4. Verify all 13 tests pass
5. Add Wails API (`event_api.go`) and wire in `app.go`
6. Run full test suite (database + experiment + event)
7. Update TDD doc with results
