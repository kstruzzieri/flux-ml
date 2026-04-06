# Project Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the Flux project model end-to-end: `flux.yaml`, project registration, canonical-path local state, project-scoped experiments, safe scaffold/import flows, active-project app session state, and minimal frontend wiring so the current app actually behaves differently when a project is open.

**Spec Reference:** `docs/superpowers/specs/2026-04-04-test-mock-project-system-design.md` — Section 1 (Project Model) + Section 2 (Demo Project & Scaffold, v1 scope only)

## Architecture

- `internal/project` owns:
  - Canonical path handling
  - SQLite-backed project store
  - `flux.yaml` read/parse/validate/write helpers
  - Import helper for generating a minimal `flux.yaml` in an existing folder
  - Scaffold preview/apply logic
  - Machine-local state (`recent-projects.json`, `project-state.json`)
- The `experiments` table gains nullable `project_id`.
- The `App` struct gains:
  - `projects *project.Store`
  - `localState *project.LocalState`
  - `currentProject *project.Project`
  - `currentProjectConfig *project.FluxConfig`
  - `currentProjectConfigError string`
  - `currentProjectWarnings []string`
- The existing zero-arg Wails methods remain the primary integration surface:
  - `ListExperiments()` becomes active-project aware
  - `CreateExperiment()` becomes active-project aware
- New project Wails methods manage lifecycle:
  - `CreateProject`
  - `OpenProject`
  - `OpenFolderAsProject`
  - `CloseProject`
  - `GetCurrentProject`
  - `GetCurrentProjectStatus`
  - `ListRecentProjects`
- Unscoped experiments are explicit:
  - `ListUnscopedExperiments`
  - `ClaimExperimentToProject` or `ClaimExperimentToCurrentProject`
- Startup seeding is no longer unconditional. Seed/demo experiments are created only from project creation/import flows when explicitly requested.

## Readiness Corrections

This plan intentionally fixes the gaps identified in review:

- Keep the existing experiment APIs as the default app path. Do not ship project scoping behind sidecar APIs the current UI never calls.
- Canonicalize every project path before DB writes, recent-project writes, or per-project local-state lookups.
- Support both required open flows:
  - Existing valid `flux.yaml`
  - Existing folder without `flux.yaml` via import/write-minimal-config
- Support degraded open for malformed `flux.yaml`:
  - The project still opens
  - Config-dependent features are disabled
  - The parse error is surfaced to the frontend
- Scaffold safely:
  - Embed dotfiles correctly
  - Create the documented blank-project directories
  - Refuse conflicting overwrites by default
  - Expose a preview/manifest before writing
- Define project delete semantics explicitly for v1:
  - Deleting a project with scoped experiments returns a clear error
  - No silent reassignment in v1
- Update the full integration surface:
  - `app_api_test.go`
  - `frontend/wailsjs/...`
  - `frontend/src/__mocks__/wailsjs/...`
  - frontend store/component tests

## Definition Of Done

- Opening a project changes the behavior of the current app, not just the DB.
- Creating an experiment while a project is open stores `project_id`.
- `ListExperiments()` returns only the active project's experiments when a project is open, and all experiments when no project is open.
- Existing unscoped experiments remain visible through an explicit unscoped list/claim flow.
- `Open Existing Folder` works for a folder with no `flux.yaml`.
- A malformed `flux.yaml` opens in degraded mode with a parse error available to the frontend.
- Local state is keyed by canonical path and written atomically.
- Scaffolded projects include `.gitignore`, `src/`, `configs/`, and `data/` for the blank template.
- Generated Wails bindings, mocks, and tests are updated.

---

## File Structure

### New Files

