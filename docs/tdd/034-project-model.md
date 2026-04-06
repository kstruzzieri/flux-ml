# TDD: Issue #116 — Project Model

## Issue Summary
Introduce the Flux project model end-to-end: `flux.yaml` config, project registration with canonical path identity, project-scoped experiments, safe scaffold/import flows, active-project app session state, and minimal frontend wiring so the current app behaves differently when a project is open.

## Acceptance Criteria
- [x] SQLite `projects` table with UNIQUE path constraint
- [x] `experiments.project_id` nullable FK to projects
- [x] Canonical path handling (symlink resolution, absolute, cleaned) before all DB writes, lookups, recent-project writes, and per-project local-state writes
- [x] `flux.yaml` parsing with separable parse/validate for degraded-mode support
- [x] Degraded open mode: malformed `flux.yaml` opens project with config error surfaced, config-dependent features disabled
- [x] Import-existing-folder flow: writes minimal `flux.yaml` when absent
- [x] Project store CRUD with guarded delete (rejects when experiments are scoped)
- [x] Experiment scoping: `CreateWithProject`, `ListByProject`, `ListUnscoped`
- [x] Explicit claim flow: `ClaimExperimentToProject` rejects already-scoped experiments
- [x] Safe scaffold: `//go:embed all:templates` for dotfiles, conflict detection, preview before apply
- [x] Scaffolded blank template includes `.gitignore`, `src/`, `configs/`, `data/`
- [x] Local state: recent projects (canonical path deduped), per-project state (atomic writes)
- [x] Active project session state in App struct
- [x] Existing `ListExperiments()` becomes project-scoped when project is active
- [x] Existing `CreateExperiment()` auto-scopes when project is active
- [x] Demo seeding is no longer unconditional — only via explicit `seedDemo` flag
- [x] Wails binding updates for all new project lifecycle methods
- [x] Frontend mocks updated with project namespace and API surface
- [x] `projectStore` (zustand) for current project status tracking
- [x] `experimentStore` refetches on project open/close events
- [x] Project events: `project:created`, `project:opened`, `project:imported`, `project:closed`, `project:status`

## Rationale
Flux needs projects as the fundamental organizing concept — experiments, configs, and data belong to a project directory. Without projects, all experiments are global and unorganized, which doesn't scale beyond toy usage.

**Design decisions:**
- **Canonical path identity** — prevents duplicate project entries from symlinks, trailing slashes, or relative paths.
- **Parse/validate separation** — enables degraded mode so users are never locked out of their project.
- **Delete guard** — explicitly rejects project deletion when experiments are scoped, rather than silently orphaning or cascading.
- **Existing API preservation** — `ListExperiments()` and `CreateExperiment()` signatures unchanged; behavior changes based on active project session state.
- **Explicit claim flow** — unscoped experiments are visible through dedicated methods and can be claimed, preventing silent data loss from auto-scoping.

## Test Summary

### Backend — Database Migration
```
go test ./internal/database/ -v
--- PASS: TestMigrate_AppliesAllMigrations (projects table exists)
--- PASS: TestMigrate_RecordsVersions (005_projects in versions)
--- PASS: TestMigrate_Idempotent (5 migration versions)
--- PASS: TestSchema_ProjectsTable (insert, query, UNIQUE constraint)
--- PASS: TestSchema_ExperimentProjectID (scoped insert, NULL insert, FK violation, index)
```

### Backend — Project Package
```
go test ./internal/project/ -v
--- PASS: TestCanonicalProjectPath_Empty
--- PASS: TestCanonicalProjectPath_Absolute
--- PASS: TestCanonicalProjectPath_Relative
--- PASS: TestCanonicalProjectPath_ResolvesSymlinks
--- PASS: TestCanonicalProjectPath_NonExistentFallback
--- PASS: TestCanonicalProjectPath_NormalizesTrailingSlash
--- PASS: TestCreate_Success (project store)
--- PASS: TestCreate_EmptyName / TestCreate_EmptyPath / TestCreate_DuplicatePath
--- PASS: TestCreate_DuplicatePathAfterCanonicalization
--- PASS: TestGetByPath_Canonicalizes / TestGetByID_Found / TestGetByID_NotFound
--- PASS: TestList_Empty / TestList_ReturnsAll
--- PASS: TestDelete_EmptyProject / TestDelete_WithScopedExperiments / TestDelete_NotFound
--- PASS: TestIsProject_* / TestReadConfigFile_* / TestParseConfig_* / TestValidateConfig_*
--- PASS: TestLoadConfig_* / TestWriteConfig_RoundTrip / TestBuildMinimalConfig
--- PASS: TestPlanScaffold_* / TestScaffold_* (blank, reward-model, conflict, dotfiles)
--- PASS: TestRecentProjects_* / TestProjectState_* (round trip, canonical, corrupt, max)
--- PASS: TestIntegration_FullWorkflow
--- PASS: TestIntegration_ImportExistingFolder
--- PASS: TestIntegration_DegradedOpenMode
--- PASS: TestIntegration_CanonicalPathConsistency
--- PASS: TestIntegration_ScaffoldAndVerify
```

### Backend — Experiment Scoping
```
go test ./internal/experiment/ -v
--- PASS: TestExperiment_ProjectID
--- PASS: TestCreateWithProject_EmptyProjectID
--- PASS: TestListByProject / TestListUnscoped / TestListAll_StillReturnsEverything
--- PASS: TestClaimExperimentToProject_Success / _AlreadyScoped / _NotFound
```

### Backend — App API
```
go test -run 'TestApp_' -v
--- PASS: TestApp_CreateProject / TestApp_OpenProject_ValidConfig
--- PASS: TestApp_OpenProject_MalformedConfig (degraded mode)
--- PASS: TestApp_OpenProject_NoFluxYaml
--- PASS: TestApp_OpenFolderAsProject / TestApp_CloseProject
--- PASS: TestApp_RecentProjects / TestApp_CreateProject_WithSeed
--- PASS: TestApp_ListExperiments_NoProject / TestApp_ListExperiments_WithProject
--- PASS: TestApp_CreateExperiment_ScopesAutomatically
--- PASS: TestApp_ClaimExperimentToCurrentProject / TestApp_ListUnscopedExperiments
--- PASS: TestApp_NilProjectStore
```

### Frontend
```
npx jest --runInBand
Test Suites: 33 passed, 33 total
Tests:       331 passed, 331 total
```

## Implementation Summary
12 tasks implemented in TDD style across 20+ files:
1. Database migration (`005_projects.sql`)
2. YAML dependency (`gopkg.in/yaml.v3`)
3. Canonical path helpers + project store (`internal/project/`)
4. Config parsing with parse/validate separation
5. Experiment store scoping + claim flow
6. Scaffold preview + safe apply with embedded templates
7. Canonical local state with atomic writes
8. App session + project lifecycle API
9. Project-aware experiment APIs
10. Wails bindings + frontend wiring
11. End-to-end integration tests
12. TDD documentation
