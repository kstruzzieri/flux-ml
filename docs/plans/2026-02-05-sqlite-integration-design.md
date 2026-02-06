# SQLite Integration Design — Issue #16

## Overview

Set up the embedded SQLite database for Flux's experiment data storage. This is the first backend package (`internal/database`) and provides the foundation for issues #17–20.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SQLite driver | `modernc.org/sqlite` (pure Go) | No CGo, easier cross-compilation, works cleanly with Wails |
| Migration system | Embedded SQL files via `//go:embed` | Transparent, reviewable, simple |
| DB location | App data directory (`~/Library/Application Support/Flux/flux.db`) | OS convention, survives app updates |
| Schema scope | Full initial schema in `001_initial_schema.sql` | All tables designed, avoids unnecessary migration splits |

## Package Structure

```
internal/
└── database/
    ├── database.go          # DB struct, Open/Close, connection management
    ├── database_test.go     # Connection and pragma tests
    ├── migrate.go           # Migration runner
    ├── migrate_test.go      # Migration and schema tests
    └── migrations/
        └── 001_initial_schema.sql
```

## Connection Management

`Open(path string) (*DB, error)`:
1. Creates parent directory if needed
2. Opens SQLite connection
3. Applies pragmas: `WAL`, `foreign_keys=ON`, `busy_timeout=5000`
4. Runs migrations
5. Returns `*DB`

```go
type DB struct {
    *sql.DB
    path string
}
```

## Migration System

- `//go:embed migrations/*.sql` for embedded SQL files
- `schema_migrations` table tracks applied versions
- Each migration runs in a transaction (except FTS5 statements)
- Idempotent — safe to call on every startup

## Initial Schema (001)

Tables from `docs/plan/05-technical-architecture.md`:
- `experiments` — id, name, config (JSON), parent_id, status, timestamps
- `events` — event sourcing with experiment_id FK, type, data (JSON)
- `metrics` — denormalized, composite PK (experiment_id, step, name)
- `reward_signals` — RM-specific, distribution JSON
- `alerts` — type, confidence, evidence (JSON), acknowledged flag
- `logs` — FTS5 virtual table for full-text search

## Integration (future — issue #20)

`app.go` startup calls `database.Open()`, stores `*DB` on `App` struct. Shutdown calls `Close()`. Not wired in this issue.

## Test Plan

### Connection tests (`database_test.go`)
1. `TestOpen_CreatesDatabase` — file exists after open
2. `TestOpen_CreatesParentDirectory` — nested dirs created
3. `TestOpen_PragmasApplied` — WAL, foreign keys, busy timeout
4. `TestOpen_RunsMigrations` — all tables exist
5. `TestClose` — no error on close

### Migration tests (`migrate_test.go`)
6. `TestMigrate_CreatesSchemaTable` — schema_migrations exists
7. `TestMigrate_AppliesAllMigrations` — all tables present
8. `TestMigrate_RecordsVersions` — version recorded in schema_migrations
9. `TestMigrate_Idempotent` — runs twice without error

### Schema validation tests (`migrate_test.go`)
10. `TestSchema_ExperimentsTable` — insert/query with JSON config
11. `TestSchema_MetricsTable` — composite primary key works
12. `TestSchema_RewardSignalsTable` — distribution JSON
13. `TestSchema_EventsTable` — FK to experiments
14. `TestSchema_AlertsTable` — insert/query
15. `TestSchema_ForeignKeyEnforcement` — invalid FK rejected
16. `TestSchema_LogsFTS` — full-text search works