```text
internal/project/
  path.go                  — Canonical project path helper(s)
  path_test.go             — Canonical path tests
  store.go                 — Project CRUD + delete guard rails
  store_test.go            — Store tests
  config.go                — Read/parse/validate/write helpers for flux.yaml
  config_test.go           — Config tests
  scaffold.go              — Scaffold preview/apply from embedded templates
  scaffold_test.go         — Scaffold tests
  localstate.go            — Recent projects + per-project state (canonical path keyed)
  localstate_test.go       — Local state tests
  templates/
    blank/
      flux.yaml
      .gitignore
      src/.gitkeep
      configs/.gitkeep
      data/.gitkeep
    reward-model/
      flux.yaml
      .gitignore
      configs/base.yaml
      src/train.py
      data/.gitkeep
      checkpoints/.gitkeep

project_api.go             — Wails-bound project lifecycle methods
frontend/src/stores/projectStore.ts
frontend/src/__tests__/stores/projectStore.test.ts
internal/project/integration_test.go
docs/tdd/034-project-model.md

internal/database/migrations/
  005_projects.sql
```

### Modified Files

```text
app.go
app_api_test.go
experiment_api.go
internal/database/migrate_test.go
internal/experiment/store.go
internal/experiment/store_test.go
internal/experiment/seed.go
frontend/src/stores/experimentStore.ts
frontend/src/components/layout/panels/FilesPanel.tsx
frontend/src/components/layout/panels/ExperimentsPanel.tsx
frontend/src/__tests__/stores/experimentStore.test.ts
frontend/wailsjs/go/main/App.js
frontend/wailsjs/go/main/App.d.ts
frontend/wailsjs/go/models.ts
frontend/src/__mocks__/wailsjs/go/main/App.ts
frontend/src/__mocks__/wailsjs/go/models.ts
go.mod
go.sum
```

---

## Task 1: Database Migration — `005_projects.sql`

**Files:**
- Create: `internal/database/migrations/005_projects.sql`
- Modify: `internal/database/migrate_test.go`

- [ ] **Step 1: Add migration-specific coverage**

Add a new test that verifies:

- `projects` table exists
- `experiments.project_id` exists and is nullable
- `idx_experiments_project` exists

- [ ] **Step 2: Update existing migration expectations**

Update the current hardcoded migration-version assertions in `internal/database/migrate_test.go`:

- Expected versions now include `005_projects`
- Expected migration count changes from `4` to `5`

This is required because the current suite hardcodes the pre-project migration list.

- [ ] **Step 3: Write the migration**

Create `internal/database/migrations/005_projects.sql`:

```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

ALTER TABLE experiments ADD COLUMN project_id TEXT REFERENCES projects(id);
CREATE INDEX idx_experiments_project ON experiments(project_id);
```

- [ ] **Step 4: Verify migration behavior**

Run:

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/database/ -v
```

Expected:

- New migration test passes
- Existing migration version/count tests pass

- [ ] **Step 5: Commit**

```bash
git add internal/database/migrations/005_projects.sql internal/database/migrate_test.go
git commit -m "feat(db): add projects migration and experiment project_id"
```

---

## Task 2: Add YAML Dependency

**Files:**
- Modify: `go.mod`
- Modify: `go.sum`

- [ ] **Step 1: Add the direct module requirement**

Add `gopkg.in/yaml.v3` as a direct dependency in `go.mod`.

- [ ] **Step 2: Tidy**

Run:

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go mod tidy
```

- [ ] **Step 3: Commit**

```bash
git add go.mod go.sum
git commit -m "chore: add yaml dependency for flux project config"
```

---

## Task 3: Project Paths + Store

**Files:**
- Create: `internal/project/path.go`
- Create: `internal/project/path_test.go`
- Create: `internal/project/store.go`
- Create: `internal/project/store_test.go`

**v1 Rules:**

- Project identity is keyed by canonical path.
- Canonicalization happens before:
  - `projects` table writes
  - `projects` table lookups by path
  - recent-project writes
  - per-project local-state writes
- `Delete` succeeds only when no experiments reference the project.

- [ ] **Step 1: Add canonical path helper**

Implement a helper along these lines:

```go
func CanonicalProjectPath(path string) (string, error)
```

Expected behavior:

- Reject empty path
- Convert to absolute path
- Normalize separators/clean path
- Resolve symlinks when possible
- If `EvalSymlinks` fails because the path does not yet exist, fall back to the cleaned absolute path

- [ ] **Step 2: Add store tests**

Cover at minimum:

- `Create` success
- Empty name/path rejected
- Duplicate path rejected after canonicalization
- `GetByPath` canonicalizes lookup input
- `List` returns empty slice when no rows
- `Delete` succeeds for empty project
- `Delete` returns clear error when project has scoped experiments

- [ ] **Step 3: Implement store**

Implement:

- `NewStore`
- `Create`
- `GetByID`
- `GetByPath`
- `List`
- `Delete`

Implementation notes:

- `Create` canonicalizes `path` before insert
- `GetByPath` canonicalizes lookup input
- `Delete` checks `SELECT COUNT(*) FROM experiments WHERE project_id = ?`
- If count > 0, return a product-level error such as:
  - `cannot delete project with scoped experiments`

- [ ] **Step 4: Verify**

Run:

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -run "TestCanonicalProjectPath|TestCreate|TestGetBy|TestList|TestDelete" -v
```

- [ ] **Step 5: Commit**

```bash
git add internal/project/path.go internal/project/path_test.go internal/project/store.go internal/project/store_test.go
git commit -m "feat(project): add canonical path helpers and guarded project store"
```

---

## Task 4: `flux.yaml` Parsing + Import Helpers

**Files:**
- Create: `internal/project/config.go`
- Create: `internal/project/config_test.go`

**Design correction:** parsing and validation must be separable so malformed configs can still open in degraded mode.

- [ ] **Step 1: Add config tests**

Cover at minimum:

- `ReadConfigFile` / file load success
- `ParseConfig` valid YAML
- `ParseConfig` invalid YAML
- Missing `version` defaults to `1`
- Missing `name` fails validation
- `WriteConfig` round trip
- `IsProject` checks file presence only
- `BuildMinimalConfig` for import-existing-folder flow

- [ ] **Step 2: Implement config helpers**

Implement helpers along these lines:

```go
type FluxConfig struct { ... }

func IsProject(dir string) bool
func ReadConfigFile(dir string) ([]byte, error)
func ParseConfig(data []byte) (*FluxConfig, []string, error)
func ValidateConfig(cfg *FluxConfig) []string
func LoadConfig(dir string) (*FluxConfig, []string, error)
func WriteConfig(dir string, cfg *FluxConfig) error
func BuildMinimalConfig(projectName string) *FluxConfig
```

Required behavior:

- `IsProject` checks for `flux.yaml` existence only
- `ParseConfig` reports YAML parse errors
- `ValidateConfig` reports semantic problems such as missing name
- Missing `version` defaults to `1`
- Unknown future version becomes a warning, not a hard failure
- `BuildMinimalConfig` creates the v1 import config:
  - `version`
  - `name`
  - conservative `ignore`
  - `defaults` only when obvious, otherwise omitted

- [ ] **Step 3: Verify**

Run:

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -run "TestReadConfig|TestParseConfig|TestLoadConfig|TestWriteConfig|TestIsProject|TestBuildMinimalConfig" -v
```

- [ ] **Step 4: Commit**

```bash
git add internal/project/config.go internal/project/config_test.go
git commit -m "feat(project): add config parsing, validation, and import helpers"
```

---

## Task 5: Experiment Store Scoping + Claim Flow

**Files:**
- Modify: `internal/experiment/store.go`
- Modify: `internal/experiment/store_test.go`

**v1 Rules:**

- `List()` remains global and unchanged in meaning.
- `ListByProject(projectID)` returns only scoped experiments for that project.
- Unscoped experiments do not appear in project views by default.
- There is an explicit claim flow for moving unscoped experiments into a project.

- [ ] **Step 1: Add store tests**

Cover:

- `ProjectID` on experiment model
- `CreateWithProject`
- `ListByProject`
- `ListUnscoped`
- `ClaimExperimentToProject`
- Regular `List()` still returns all experiments

- [ ] **Step 2: Update experiment model and queries**

Add:

```go
ProjectID *string `json:"projectId"`
```

Implement:

- `CreateWithProject(name, config, projectID string)`
- `ListByProject(projectID string)`
- `ListUnscoped()`
- `ClaimExperimentToProject(experimentID, projectID string)`

Implementation notes:

- `Create()` still inserts `NULL project_id`
- `ClaimExperimentToProject` updates only unscoped rows
- Returning a clear error for already-scoped experiments is preferable to silent reassignment in v1

- [ ] **Step 3: Update explicit seeding API**

Modify `internal/experiment/seed.go` so demo/starter experiments can be created:

- unscoped when no project is active
- scoped when a project is active

Do not keep unconditional startup seeding. That is moved into app/project flows later in this plan.

- [ ] **Step 4: Verify**

Run:

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/experiment/ -v
```

- [ ] **Step 5: Commit**

```bash
git add internal/experiment/store.go internal/experiment/store_test.go internal/experiment/seed.go
git commit -m "feat(experiment): add project scoping, unscoped listing, and claim flow"
```

---

## Task 6: Scaffold Preview + Safe Apply

**Files:**
- Create: `internal/project/scaffold.go`
- Create: `internal/project/scaffold_test.go`
- Create: `internal/project/templates/...`

**Design correction:** scaffold must be safe and must embed dotfiles correctly.

- [ ] **Step 1: Create template files**

Blank template must include:

- `flux.yaml`
- `.gitignore`
- `src/.gitkeep`
- `configs/.gitkeep`
- `data/.gitkeep`

Reward-model template must include:

- `flux.yaml`
- `.gitignore`
- `configs/base.yaml`
- `src/train.py`
- `data/.gitkeep`
- `checkpoints/.gitkeep`

- [ ] **Step 2: Add scaffold tests**

Cover:

- `PlanScaffold` or equivalent preview returns the expected create operations
- Blank scaffold creates `src/`, `configs/`, `data/`
- Reward-model scaffold creates expected files and directories
- `.gitignore` is present after scaffolding
- Unknown template fails
- Conflicting writes in a non-empty target directory fail by default

- [ ] **Step 3: Implement scaffold preview + apply**

Implement along these lines:

```go
type ScaffoldOp struct {
    Path   string
    Action string // create, overwrite, skip, mkdir
}

func PlanScaffold(dir, projectName, template string) ([]ScaffoldOp, error)
func Scaffold(dir, projectName, template string) error
```

Implementation notes:

- Use:

```go
//go:embed all:templates
```

This is required so `.gitignore` files are actually embedded.

- `Scaffold` should:
  - create the target directory if needed
  - refuse conflicting overwrites by default
  - substitute `{{.Name}}` in template `flux.yaml`

- [ ] **Step 4: Verify**

Run:

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -run "TestPlanScaffold|TestScaffold" -v
```

- [ ] **Step 5: Commit**

```bash
git add internal/project/scaffold.go internal/project/scaffold_test.go internal/project/templates/
git commit -m "feat(project): add safe scaffold preview and template application"
```

---

## Task 7: Canonical Local State + Atomic Writes

**Files:**
- Create: `internal/project/localstate.go`
- Create: `internal/project/localstate_test.go`

**v1 Rules:**

- Recent-project entries are deduped by canonical path.
- Per-project state is keyed by canonical path.
- JSON writes are atomic.
- Corrupt JSON is surfaced as an error, not silently discarded.

- [ ] **Step 1: Add local state tests**

Cover:

- `RecentProjects` round trip
- Duplicate path moves to top after canonicalization
- Max entries
- `GetProjectState` / `SetProjectState` round trip
- Corrupt JSON returns an error

- [ ] **Step 2: Implement local state**

Implement:

- `NewLocalState`
- `RecentProjects`
- `AddRecentProject`
- `GetProjectState`
- `SetProjectState`

Implementation notes:

- Canonicalize incoming `projectPath`
- Use temp file + rename for writes
- Do not swallow parse errors and continue with empty state

- [ ] **Step 3: Verify**

Run:

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -run "TestRecentProjects|TestProjectState" -v
```

- [ ] **Step 4: Commit**

```bash
git add internal/project/localstate.go internal/project/localstate_test.go
git commit -m "feat(project): add canonical local state with atomic writes"
```

---

## Task 8: App Session + Project Lifecycle API

**Files:**
- Modify: `app.go`
- Create: `project_api.go`
- Modify: `app_api_test.go`

**Design correction:** project mode must become actual app state.

- [ ] **Step 1: Add current-project fields to `App`**

Add:

```go
projects                  *project.Store
localState                *project.LocalState
currentProject            *project.Project
currentProjectConfig      *project.FluxConfig
currentProjectConfigError string
currentProjectWarnings    []string
configDir                 string
```

- [ ] **Step 2: Stop unconditional startup seeding**

Remove the unconditional demo seeding from `startup()`.

Replace it with explicit seeding only when:

- `CreateProject(..., seedDemo=true)`
- `OpenFolderAsProject(..., seedDemo=true)`

- [ ] **Step 3: Add project lifecycle methods**

Add Wails-bound methods in `project_api.go`:

- `CreateProject(name, dir, template string, seedDemo bool)`
- `OpenProject(dir string)`
- `OpenFolderAsProject(dir, name string, seedDemo bool)`
- `CloseProject()`
- `GetCurrentProject() (*project.Project, error)`
- `GetCurrentProjectStatus() (CurrentProjectStatus, error)`
- `ListRecentProjects() ([]project.RecentProject, error)`
- `GetProjectConfig(dir string) (*project.FluxConfig, []string, error)`
- `IsFluxProject(dir string) bool`

Suggested status shape:

```go
type CurrentProjectStatus struct {
    Project          *project.Project     `json:"project,omitempty"`
    Config           *project.FluxConfig  `json:"config,omitempty"`
    ConfigError      string               `json:"configError,omitempty"`
    Warnings         []string             `json:"warnings,omitempty"`
    Degraded         bool                 `json:"degraded"`
}
```

- [ ] **Step 4: Define open behavior explicitly**

Required behavior:

- `OpenProject(dir)`:
  - canonicalizes path
  - requires `flux.yaml` to exist
  - parses config
  - if parse succeeds, stores config and warnings
  - if parse fails, still opens in degraded mode:
    - register/find project using directory basename as fallback name
    - set `currentProjectConfigError`
    - leave `currentProjectConfig=nil`
- `OpenFolderAsProject(dir, name, seedDemo)`:
  - canonicalizes path
  - if `flux.yaml` is missing, writes a minimal config
  - registers/opens the project
- `CloseProject()`:
  - clears current-project state
  - emits a close event

- [ ] **Step 5: Emit project events**

Emit:

- `project:created`
- `project:opened`
- `project:imported`
- `project:closed`
- `project:status`

These will be used by the frontend to refetch experiments and update UI state.

- [ ] **Step 6: Add app API tests**

Add tests in `app_api_test.go` for:

- `CreateProject`
- `OpenProject` valid config
- `OpenProject` malformed config opens degraded
- `OpenFolderAsProject`
- `CloseProject`
- recent-project updates
- seed toggle behavior

- [ ] **Step 7: Verify**

Run:

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./... -run "TestApp_|TestProject" -count=1
```

- [ ] **Step 8: Commit**

```bash
git add app.go project_api.go app_api_test.go
git commit -m "feat(project): add app-level project session and lifecycle API"
```

---

## Task 9: Make Existing Experiment APIs Project-Aware

**Files:**
- Modify: `experiment_api.go`
- Modify: `app_api_test.go`

**Design correction:** do not hide project mode behind new experiment methods the current frontend does not call.

- [ ] **Step 1: Update existing methods**

Change behavior:

- `CreateExperiment(name, config string)`:
  - if `currentProject != nil`, call `CreateWithProject`
  - otherwise call `Create`
- `ListExperiments()`:
  - if `currentProject != nil`, call `ListByProject`
  - otherwise call `List`

- [ ] **Step 2: Add explicit unscoped methods**

Add:

- `ListUnscopedExperiments()`
- `ClaimExperimentToProject(experimentID, projectID string)`

Optionally add:

- `ClaimExperimentToCurrentProject(experimentID string)`

- [ ] **Step 3: Add app API tests**

Cover:

- `ListExperiments()` returns all when no project open
- `ListExperiments()` returns only scoped items when project open
- `CreateExperiment()` scopes automatically when project open
- unscoped experiments do not appear in project-scoped list
- claim flow moves an unscoped experiment into the project

- [ ] **Step 4: Verify**

Run:

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./... -run "TestApp_(CreateExperiment|ListExperiments|ClaimExperiment)" -count=1
```

- [ ] **Step 5: Commit**

```bash
git add experiment_api.go app_api_test.go
git commit -m "feat(api): make existing experiment APIs active-project aware"
```

---

## Task 10: Wails Bindings + Frontend Wiring

**Files:**
- Modify: `frontend/wailsjs/go/main/App.js`
- Modify: `frontend/wailsjs/go/main/App.d.ts`
- Modify: `frontend/wailsjs/go/models.ts`
- Modify: `frontend/src/__mocks__/wailsjs/go/main/App.ts`
- Modify: `frontend/src/__mocks__/wailsjs/go/models.ts`
- Create: `frontend/src/stores/projectStore.ts`
- Create: `frontend/src/__tests__/stores/projectStore.test.ts`
- Modify: `frontend/src/stores/experimentStore.ts`
- Modify: `frontend/src/__tests__/stores/experimentStore.test.ts`
- Modify: `frontend/src/components/layout/panels/FilesPanel.tsx`
- Modify: `frontend/src/components/layout/panels/ExperimentsPanel.tsx`

- [ ] **Step 1: Regenerate Wails bindings**

Run:

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && wails generate module
```

Verify the generated bindings include:

- project lifecycle methods
- unscoped/claim methods
- `projectId` on experiment models

- [ ] **Step 2: Update frontend mocks**

Update the Jest Wails mocks to match the new API surface:

- project lifecycle methods
- project-aware experiment behavior
- `projectId` on experiment model

- [ ] **Step 3: Add frontend project state**

Create `frontend/src/stores/projectStore.ts` to manage:

- current project
- degraded/open error state
- recent projects

Minimum responsibilities:

- fetch current-project status on init
- react to project lifecycle events
- expose open/close/import actions to the UI layer

- [ ] **Step 4: Keep experiment store on the existing method**

Update `frontend/src/stores/experimentStore.ts` so it still calls zero-arg `ListExperiments()`, but refetches when:

- `project:opened`
- `project:imported`
- `project:closed`
- `experiment:created`
- `experiment:updated`
- `experiment:deleted`

- [ ] **Step 5: Minimal UI wiring**

Add minimal visible project-mode behavior:

- `FilesPanel` no longer always says `No project`
- `ExperimentsPanel` can show active project context
- degraded project status can be surfaced in a basic error/warning state

This task does **not** implement the full file explorer. It only makes the current shell reflect project mode.

- [ ] **Step 6: Add frontend tests**

Add/adjust tests for:

- project store state transitions
- experiment refetch on project events
- project-aware mock behavior
- minimal FilesPanel/ExperimentsPanel project rendering

- [ ] **Step 7: Verify**

Run:

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npm test -- --runInBand
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npm run typecheck
```

- [ ] **Step 8: Commit**

```bash
git add frontend/wailsjs/ frontend/src/__mocks__/wailsjs/ frontend/src/stores/ frontend/src/components/layout/panels/ frontend/src/__tests__/
git commit -m "feat(frontend): wire project lifecycle and project-aware experiment state"
```

---

## Task 11: End-To-End Integration Coverage

**Files:**
- Create: `internal/project/integration_test.go`
- Modify: `app_api_test.go`

- [ ] **Step 1: Add full workflow integration test**

Cover:

- scaffold a new project
- open it
- create scoped experiments
- verify `ListExperiments()` is scoped when open
- close project and verify `ListExperiments()` is global again
- import an existing folder without `flux.yaml`
- open malformed `flux.yaml` in degraded mode
- list unscoped experiments and claim one into the current project
- verify project delete is blocked when scoped experiments exist
- verify recent-project and per-project local state use canonical path

- [ ] **Step 2: Run Go test suite**

Run:

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./... -count=1
```

- [ ] **Step 3: Commit**

```bash
git add internal/project/integration_test.go app_api_test.go
git commit -m "test(project): add end-to-end coverage for project workflow"
```

---

## Task 12: TDD Documentation

**Files:**
- Create: `docs/tdd/034-project-model.md`

- [ ] **Step 1: Create the TDD document**

Include:

- Issue summary
- Acceptance criteria
- Rationale
- Test summary

Updated acceptance criteria must explicitly include:

- canonical path handling
- degraded open for malformed `flux.yaml`
- import-existing-folder flow
- active-project-aware existing experiment APIs
- explicit unscoped/claim flow
- safe scaffold behavior with dotfiles included
- project delete guard when experiments are still scoped to the project
- Wails binding + frontend mock updates

- [ ] **Step 2: Commit**

```bash
git add docs/tdd/034-project-model.md
git commit -m "docs: add TDD document for project model"
```

---

## High-Value Enhancements

These are not required to land v1 safely, but they are worth capturing now.

### 1. Claim Suggestions For Unscoped Experiments

When listing unscoped experiments, rank likely target projects using:

- config path references
- script path references
- creation time proximity
- git root match

This would make the unscoped bucket materially useful instead of purely manual.

### 2. Stable Project Fingerprint

Add a machine-local fingerprint derived from:

- canonical path
- git root
- repo remote URL when available

This would let local state survive project moves/renames better than a raw path key.

### 3. Scaffold Preview In The UI

Expose `PlanScaffold` in the UI before applying:

- files to create
- files that would conflict
- directories to create

This is a strong safety improvement over blindly writing into the target directory.

---

## Summary

| Task | Description | Key Outcome |
|------|-------------|-------------|
| 1 | DB migration | Adds `projects` table and `experiments.project_id`, updates existing migration tests |
| 2 | YAML dependency | Adds direct YAML module dependency |
| 3 | Paths + store | Canonical-path project identity and guarded delete behavior |
| 4 | Config + import helpers | Parse/validate split, degraded-mode support, minimal-config import |
| 5 | Experiment scoping | Scoped experiments, unscoped list, claim flow, explicit seeding hooks |
| 6 | Scaffold | Safe preview/apply, embedded dotfiles, blank-template directories |
| 7 | Local state | Canonical path keys, atomic writes, recent projects |
| 8 | App project session | Active project lifecycle in `App` + Wails project API |
| 9 | Experiment API update | Existing experiment APIs become project-aware |
| 10 | Frontend + bindings | Generated bindings, mocks, stores, minimal project UI wiring |
| 11 | Integration coverage | End-to-end verification of happy path and edge cases |
| 12 | TDD doc | Updated acceptance criteria and rationale |
