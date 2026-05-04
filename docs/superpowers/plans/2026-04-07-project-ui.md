# Project UI Implementation Plan (Phase A.5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the minimum UI surface to make projects usable — welcome screen, header project switcher, new project wizard, import flow, and degraded mode indicators.

**Architecture:** The AppShell gains a tri-state view mode (`welcome` | `project` | `no-project-compat`) that gates which views are available after `projectStore` hydration completes. A brief bootstrap gate prevents flashing the welcome screen before an already-open project loads. New components live in `frontend/src/components/project/`. Recent-project rows are rendered through a shared `RecentProjectsList` and fed by AppShell-managed per-path UI state so stale-entry behavior stays aligned between the welcome screen and the header switcher. The wizard manages its own local form state via `useReducer` and calls existing backend APIs on submit — it does not write to `projectStore` directly. Two new Go methods (`OpenFolderDialog`, `RemoveRecentProject`) fill backend gaps for Phase A.5.

**Tech Stack:** Go 1.x + Wails v2.11, React 19, TypeScript 5.9, Zustand 5, Jest + @testing-library/react, CSS custom properties (BEM naming)

**Spec:** `docs/superpowers/specs/2026-04-05-project-ui-design.md`

---

## File Structure

### New Files

```
frontend/src/components/project/
├── index.ts                        — barrel exports for project components
├── WelcomeScreen.tsx               — default landing when no project open
├── WelcomeScreen.css               — welcome screen styles
├── RecentProjectsList.tsx          — reusable recent-project list with stale-entry states
├── RecentProjectsList.css          — recent projects list styles
├── ProjectSwitcher.tsx             — header dropdown trigger (pill with status dot)
├── ProjectSwitcher.css             — switcher pill + dropdown styles
├── ProjectSwitcherDropdown.tsx     — dropdown menu content (actions + recent list)
├── NewProjectWizard.tsx            — hybrid stepped modal (shell + step management)
├── NewProjectWizard.css            — wizard modal + step indicator styles
├── WizardStepTemplate.tsx          — step 1: template selection card grid
├── WizardStepDetails.tsx           — step 2: name, location, starter experiments
├── WizardStepReview.tsx            — step 3: final summary + create button
├── WizardSummaryRail.tsx           — sticky cross-step summary sidebar
├── ImportDialog.tsx                — confirmation dialog for folder import
├── ImportDialog.css                — import dialog styles
├── DegradedModeBanner.tsx          — non-blocking warning bar for malformed flux.yaml
├── DegradedModeBanner.css          — degraded banner styles
├── NoProjectBanner.tsx             — banner for compatibility no-project experiments mode
├── NoProjectBanner.css             — no-project banner styles
├── wizardReducer.ts                — useReducer state + actions for wizard form

frontend/src/__tests__/components/project/
├── WelcomeScreen.test.tsx
├── RecentProjectsList.test.tsx
├── ProjectSwitcher.test.tsx
├── NewProjectWizard.test.tsx
├── ImportDialog.test.tsx
├── DegradedModeBanner.test.tsx
├── NoProjectBanner.test.tsx
```

### Modified Files

```
internal/project/localstate.go         — add RemoveRecentProject method
internal/project/localstate_test.go    — add RemoveRecentProject tests
project_api.go                         — add OpenFolderDialog + RemoveRecentProject App methods

frontend/src/__mocks__/wailsjs/go/main/App.ts  — add mock functions for new methods
frontend/src/components/layout/AppShell.tsx     — view mode, projectStore.initialize, project actions
frontend/src/components/layout/Header.tsx       — accept ProjectSwitcher slot, disabled tabs
frontend/src/components/layout/Content.tsx      — welcome screen route, disabled views
frontend/src/components/layout/ActivityBar.tsx  — disabled state for view buttons
frontend/src/hooks/useKeyboardShortcuts.ts      — add Cmd+N/O/Shift+O, gated view shortcuts
frontend/src/stores/projectStore.ts             — add hydrated bootstrap state for shell gating
frontend/src/components/layout/index.ts         — re-export ViewId type (already done)
frontend/src/styles/components/layout.css       — welcome screen grid area, disabled tab styles

frontend/src/__tests__/components/layout/AppShell.test.tsx  — update for view mode
frontend/src/__tests__/components/layout/Header.test.tsx    — update for switcher + disabled tabs
frontend/src/__tests__/components/layout/Content.test.tsx   — update for welcome route
frontend/src/__tests__/navigation.test.tsx                  — update for disabled shortcuts
frontend/src/__tests__/stores/projectStore.test.ts          — add hydration bootstrap coverage
```

---

### Task 1: Backend — RemoveRecentProject

**Files:**
- Modify: `internal/project/localstate.go`
- Modify: `internal/project/localstate_test.go`
- Modify: `project_api.go`

- [ ] **Step 1: Write the failing Go test for LocalState.RemoveRecentProject**

Add to `internal/project/localstate_test.go`:

```go
func TestRemoveRecentProject(t *testing.T) {
	ls := newTestLocalState(t)
	dir1 := t.TempDir()
	dir2 := t.TempDir()

	ls.AddRecentProject(dir1, "project-1")
	ls.AddRecentProject(dir2, "project-2")

	err := ls.RemoveRecentProject(dir1)
	if err != nil {
		t.Fatalf("RemoveRecentProject failed: %v", err)
	}

	recents, _ := ls.RecentProjects()
	if len(recents) != 1 {
		t.Fatalf("expected 1 recent project after removal, got %d", len(recents))
	}
	canonical2, _ := CanonicalProjectPath(dir2)
	if recents[0].Path != canonical2 {
		t.Errorf("remaining project = %q, want %q", recents[0].Path, canonical2)
	}
}

func TestRemoveRecentProject_NotFound(t *testing.T) {
	ls := newTestLocalState(t)
	dir := t.TempDir()
	ls.AddRecentProject(dir, "project")

	// Remove a path that doesn't exist in recents — should succeed silently
	err := ls.RemoveRecentProject(t.TempDir())
	if err != nil {
		t.Fatalf("RemoveRecentProject for non-existent entry should not error: %v", err)
	}

	recents, _ := ls.RecentProjects()
	if len(recents) != 1 {
		t.Errorf("expected 1 (unchanged), got %d", len(recents))
	}
}

func TestRemoveRecentProject_Canonicalizes(t *testing.T) {
	ls := newTestLocalState(t)
	dir := t.TempDir()
	ls.AddRecentProject(dir, "project")

	// Remove using trailing-slash variant
	err := ls.RemoveRecentProject(dir + "/")
	if err != nil {
		t.Fatalf("RemoveRecentProject failed: %v", err)
	}

	recents, _ := ls.RecentProjects()
	if len(recents) != 0 {
		t.Errorf("expected 0 after removal via trailing-slash path, got %d", len(recents))
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -run TestRemoveRecentProject -v`

Expected: FAIL — `ls.RemoveRecentProject undefined`

- [ ] **Step 3: Implement RemoveRecentProject on LocalState**

Add to `internal/project/localstate.go`, after the `AddRecentProject` method:

```go
// RemoveRecentProject removes a project from the recent list by path.
// The path is canonicalized before matching. No error if not found.
func (ls *LocalState) RemoveRecentProject(projectPath string) error {
	canonical, err := CanonicalProjectPath(projectPath)
	if err != nil {
		return fmt.Errorf("canonicalizing path: %w", err)
	}

	recents, err := ls.RecentProjects()
	if err != nil {
		return err
	}

	filtered := make([]RecentProject, 0, len(recents))
	for _, r := range recents {
		if r.Path != canonical {
			filtered = append(filtered, r)
		}
	}

	return ls.writeJSON("recent-projects.json", filtered)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./internal/project/ -run TestRemoveRecentProject -v`

Expected: PASS (all 3 tests)

- [ ] **Step 5: Add App.RemoveRecentProject in project_api.go**

Add to `project_api.go`, after the `ListRecentProjects` method:

```go
// RemoveRecentProject removes a stale entry from the recent-projects list.
func (a *App) RemoveRecentProject(dir string) error {
	if a.localState == nil {
		return fmt.Errorf("local state not initialized")
	}
	return a.localState.RemoveRecentProject(dir)
}
```

- [ ] **Step 6: Run full project test suite**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./... -count=1`

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add internal/project/localstate.go internal/project/localstate_test.go project_api.go
git commit -m "feat(project): add RemoveRecentProject for stale entry cleanup (#A.5)"
```

---

### Task 2: Backend — OpenFolderDialog

**Files:**
- Modify: `project_api.go`

- [ ] **Step 1: Add OpenFolderDialog to App**

Add to `project_api.go`, after the `RemoveRecentProject` method:

```go
// OpenFolderDialog opens the native OS directory picker and returns the selected path.
// Returns an empty string if the user cancels.
func (a *App) OpenFolderDialog() (string, error) {
	if a.ctx == nil {
		return "", fmt.Errorf("application context not initialized")
	}
	return wailsRuntime.OpenDirectoryDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "Select Folder",
	})
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go build ./...`

Expected: BUILD SUCCESS (no errors)

Note: `OpenFolderDialog` wraps a Wails runtime call that requires a running Wails context, so it cannot be unit-tested without the full Wails runtime. The frontend integration tests will cover the flow.

- [ ] **Step 3: Commit**

```bash
git add project_api.go
git commit -m "feat(project): add OpenFolderDialog for native directory picker (#A.5)"
```

---

### Task 3: Frontend Mock Updates

**Files:**
- Modify: `frontend/src/__mocks__/wailsjs/go/main/App.ts`

- [ ] **Step 1: Add mock functions for new backend methods**

Add to `frontend/src/__mocks__/wailsjs/go/main/App.ts`, in the `// --- Project API ---` section, after the `IsFluxProject` function:

```typescript
// --- New Phase A.5 methods ---

let mockOpenFolderDialogResult: string = ''
let mockOpenFolderDialogError: Error | null = null
let mockIsFluxProjectResult: boolean = false
let mockRemoveRecentProjectError: Error | null = null
let mockCreateProjectError: Error | null = null
let mockOpenProjectError: Error | null = null
let mockOpenFolderAsProjectError: Error | null = null

export function OpenFolderDialog(): Promise<string> {
  if (mockOpenFolderDialogError) return Promise.reject(mockOpenFolderDialogError)
  return Promise.resolve(mockOpenFolderDialogResult)
}

export function RemoveRecentProject(dir: string): Promise<void> {
  if (mockRemoveRecentProjectError) return Promise.reject(mockRemoveRecentProjectError)
  mockRecentProjects = mockRecentProjects.filter((r) => r.path !== dir)
  return Promise.resolve()
}
```

Also update the existing `IsFluxProject` to use the controllable mock:

```typescript
export function IsFluxProject(_dir: string): Promise<boolean> {
  return Promise.resolve(mockIsFluxProjectResult)
}
```

Also make the existing project lifecycle mocks controllable for failure-path tests:

```typescript
export function CreateProject(
  name: string,
  dir: string,
  template: string,
  seedDemo: boolean,
): Promise<project.Project> {
  if (mockCreateProjectError) return Promise.reject(mockCreateProjectError)
  // ... existing mock implementation ...
}

export function OpenProject(dir: string): Promise<project.Project> {
  if (mockOpenProjectError) return Promise.reject(mockOpenProjectError)
  // ... existing mock implementation ...
}

export function OpenFolderAsProject(
  dir: string,
  name: string,
  seedDemo: boolean,
): Promise<project.Project> {
  if (mockOpenFolderAsProjectError) return Promise.reject(mockOpenFolderAsProjectError)
  // ... existing mock implementation ...
}
```

Add these test helpers to the `// --- Test helpers ---` section:

```typescript
export function __setOpenFolderDialogResult(result: string, error?: Error): void {
  mockOpenFolderDialogResult = result
  mockOpenFolderDialogError = error ?? null
}

export function __setIsFluxProjectResult(result: boolean): void {
  mockIsFluxProjectResult = result
}

export function __setRemoveRecentProjectError(error: Error | null): void {
  mockRemoveRecentProjectError = error
}

export function __setCreateProjectError(error: Error | null): void {
  mockCreateProjectError = error
}

export function __setOpenProjectError(error: Error | null): void {
  mockOpenProjectError = error
}

export function __setOpenFolderAsProjectError(error: Error | null): void {
  mockOpenFolderAsProjectError = error
}
```

Update `__resetMockState` to also reset the new fields:

```typescript
// Add inside __resetMockState():
  mockOpenFolderDialogResult = ''
  mockOpenFolderDialogError = null
  mockIsFluxProjectResult = false
  mockRemoveRecentProjectError = null
  mockCreateProjectError = null
  mockOpenProjectError = null
  mockOpenFolderAsProjectError = null
```

- [ ] **Step 2: Run existing tests to verify mocks don't break anything**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest --no-cache 2>&1 | tail -20`

Expected: All existing tests still PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml
git add frontend/src/__mocks__/wailsjs/go/main/App.ts
git commit -m "test: add frontend mocks for OpenFolderDialog and RemoveRecentProject (#A.5)"
```

---

### Task 4: AppShell View Mode + Project Initialization

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx`
- Modify: `frontend/src/components/layout/Content.tsx`
- Modify: `frontend/src/components/layout/Header.tsx`
- Modify: `frontend/src/components/layout/ActivityBar.tsx`
- Modify: `frontend/src/stores/projectStore.ts`
- Modify: `frontend/src/__tests__/stores/projectStore.test.ts`
- Create: `frontend/src/__tests__/components/project/AppShellViewMode.test.tsx`

This task adds the tri-state view mode to AppShell and wires projectStore initialization into the shell lifecycle. It also adds a `hydrated` bootstrap flag so the shell does not briefly render the welcome state before an already-open project loads. It renders a placeholder `<div data-testid="welcome-screen">` for the welcome state — the real WelcomeScreen component comes in Task 5.

- [ ] **Step 1: Write the failing test for AppShell view mode**

Create `frontend/src/__tests__/components/project/AppShellViewMode.test.tsx`:

```tsx
import { render, screen, waitFor, act } from '@testing-library/react'
import { AppShell } from '@components/layout'
import {
  __resetMockState,
  __setCurrentProjectStatus,
} from '../../../__mocks__/wailsjs/go/main/App'
import { __resetListeners } from '../../../__mocks__/wailsjs/runtime/runtime'
import { useProjectStore, __resetProjectStoreInitialized } from '@stores/projectStore'
import { project } from '../../../__mocks__/wailsjs/go/models'

// Mock Wails bindings
jest.mock('../../../../wailsjs/go/main/App')
jest.mock('../../../../wailsjs/runtime/runtime')

beforeEach(() => {
  __resetMockState()
  __resetListeners()
  __resetProjectStoreInitialized()
})

describe('AppShell view mode', () => {
  it('shows welcome screen when no project is open', async () => {
    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })
  })

  it('shows experiments view when project is open', async () => {
    const proj = new project.Project({
      id: 'p1',
      name: 'test-proj',
      path: '/tmp/test',
      createdAt: 1000,
      updatedAt: 1000,
    })
    __setCurrentProjectStatus({ project: proj })

    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByTestId('experiments-view')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('welcome-screen')).not.toBeInTheDocument()
  })

  it('disables nav tabs when in welcome mode', async () => {
    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })

    const nav = screen.getByRole('navigation', { name: /workspace navigation/i })
    const tabs = nav.querySelectorAll('button')
    tabs.forEach((tab) => {
      expect(tab).toBeDisabled()
    })
  })

  it('disables activity bar view buttons when in welcome mode', async () => {
    render(<AppShell />)

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })

    expect(screen.getByTestId('activity-experiments')).toBeDisabled()
    expect(screen.getByTestId('activity-compare')).toBeDisabled()
  })

  it('initializes projectStore on mount', async () => {
    render(<AppShell />)

    // projectStore.initialize() should have been called,
    // triggering fetchStatus and fetchRecentProjects
    await waitFor(() => {
      // Store is loaded (loading becomes false)
      expect(useProjectStore.getState().loading).toBe(false)
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/AppShellViewMode -v`

Expected: FAIL — welcome-screen testid not found, tabs not disabled

- [ ] **Step 3: Add `appMode` type and update Header to accept disabled state**

Update `frontend/src/components/layout/Header.tsx`:

Add a `disabledViews` prop:

```tsx
// Update the HeaderProps interface:
interface HeaderProps {
  version?: string
  activeView?: ViewId
  onViewChange?: (view: ViewId) => void
  runningCount?: number
  alertCount?: number
  onCommandPalette?: () => void
  disabledViews?: Set<ViewId>
  projectSwitcher?: React.ReactNode
}
```

Update the `Header` function signature and nav button rendering:

```tsx
export function Header({
  version,
  activeView = 'experiments',
  onViewChange,
  runningCount = 0,
  alertCount = 0,
  onCommandPalette,
  disabledViews,
  projectSwitcher,
}: HeaderProps) {
```

Update the nav items mapping to apply disabled state:

```tsx
<nav className="titlebar__nav" aria-label="Workspace navigation">
  {NAV_ITEMS.map((item) => {
    const isDisabled = disabledViews?.has(item.id) ?? false
    return (
      <button
        key={item.id}
        className={`titlebar__tab ${item.id === activeView ? 'titlebar__tab--active' : ''} ${isDisabled ? 'titlebar__tab--disabled' : ''}`}
        aria-current={item.id === activeView ? 'page' : undefined}
        disabled={isDisabled}
        onClick={() => onViewChange?.(item.id)}
      >
        <span className="titlebar__tab-icon">{item.icon}</span>
        {item.label}
      </button>
    )
  })}
</nav>
```

Add the projectSwitcher slot in `titlebar__left`, after the title:

```tsx
<div className="titlebar__left">
  <FluxIcon />
  <span className="titlebar__title">Flux</span>
  {projectSwitcher}
</div>
```

- [ ] **Step 4: Update ActivityBar to accept disabled state**

Update `frontend/src/components/layout/ActivityBar.tsx`:

```tsx
interface ActivityBarProps {
  activeItem?: ViewId
  onItemClick?: (id: ViewId) => void
  disabledItems?: Set<ViewId>
}

export function ActivityBar({
  activeItem = 'experiments',
  onItemClick,
  disabledItems,
}: ActivityBarProps) {
  return (
    <aside className="activity-bar" role="navigation" aria-label="Activity bar">
      {ACTIVITY_ITEMS.map((item) => {
        const isDisabled = disabledItems?.has(item.id) ?? false
        return (
          <button
            key={item.id}
            className={`activity-bar__btn ${item.id === activeItem ? 'activity-bar__btn--active' : ''}`}
            title={item.label}
            aria-label={item.label}
            aria-current={item.id === activeItem ? 'page' : undefined}
            data-testid={`activity-${item.id}`}
            disabled={isDisabled}
            onClick={() => onItemClick?.(item.id)}
          >
            {item.icon}
          </button>
        )
      })}
      {/* ... rest unchanged ... */}
```

- [ ] **Step 5: Update Content to support welcome mode**

Update `frontend/src/components/layout/Content.tsx`:

```tsx
import { ViewId } from './Header'
import { ExperimentsView, CompareView, DataView, CodeView } from '../views'
import { LayoutPersistence } from '../../hooks/useLayoutPersistence'

export type AppMode = 'welcome' | 'project' | 'no-project-compat'

interface ContentProps {
  activeView: ViewId
  layout: LayoutPersistence
  appMode: AppMode
}

export function Content({ activeView, layout, appMode }: ContentProps) {
  if (appMode === 'welcome') {
    return (
      <div className="content content--welcome" data-testid="welcome-screen">
        {/* WelcomeScreen component will replace this in Task 5 */}
      </div>
    )
  }

  switch (activeView) {
    case 'experiments':
      return <ExperimentsView layout={layout} />
    case 'compare':
      return <CompareView layout={layout} />
    case 'data':
      return <DataView layout={layout} />
    case 'code':
      return <CodeView layout={layout} />
    default:
      return <ExperimentsView layout={layout} />
  }
}
```

- [ ] **Step 6: Update projectStore and AppShell with bootstrap-safe view mode logic**

Update `frontend/src/stores/projectStore.ts` first:

- Add `hydrated: boolean` to `ProjectState` and to the reset/default state.
- Change `initialize` to return `Promise<void>` so the first hydration pass can be awaited.
- Set `hydrated: true` in both the success and error paths of `fetchStatus()`.
- Have `initialize()` await the initial `fetchStatus()` and `fetchRecentProjects()` calls before returning.

Then update `frontend/src/components/layout/AppShell.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Header, ViewId } from './Header'
import { ActivityBar } from './ActivityBar'
import { Content, AppMode } from './Content'
import { GetAppInfo } from '../../../wailsjs/go/main/App'
import { useKeyboardShortcuts, useLayoutPersistence } from '../../hooks'
import { useProjectStore } from '../../stores/projectStore'

interface AppInfo {
  name: string
  version: string
}

const ALL_VIEWS: ViewId[] = ['experiments', 'compare', 'data', 'code']
const NO_PROJECT_VIEWS: ViewId[] = ['compare', 'data', 'code']

export function AppShell() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [activeView, setActiveView] = useState<ViewId>('experiments')
  const [compatMode, setCompatMode] = useState(false)
  const layout = useLayoutPersistence()

  const currentProject = useProjectStore((s) => s.currentProject)
  const hydrated = useProjectStore((s) => s.hydrated)
  const initialize = useProjectStore((s) => s.initialize)

  // TODO: These will be driven by actual experiment state
  const [runningCount] = useState(0)
  const [alertCount] = useState(0)

  // Initialize project store on mount
  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    GetAppInfo()
      .then((info) => setAppInfo(info as AppInfo))
      .catch((err) => console.error('Failed to get app info:', err))
  }, [])

  if (!hydrated) {
    return <div className="app-shell" data-testid="app-bootstrap" />
  }

  // Derive app mode from project state after hydration
  const appMode: AppMode = useMemo(() => {
    if (currentProject) return 'project'
    if (compatMode) return 'no-project-compat'
    return 'welcome'
  }, [currentProject, compatMode])

  // Compute disabled views based on app mode
  const disabledViews = useMemo(() => {
    if (appMode === 'welcome') return new Set<ViewId>(ALL_VIEWS)
    if (appMode === 'no-project-compat') return new Set<ViewId>(NO_PROJECT_VIEWS)
    return new Set<ViewId>()
  }, [appMode])

  // Reset to experiments when project opens or compat mode changes
  useEffect(() => {
    if (appMode === 'project' || appMode === 'no-project-compat') {
      setActiveView('experiments')
    }
  }, [appMode])

  // Exit compat mode when a project opens
  useEffect(() => {
    if (currentProject) {
      setCompatMode(false)
    }
  }, [currentProject])

  const handleViewChange = useCallback(
    (view: ViewId) => {
      if (!disabledViews.has(view)) {
        setActiveView(view)
      }
    },
    [disabledViews],
  )

  const handleCommandPalette = useCallback(() => {
    console.log('Command palette triggered')
  }, [])

  const handleEnterCompatMode = useCallback(() => {
    setCompatMode(true)
  }, [])

  useKeyboardShortcuts({
    onViewChange: handleViewChange,
    onCommandPalette: handleCommandPalette,
    disabledViews,
  })

  return (
    <div className="app-shell">
      <Header
        version={appInfo?.version}
        activeView={activeView}
        onViewChange={handleViewChange}
        runningCount={runningCount}
        alertCount={alertCount}
        onCommandPalette={handleCommandPalette}
        disabledViews={disabledViews}
      />
      <ActivityBar
        activeItem={activeView}
        onItemClick={handleViewChange}
        disabledItems={disabledViews}
      />
      <Content activeView={activeView} layout={layout} appMode={appMode} />
    </div>
  )
}
```

- [ ] **Step 7: Update useKeyboardShortcuts to accept disabledViews**

Update `frontend/src/hooks/useKeyboardShortcuts.ts`:

```tsx
import { useEffect } from 'react'
import type { ViewId } from '../components/layout/Header'

const VIEW_SHORTCUTS: Record<string, ViewId> = {
  '1': 'experiments',
  '2': 'compare',
  '3': 'data',
  '4': 'code',
}

interface UseKeyboardShortcutsOptions {
  onViewChange?: (view: ViewId) => void
  onCommandPalette?: () => void
  disabledViews?: Set<ViewId>
  onNewProject?: () => void
  onOpenFolder?: () => void
  onOpenExisting?: () => void
}

export function useKeyboardShortcuts({
  onViewChange,
  onCommandPalette,
  disabledViews,
  onNewProject,
  onOpenFolder,
  onOpenExisting,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isMod = event.metaKey || event.ctrlKey

      if (!isMod) return

      // View switching: Cmd/Ctrl + 1-4
      if (event.key in VIEW_SHORTCUTS && onViewChange) {
        const view = VIEW_SHORTCUTS[event.key]
        if (disabledViews?.has(view)) return
        event.preventDefault()
        onViewChange(view)
        return
      }

      // Command palette: Cmd/Ctrl + K
      if (event.key === 'k' && onCommandPalette) {
        event.preventDefault()
        onCommandPalette()
        return
      }

      // New Project: Cmd/Ctrl + N
      if (event.key === 'n' && !event.shiftKey && onNewProject) {
        event.preventDefault()
        onNewProject()
        return
      }

      // Open Folder: Cmd/Ctrl + O (no shift)
      if (event.key === 'o' && !event.shiftKey && onOpenFolder) {
        event.preventDefault()
        onOpenFolder()
        return
      }

      // Open Existing Project: Cmd/Ctrl + Shift + O
      if (event.key === 'o' && event.shiftKey && onOpenExisting) {
        event.preventDefault()
        onOpenExisting()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onViewChange, onCommandPalette, disabledViews, onNewProject, onOpenFolder, onOpenExisting])
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/AppShellViewMode -v`

Expected: PASS

- [ ] **Step 9: Update directly affected tests now and keep the tree green**

Run the directly affected suites now, not in a later cleanup commit:

`cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/AppShellViewMode __tests__/components/layout/AppShell __tests__/components/layout/Header __tests__/components/layout/Content __tests__/navigation __tests__/stores/projectStore -v`

Expected: PASS. Do not commit this task while known layout/navigation/store failures remain.

- [ ] **Step 10: Commit**

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml
git add frontend/src/components/layout/AppShell.tsx \
  frontend/src/components/layout/Header.tsx \
  frontend/src/components/layout/ActivityBar.tsx \
  frontend/src/components/layout/Content.tsx \
  frontend/src/hooks/useKeyboardShortcuts.ts \
  frontend/src/stores/projectStore.ts \
  frontend/src/__tests__/stores/projectStore.test.ts \
  frontend/src/__tests__/components/project/AppShellViewMode.test.tsx
git commit -m "feat(ui): add AppShell view mode with welcome/project/compat states (#A.5)"
```

---

### Task 5: WelcomeScreen Component

**Files:**
- Create: `frontend/src/components/project/WelcomeScreen.tsx`
- Create: `frontend/src/components/project/WelcomeScreen.css`
- Create: `frontend/src/components/project/RecentProjectsList.tsx` (minimal shared version)
- Create: `frontend/src/components/project/index.ts`
- Create: `frontend/src/__tests__/components/project/WelcomeScreen.test.tsx`
- Modify: `frontend/src/components/layout/Content.tsx` (replace placeholder)

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/components/project/WelcomeScreen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WelcomeScreen } from '@components/project'

const defaultProps = {
  recentProjects: [],
  onNewProject: jest.fn(),
  onOpenFolder: jest.fn(),
  onOpenExisting: jest.fn(),
  onBrowseExperiments: jest.fn(),
  onOpenRecentProject: jest.fn(),
  onRemoveRecentProject: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('WelcomeScreen', () => {
  it('renders the Flux branding and tagline', () => {
    render(<WelcomeScreen {...defaultProps} />)

    expect(screen.getByText('Flux')).toBeInTheDocument()
    expect(screen.getByText('The ML development environment')).toBeInTheDocument()
  })

  it('renders all action buttons', () => {
    render(<WelcomeScreen {...defaultProps} />)

    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open folder/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open existing project/i })).toBeInTheDocument()
  })

  it('renders shortcut hints on action buttons', () => {
    render(<WelcomeScreen {...defaultProps} />)

    expect(screen.getByText('⌘N')).toBeInTheDocument()
    expect(screen.getByText('⌘O')).toBeInTheDocument()
    expect(screen.getByText('⇧⌘O')).toBeInTheDocument()
  })

  it('calls onNewProject when New Project is clicked', async () => {
    const user = userEvent.setup()
    render(<WelcomeScreen {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /new project/i }))
    expect(defaultProps.onNewProject).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenFolder when Open Folder is clicked', async () => {
    const user = userEvent.setup()
    render(<WelcomeScreen {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /open folder/i }))
    expect(defaultProps.onOpenFolder).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenExisting when Open Existing Project is clicked', async () => {
    const user = userEvent.setup()
    render(<WelcomeScreen {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /open existing project/i }))
    expect(defaultProps.onOpenExisting).toHaveBeenCalledTimes(1)
  })

  it('renders Browse Existing Experiments link', async () => {
    const user = userEvent.setup()
    render(<WelcomeScreen {...defaultProps} />)

    const link = screen.getByRole('button', { name: /browse existing experiments/i })
    await user.click(link)
    expect(defaultProps.onBrowseExperiments).toHaveBeenCalledTimes(1)
  })

  it('shows empty state when no recent projects', () => {
    render(<WelcomeScreen {...defaultProps} />)

    expect(screen.getByText(/no recent projects/i)).toBeInTheDocument()
  })

  it('renders recent projects list', () => {
    const recents = [
      { path: '/home/user/project-a', name: 'project-a' },
      { path: '/home/user/project-b', name: 'project-b' },
    ]
    render(<WelcomeScreen {...defaultProps} recentProjects={recents} />)

    expect(screen.getByText('project-a')).toBeInTheDocument()
    expect(screen.getByText('project-b')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/WelcomeScreen -v`

Expected: FAIL — module not found

- [ ] **Step 3: Create the barrel export**

Create `frontend/src/components/project/index.ts`:

```typescript
export { WelcomeScreen } from './WelcomeScreen'
```

- [ ] **Step 4: Create WelcomeScreen component**

Create `frontend/src/components/project/WelcomeScreen.tsx`:

```tsx
import { RecentProjectsList, type RecentProjectEntry } from './RecentProjectsList'
import './WelcomeScreen.css'

interface WelcomeScreenProps {
  recentProjects: RecentProjectEntry[]
  onNewProject: () => void
  onOpenFolder: () => void
  onOpenExisting: () => void
  onBrowseExperiments: () => void
  onOpenRecentProject: (path: string) => void
  onRemoveRecentProject: (path: string) => void
}

export function WelcomeScreen({
  recentProjects,
  onNewProject,
  onOpenFolder,
  onOpenExisting,
  onBrowseExperiments,
  onOpenRecentProject,
  onRemoveRecentProject,
}: WelcomeScreenProps) {
  return (
    <div className="welcome" data-testid="welcome-screen">
      <div className="welcome__container">
        {/* Left Column — Branding + Actions */}
        <div className="welcome__left">
          <div className="welcome__branding">
            <span className="welcome__logo-text">Flux</span>
            <span className="welcome__tagline">The ML development environment</span>
          </div>

          <div className="welcome__actions">
            <button
              className="welcome__action-btn"
              onClick={onNewProject}
            >
              <span className="welcome__action-label">New Project...</span>
              <kbd className="welcome__kbd">⌘N</kbd>
            </button>
            <button
              className="welcome__action-btn"
              onClick={onOpenFolder}
            >
              <span className="welcome__action-label">Open Folder...</span>
              <kbd className="welcome__kbd">⌘O</kbd>
            </button>
            <button
              className="welcome__action-btn"
              onClick={onOpenExisting}
            >
              <span className="welcome__action-label">Open Existing Project...</span>
              <kbd className="welcome__kbd">⇧⌘O</kbd>
            </button>
          </div>

          <button
            className="welcome__compat-link"
            onClick={onBrowseExperiments}
          >
            Browse Existing Experiments
          </button>
        </div>

        {/* Right Column — Recent Projects */}
        <div className="welcome__right">
          <h2 className="welcome__section-header">Recent Projects</h2>
          <RecentProjectsList
            projects={recentProjects}
            onOpen={onOpenRecentProject}
            onRemove={onRemoveRecentProject}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create a minimal shared RecentProjectsList**

Create `frontend/src/components/project/RecentProjectsList.tsx` (minimal shared implementation — Task 6 adds stale-entry error treatment and filtering):

```tsx
export interface RecentProjectEntry {
  path: string
  name: string
  error?: string
}

interface RecentProjectsListProps {
  projects: RecentProjectEntry[]
  onOpen: (path: string) => void
  onRemove: (path: string) => void
}

function shortenPath(fullPath: string): string {
  return fullPath
    .replace(/^\/Users\/[^/]+/, '~')
    .replace(/^\/home\/[^/]+/, '~')
    .replace(/^C:\\Users\\[^\\]+/, '~')
}

export function RecentProjectsList({
  projects,
  onOpen,
}: RecentProjectsListProps) {
  if (projects.length === 0) {
    return <p className="recent-projects__empty">No recent projects</p>
  }

  return (
    <ul className="recent-projects">
      {projects.map((project) => (
        <li key={project.path} className="recent-projects__item">
          <button
            className="recent-projects__row"
            onClick={() => onOpen(project.path)}
          >
            <span className="recent-projects__name">{project.name}</span>
            <span className="recent-projects__path">{shortenPath(project.path)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
```

Update barrel: add to `frontend/src/components/project/index.ts`:

```typescript
export { WelcomeScreen } from './WelcomeScreen'
export { RecentProjectsList } from './RecentProjectsList'
export type { RecentProjectEntry } from './RecentProjectsList'
```

- [ ] **Step 6: Create WelcomeScreen CSS**

Create `frontend/src/components/project/WelcomeScreen.css`:

```css
.welcome {
  grid-area: content;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-base);
  padding: var(--spacing-2xl);
}

.welcome__container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-2xl);
  max-width: 720px;
  width: 100%;
}

.welcome__left {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.welcome__branding {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.welcome__logo-text {
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.welcome__tagline {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
}

.welcome__actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.welcome__action-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-ui);
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.welcome__action-btn:hover {
  background: var(--color-bg-active);
  border-color: var(--color-border-default);
}

.welcome__action-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.welcome__action-label {
  font-weight: var(--font-weight-medium);
}

.welcome__kbd {
  font-family: var(--font-ui);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  padding: 2px 6px;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-muted);
  border-radius: var(--radius-sm);
}

.welcome__compat-link {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-family: var(--font-ui);
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-align: left;
  padding: 0;
  transition: color var(--transition-fast);
}

.welcome__compat-link:hover {
  color: var(--color-accent);
}

.welcome__right {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.welcome__section-header {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  margin: 0;
}

.welcome__empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin: 0;
}

.welcome__recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.welcome__recent-btn {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-ui);
  transition: all var(--transition-fast);
}

.welcome__recent-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-muted);
}

.welcome__recent-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.welcome__recent-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.welcome__recent-path {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/WelcomeScreen -v`

Expected: PASS

- [ ] **Step 8: Wire WelcomeScreen into Content**

Update `frontend/src/components/layout/Content.tsx` to import and render the real WelcomeScreen:

```tsx
import { ViewId } from './Header'
import { ExperimentsView, CompareView, DataView, CodeView } from '../views'
import { WelcomeScreen, type RecentProjectEntry } from '../project'
import { LayoutPersistence } from '../../hooks/useLayoutPersistence'

export type AppMode = 'welcome' | 'project' | 'no-project-compat'

interface ContentProps {
  activeView: ViewId
  layout: LayoutPersistence
  appMode: AppMode
  recentProjects: RecentProjectEntry[]
  onNewProject: () => void
  onOpenFolder: () => void
  onOpenExisting: () => void
  onBrowseExperiments: () => void
  onOpenRecentProject: (path: string) => void
  onRemoveRecentProject: (path: string) => void
}

export function Content({
  activeView,
  layout,
  appMode,
  recentProjects,
  onNewProject,
  onOpenFolder,
  onOpenExisting,
  onBrowseExperiments,
  onOpenRecentProject,
  onRemoveRecentProject,
}: ContentProps) {
  if (appMode === 'welcome') {
    return (
      <WelcomeScreen
        recentProjects={recentProjects}
        onNewProject={onNewProject}
        onOpenFolder={onOpenFolder}
        onOpenExisting={onOpenExisting}
        onBrowseExperiments={onBrowseExperiments}
        onOpenRecentProject={onOpenRecentProject}
        onRemoveRecentProject={onRemoveRecentProject}
      />
    )
  }

  switch (activeView) {
    case 'experiments':
      return <ExperimentsView layout={layout} />
    case 'compare':
      return <CompareView layout={layout} />
    case 'data':
      return <DataView layout={layout} />
    case 'code':
      return <CodeView layout={layout} />
    default:
      return <ExperimentsView layout={layout} />
  }
}
```

Update AppShell to pass the new Content props. In `frontend/src/components/layout/AppShell.tsx`, update the `Content` render:

```tsx
<Content
  activeView={activeView}
  layout={layout}
  appMode={appMode}
  recentProjects={recentProjectEntries}
  onNewProject={handleNewProject}
  onOpenFolder={handleOpenFolder}
  onOpenExisting={handleOpenExisting}
  onBrowseExperiments={handleEnterCompatMode}
  onOpenRecentProject={handleOpenRecentProject}
  onRemoveRecentProject={handleRemoveRecentProject}
/>
```

Add the recent-project UI state and handler stubs to AppShell (these will be fully implemented in later tasks):

```tsx
const recentProjects = useProjectStore((s) => s.recentProjects)
const [recentProjectErrors, setRecentProjectErrors] = useState<Record<string, string>>({})

const recentProjectEntries = useMemo(
  () =>
    recentProjects.map((project) => ({
      ...project,
      error: recentProjectErrors[project.path],
    })),
  [recentProjects, recentProjectErrors],
)

const handleNewProject = useCallback(() => {
  // Will open NewProjectWizard — Task 8
}, [])

const handleOpenFolder = useCallback(() => {
  // Will trigger OpenFolderDialog — Task 11
}, [])

const handleOpenExisting = useCallback(() => {
  // Will trigger OpenFolderDialog with flux.yaml check — Task 11
}, [])

const handleOpenRecentProject = useCallback(async (path: string) => {
  try {
    await OpenProject(path)
    setRecentProjectErrors((prev) => {
      const next = { ...prev }
      delete next[path]
      return next
    })
  } catch (err) {
    console.error('Failed to open project:', err)
    const message = err instanceof Error && /flux\.yaml/i.test(err.message)
      ? 'No flux.yaml found'
      : 'Project not found'
    setRecentProjectErrors((prev) => ({ ...prev, [path]: message }))
  }
}, [])

const handleRemoveRecentProject = useCallback(async (path: string) => {
  try {
    await RemoveRecentProject(path)
    setRecentProjectErrors((prev) => {
      const next = { ...prev }
      delete next[path]
      return next
    })
    useProjectStore.getState().fetchRecentProjects()
  } catch (err) {
    console.error('Failed to remove recent project:', err)
  }
}, [])
```

Add the imports at the top of AppShell:

```tsx
import { OpenProject, RemoveRecentProject } from '../../../wailsjs/go/main/App'
```

- [ ] **Step 9: Run the WelcomeScreen and AppShellViewMode tests**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/WelcomeScreen __tests__/components/project/AppShellViewMode __tests__/components/layout/Content __tests__/components/layout/AppShell -v`

Expected: PASS

- [ ] **Step 10: Commit**

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml
git add frontend/src/components/project/ \
  frontend/src/components/layout/Content.tsx \
  frontend/src/components/layout/AppShell.tsx \
  frontend/src/__tests__/components/project/WelcomeScreen.test.tsx
git commit -m "feat(ui): add WelcomeScreen with branding, actions, and recent projects (#A.5)"
```

---

### Task 6: RecentProjectsList with Stale-Entry Handling

**Files:**
- Modify: `frontend/src/components/project/RecentProjectsList.tsx` (replace stub)
- Create: `frontend/src/components/project/RecentProjectsList.css`
- Create: `frontend/src/__tests__/components/project/RecentProjectsList.test.tsx`
- Modify: `frontend/src/components/project/index.ts`

Because WelcomeScreen is already routed through this shared component from Task 5, replacing `RecentProjectsList.tsx` in this task updates the welcome screen immediately. Task 7 then reuses the same list in the project switcher dropdown so stale-entry affordances stay consistent.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/components/project/RecentProjectsList.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecentProjectsList } from '@components/project'

const defaultProps = {
  projects: [
    { path: '/home/user/alpha', name: 'alpha' },
    { path: '/home/user/beta', name: 'beta' },
  ],
  onOpen: jest.fn(),
  onRemove: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('RecentProjectsList', () => {
  it('renders project names', () => {
    render(<RecentProjectsList {...defaultProps} />)

    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('beta')).toBeInTheDocument()
  })

  it('calls onOpen when a project row is clicked', async () => {
    const user = userEvent.setup()
    render(<RecentProjectsList {...defaultProps} />)

    await user.click(screen.getByText('alpha'))
    expect(defaultProps.onOpen).toHaveBeenCalledWith('/home/user/alpha')
  })

  it('shows error state on a row', () => {
    const projects = [
      { path: '/home/user/alpha', name: 'alpha', error: 'Project not found' },
      { path: '/home/user/beta', name: 'beta' },
    ]
    render(<RecentProjectsList {...defaultProps} projects={projects} />)

    expect(screen.getByText('Project not found')).toBeInTheDocument()
  })

  it('shows remove button on error rows', async () => {
    const user = userEvent.setup()
    const projects = [
      { path: '/home/user/alpha', name: 'alpha', error: 'Project not found' },
    ]
    render(<RecentProjectsList {...defaultProps} projects={projects} />)

    const removeBtn = screen.getByRole('button', { name: /remove from list/i })
    await user.click(removeBtn)
    expect(defaultProps.onRemove).toHaveBeenCalledWith('/home/user/alpha')
  })

  it('excludes projects in excludePaths', () => {
    render(
      <RecentProjectsList
        {...defaultProps}
        excludePaths={new Set(['/home/user/alpha'])}
      />,
    )

    expect(screen.queryByText('alpha')).not.toBeInTheDocument()
    expect(screen.getByText('beta')).toBeInTheDocument()
  })

  it('shows empty state when no projects', () => {
    render(<RecentProjectsList {...defaultProps} projects={[]} />)

    expect(screen.getByText(/no recent projects/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/RecentProjectsList -v`

Expected: FAIL — stale-entry error rows and `excludePaths` filtering are not implemented yet

- [ ] **Step 3: Implement RecentProjectsList**

Replace `frontend/src/components/project/RecentProjectsList.tsx`:

```tsx
import './RecentProjectsList.css'

export interface RecentProjectEntry {
  path: string
  name: string
  error?: string
}

interface RecentProjectsListProps {
  projects: RecentProjectEntry[]
  onOpen: (path: string) => void
  onRemove: (path: string) => void
  excludePaths?: Set<string>
}

function shortenPath(fullPath: string): string {
  return fullPath
    .replace(/^\/Users\/[^/]+/, '~')
    .replace(/^\/home\/[^/]+/, '~')
    .replace(/^C:\\Users\\[^\\]+/, '~')
}

export function RecentProjectsList({
  projects,
  onOpen,
  onRemove,
  excludePaths,
}: RecentProjectsListProps) {
  const filtered = excludePaths
    ? projects.filter((p) => !excludePaths.has(p.path))
    : projects

  if (filtered.length === 0) {
    return <p className="recent-projects__empty">No recent projects</p>
  }

  return (
    <ul className="recent-projects" role="list">
      {filtered.map((project) => (
        <li key={project.path} className="recent-projects__item">
          {project.error ? (
            <div className="recent-projects__error-row">
              <div className="recent-projects__info">
                <span className="recent-projects__name">{project.name}</span>
                <span className="recent-projects__error-msg">{project.error}</span>
              </div>
              <button
                className="recent-projects__remove-btn"
                onClick={() => onRemove(project.path)}
                aria-label="Remove from list"
              >
                Remove from list
              </button>
            </div>
          ) : (
            <button
              className="recent-projects__row"
              onClick={() => onOpen(project.path)}
            >
              <span className="recent-projects__name">{project.name}</span>
              <span className="recent-projects__path">{shortenPath(project.path)}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: Create RecentProjectsList CSS**

Create `frontend/src/components/project/RecentProjectsList.css`:

```css
.recent-projects {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-projects__empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin: 0;
}

.recent-projects__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-ui);
  transition: all var(--transition-fast);
}

.recent-projects__row:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border-muted);
}

.recent-projects__row:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.recent-projects__name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.recent-projects__path {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.recent-projects__error-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-error-dim);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
}

.recent-projects__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-projects__error-msg {
  font-size: var(--font-size-xs);
  color: var(--color-error);
}

.recent-projects__remove-btn {
  font-family: var(--font-ui);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.recent-projects__remove-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
}
```

- [ ] **Step 5: Update barrel export**

Update `frontend/src/components/project/index.ts`:

```typescript
export { WelcomeScreen } from './WelcomeScreen'
export { RecentProjectsList } from './RecentProjectsList'
export type { RecentProjectEntry } from './RecentProjectsList'
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/RecentProjectsList -v`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml
git add frontend/src/components/project/RecentProjectsList.tsx \
  frontend/src/components/project/RecentProjectsList.css \
  frontend/src/components/project/index.ts \
  frontend/src/__tests__/components/project/RecentProjectsList.test.tsx
git commit -m "feat(ui): add RecentProjectsList with stale-entry error states (#A.5)"
```

---

### Task 7: ProjectSwitcher + Dropdown

**Files:**
- Create: `frontend/src/components/project/ProjectSwitcher.tsx`
- Create: `frontend/src/components/project/ProjectSwitcherDropdown.tsx`
- Create: `frontend/src/components/project/ProjectSwitcher.css`
- Create: `frontend/src/__tests__/components/project/ProjectSwitcher.test.tsx`
- Modify: `frontend/src/components/project/index.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/components/project/ProjectSwitcher.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectSwitcher } from '@components/project'

const defaultProps = {
  projectName: 'reward-lab',
  degraded: false,
  recentProjects: [
    { path: '/tmp/other-proj', name: 'other-proj' },
  ],
  onNewProject: jest.fn(),
  onOpenFolder: jest.fn(),
  onOpenExisting: jest.fn(),
  onCloseProject: jest.fn(),
  onSwitchProject: jest.fn(),
  onRemoveRecentProject: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ProjectSwitcher', () => {
  it('renders the project name in the pill', () => {
    render(<ProjectSwitcher {...defaultProps} />)

    expect(screen.getByText('reward-lab')).toBeInTheDocument()
  })

  it('shows green dot when not degraded', () => {
    render(<ProjectSwitcher {...defaultProps} />)

    const dot = screen.getByTestId('project-status-dot')
    expect(dot).toHaveClass('project-switcher__dot--healthy')
  })

  it('shows amber dot when degraded', () => {
    render(<ProjectSwitcher {...defaultProps} degraded={true} />)

    const dot = screen.getByTestId('project-status-dot')
    expect(dot).toHaveClass('project-switcher__dot--degraded')
  })

  it('opens dropdown on click', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /project menu/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('renders action items in dropdown', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /project menu/i }))
    const menu = screen.getByRole('menu')

    expect(within(menu).getByText(/new project/i)).toBeInTheDocument()
    expect(within(menu).getByText(/open folder/i)).toBeInTheDocument()
    expect(within(menu).getByText(/open existing project/i)).toBeInTheDocument()
    expect(within(menu).getByText(/close project/i)).toBeInTheDocument()
  })

  it('renders recent projects in dropdown (excluding current)', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /project menu/i }))

    expect(screen.getByText('other-proj')).toBeInTheDocument()
  })

  it('closes when the trigger is clicked a second time', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)

    const trigger = screen.getByRole('button', { name: /project menu/i })
    await user.click(trigger)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(trigger)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes dropdown on Escape', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /project menu/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('calls onCloseProject when Close Project is clicked', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /project menu/i }))
    await user.click(screen.getByText(/close project/i))
    expect(defaultProps.onCloseProject).toHaveBeenCalledTimes(1)
  })

  it('calls onSwitchProject when a recent project is clicked', async () => {
    const user = userEvent.setup()
    render(<ProjectSwitcher {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /project menu/i }))
    await user.click(screen.getByText('other-proj'))
    expect(defaultProps.onSwitchProject).toHaveBeenCalledWith('/tmp/other-proj')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/ProjectSwitcher -v`

Expected: FAIL — module not found

- [ ] **Step 3: Create ProjectSwitcherDropdown**

Create `frontend/src/components/project/ProjectSwitcherDropdown.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { RecentProjectsList, type RecentProjectEntry } from './RecentProjectsList'

interface ProjectSwitcherDropdownProps {
  anchorRef: React.RefObject<HTMLDivElement | null>
  recentProjects: RecentProjectEntry[]
  currentProjectPath?: string
  onNewProject: () => void
  onOpenFolder: () => void
  onOpenExisting: () => void
  onCloseProject: () => void
  onSwitchProject: (path: string) => void
  onRemoveRecentProject: (path: string) => void
  onClose: () => void
}

export function ProjectSwitcherDropdown({
  anchorRef,
  recentProjects,
  currentProjectPath,
  onNewProject,
  onOpenFolder,
  onOpenExisting,
  onCloseProject,
  onSwitchProject,
  onRemoveRecentProject,
  onClose,
}: ProjectSwitcherDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [focusIndex, setFocusIndex] = useState(-1)

  // Close on click outside. Use the shared wrapper ref so clicking the trigger
  // a second time toggles closed instead of closing and reopening immediately.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [anchorRef, onClose])

  // Keyboard navigation: Escape, Arrow Up/Down, Enter, Home/End
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      const items = menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]',
      )
      if (!items?.length) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = focusIndex < items.length - 1 ? focusIndex + 1 : 0
        setFocusIndex(next)
        items[next].focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = focusIndex > 0 ? focusIndex - 1 : items.length - 1
        setFocusIndex(prev)
        items[prev].focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        setFocusIndex(0)
        items[0].focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        setFocusIndex(items.length - 1)
        items[items.length - 1].focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, focusIndex])

  // Auto-focus first item on open
  useEffect(() => {
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]',
    )
    if (items?.length) {
      setFocusIndex(0)
      items[0].focus()
    }
  }, [])

  const filteredRecents = recentProjects.filter(
    (p) => p.path !== currentProjectPath,
  )

  function handleAction(action: () => void) {
    action()
    onClose()
  }

  return (
    <div className="project-dropdown" role="menu" ref={menuRef}>
      <button
        className="project-dropdown__item"
        role="menuitem"
        onClick={() => handleAction(onNewProject)}
      >
        <span>New Project...</span>
        <kbd className="project-dropdown__kbd">⌘N</kbd>
      </button>
      <button
        className="project-dropdown__item"
        role="menuitem"
        onClick={() => handleAction(onOpenFolder)}
      >
        <span>Open Folder...</span>
        <kbd className="project-dropdown__kbd">⌘O</kbd>
      </button>
      <button
        className="project-dropdown__item"
        role="menuitem"
        onClick={() => handleAction(onOpenExisting)}
      >
        <span>Open Existing Project...</span>
        <kbd className="project-dropdown__kbd">⇧⌘O</kbd>
      </button>

      {filteredRecents.length > 0 && (
        <>
          <div className="project-dropdown__divider" role="separator" />
          <div className="project-dropdown__section-header">Recent Projects</div>
          <RecentProjectsList
            projects={filteredRecents}
            onOpen={(path) => handleAction(() => onSwitchProject(path))}
            onRemove={(path) => handleAction(() => onRemoveRecentProject(path))}
          />
        </>
      )}

      <div className="project-dropdown__divider" role="separator" />
      <button
        className="project-dropdown__item project-dropdown__item--danger"
        role="menuitem"
        onClick={() => handleAction(onCloseProject)}
      >
        Close Project
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Create ProjectSwitcher**

Create `frontend/src/components/project/ProjectSwitcher.tsx`:

```tsx
import { useState, useCallback, useRef } from 'react'
import { ProjectSwitcherDropdown } from './ProjectSwitcherDropdown'
import type { RecentProjectEntry } from './RecentProjectsList'
import './ProjectSwitcher.css'

interface ProjectSwitcherProps {
  projectName: string
  projectPath?: string
  degraded: boolean
  recentProjects: RecentProjectEntry[]
  onNewProject: () => void
  onOpenFolder: () => void
  onOpenExisting: () => void
  onCloseProject: () => void
  onSwitchProject: (path: string) => void
  onRemoveRecentProject: (path: string) => void
}

export function ProjectSwitcher({
  projectName,
  projectPath,
  degraded,
  recentProjects,
  onNewProject,
  onOpenFolder,
  onOpenExisting,
  onCloseProject,
  onSwitchProject,
  onRemoveRecentProject,
}: ProjectSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <div className="project-switcher" ref={containerRef}>
      <button
        className="project-switcher__pill"
        onClick={handleToggle}
        aria-label="Project menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span
          className={`project-switcher__dot ${degraded ? 'project-switcher__dot--degraded' : 'project-switcher__dot--healthy'}`}
          data-testid="project-status-dot"
        />
        <span className="project-switcher__name">{projectName}</span>
        <span className="project-switcher__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <ProjectSwitcherDropdown
          anchorRef={containerRef}
          recentProjects={recentProjects}
          currentProjectPath={projectPath}
          onNewProject={onNewProject}
          onOpenFolder={onOpenFolder}
          onOpenExisting={onOpenExisting}
          onCloseProject={onCloseProject}
          onSwitchProject={onSwitchProject}
          onRemoveRecentProject={onRemoveRecentProject}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create ProjectSwitcher CSS**

Create `frontend/src/components/project/ProjectSwitcher.css`:

```css
.project-switcher {
  position: relative;
}

.project-switcher__pill {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 4px 10px;
  font-family: var(--font-ui);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-hover);
  border: 1px solid var(--color-border-muted);
  border-radius: 99px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.project-switcher__pill:hover {
  background: var(--color-bg-active);
  border-color: var(--color-border-default);
}

.project-switcher__pill:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.project-switcher__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.project-switcher__dot--healthy {
  background: var(--color-success);
  box-shadow: 0 0 4px var(--color-success);
}

.project-switcher__dot--degraded {
  background: var(--color-warning);
  box-shadow: 0 0 4px var(--color-warning);
}

.project-switcher__name {
  font-weight: var(--font-weight-medium);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-switcher__chevron {
  font-size: 10px;
  color: var(--color-text-muted);
}

/* Dropdown */
.project-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 240px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-dropdown);
  padding: var(--spacing-xs) 0;
  --wails-draggable: no-drag;
}

.project-dropdown__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-ui);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);
}

.project-dropdown__item:hover {
  background: var(--color-bg-hover);
}

.project-dropdown__item:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.project-dropdown__item--danger {
  color: var(--color-error);
}

.project-dropdown__kbd {
  font-family: var(--font-ui);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.project-dropdown__divider {
  height: 1px;
  background: var(--color-border-muted);
  margin: var(--spacing-xs) 0;
}

.project-dropdown__section-header {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-xs);
}
```

- [ ] **Step 6: Update barrel export**

Add to `frontend/src/components/project/index.ts`:

```typescript
export { ProjectSwitcher } from './ProjectSwitcher'
export { ProjectSwitcherDropdown } from './ProjectSwitcherDropdown'
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/ProjectSwitcher -v`

Expected: PASS

- [ ] **Step 8: Wire ProjectSwitcher into AppShell Header**

In `frontend/src/components/layout/AppShell.tsx`, add the ProjectSwitcher rendering and pass it to Header:

```tsx
import { ProjectSwitcher } from '../project'
```

Add the projectSwitcher prop to the Header render, inside the return JSX:

```tsx
<Header
  version={appInfo?.version}
  activeView={activeView}
  onViewChange={handleViewChange}
  runningCount={runningCount}
  alertCount={alertCount}
  onCommandPalette={handleCommandPalette}
  disabledViews={disabledViews}
  projectSwitcher={
    currentProject ? (
      <ProjectSwitcher
        projectName={currentProject.name}
        projectPath={currentProject.path}
        degraded={degraded}
        recentProjects={recentProjectEntries}
        onNewProject={handleNewProject}
        onOpenFolder={handleOpenFolder}
        onOpenExisting={handleOpenExisting}
        onCloseProject={handleCloseProject}
        onSwitchProject={handleOpenRecentProject}
        onRemoveRecentProject={handleRemoveRecentProject}
      />
    ) : undefined
  }
/>
```

Add `handleCloseProject`:

```tsx
const closeProject = useProjectStore((s) => s.closeProject)

const handleCloseProject = useCallback(async () => {
  await closeProject()
}, [closeProject])
```

Also subscribe to `degraded` at the component level. `recentProjects` is already selected in Task 5 to derive `recentProjectEntries`:

```tsx
const degraded = useProjectStore((s) => s.degraded)
```

And pass these to the `ProjectSwitcher` via props rather than calling `getState()`:

```tsx
projectSwitcher={
  currentProject ? (
    <ProjectSwitcher
      projectName={currentProject.name}
      projectPath={currentProject.path}
      degraded={degraded}
      recentProjects={recentProjectEntries}
      onNewProject={handleNewProject}
      onOpenFolder={handleOpenFolder}
      onOpenExisting={handleOpenExisting}
      onCloseProject={handleCloseProject}
      onSwitchProject={handleOpenRecentProject}
      onRemoveRecentProject={handleRemoveRecentProject}
    />
  ) : undefined
}
```

- [ ] **Step 9: Run all project tests**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/ProjectSwitcher __tests__/components/layout/Header __tests__/components/layout/AppShell -v`

Expected: PASS

- [ ] **Step 10: Commit**

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml
git add frontend/src/components/project/ProjectSwitcher.tsx \
  frontend/src/components/project/ProjectSwitcherDropdown.tsx \
  frontend/src/components/project/ProjectSwitcher.css \
  frontend/src/components/project/index.ts \
  frontend/src/components/layout/AppShell.tsx \
  frontend/src/__tests__/components/project/ProjectSwitcher.test.tsx
git commit -m "feat(ui): add ProjectSwitcher pill and dropdown in header (#A.5)"
```

---

### Task 8: NewProjectWizard Shell + Template Step

**Files:**
- Create: `frontend/src/components/project/wizardReducer.ts`
- Create: `frontend/src/components/project/NewProjectWizard.tsx`
- Create: `frontend/src/components/project/NewProjectWizard.css`
- Create: `frontend/src/components/project/WizardStepTemplate.tsx`
- Create: `frontend/src/__tests__/components/project/NewProjectWizard.test.tsx`
- Modify: `frontend/src/components/project/index.ts`

- [ ] **Step 1: Write the failing test for wizard shell + template step**

Create `frontend/src/__tests__/components/project/NewProjectWizard.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewProjectWizard } from '@components/project'

jest.mock('../../../../wailsjs/go/main/App')

const defaultProps = {
  onClose: jest.fn(),
  onCreated: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('NewProjectWizard', () => {
  describe('Modal shell', () => {
    it('renders as a modal dialog', () => {
      render(<NewProjectWizard {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('renders step indicator with 3 steps', () => {
      render(<NewProjectWizard {...defaultProps} />)

      expect(screen.getByText('Template')).toBeInTheDocument()
      expect(screen.getByText('Details')).toBeInTheDocument()
      expect(screen.getByText('Review')).toBeInTheDocument()
    })

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(<NewProjectWizard {...defaultProps} />)

      await user.click(screen.getByTestId('wizard-backdrop'))
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when Escape is pressed', async () => {
      const user = userEvent.setup()
      render(<NewProjectWizard {...defaultProps} />)

      await user.keyboard('{Escape}')
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Step 1: Template', () => {
    it('renders template heading', () => {
      render(<NewProjectWizard {...defaultProps} />)

      expect(screen.getByText('What kind of project?')).toBeInTheDocument()
    })

    it('renders selectable template cards', () => {
      render(<NewProjectWizard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /reward model/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /blank/i })).toBeInTheDocument()
    })

    it('renders coming-soon templates as disabled', () => {
      render(<NewProjectWizard {...defaultProps} />)

      expect(screen.getByText(/classification/i)).toBeInTheDocument()
      expect(screen.getByText(/fine-tuning/i)).toBeInTheDocument()
    })

    it('Continue button is disabled until a template is selected', () => {
      render(<NewProjectWizard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
    })

    it('enables Continue after selecting a template', async () => {
      const user = userEvent.setup()
      render(<NewProjectWizard {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /reward model/i }))
      expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled()
    })

    it('advances to step 2 when Continue is clicked', async () => {
      const user = userEvent.setup()
      render(<NewProjectWizard {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /reward model/i }))
      await user.click(screen.getByRole('button', { name: /continue/i }))

      // Step 2 content should appear
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/NewProjectWizard -v`

Expected: FAIL — module not found

- [ ] **Step 3: Create the wizard reducer**

Create `frontend/src/components/project/wizardReducer.ts`:

```typescript
export type TemplateId = 'reward-model' | 'blank'

export interface WizardState {
  step: 1 | 2 | 3
  template: TemplateId | null
  projectName: string
  location: string
  locationManuallyEdited: boolean
  seedDemo: boolean
  creating: boolean
  error: string | null
}

export type WizardAction =
  | { type: 'SET_TEMPLATE'; template: TemplateId }
  | { type: 'SET_PROJECT_NAME'; name: string }
  | { type: 'SET_LOCATION'; location: string; manual: boolean }
  | { type: 'SET_SEED_DEMO'; include: boolean }
  | { type: 'GO_TO_STEP'; step: 1 | 2 | 3 }
  | { type: 'CREATE_START' }
  | { type: 'CREATE_ERROR'; error: string }
  | { type: 'CREATE_SUCCESS' }

const DEFAULT_NAMES: Record<TemplateId, string> = {
  'reward-model': 'reward-model-v1',
  blank: 'my-project',
}

function sanitizeForPath(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function defaultParent(): string {
  // Best guess for the home directory in a browser context
  return '~/projects'
}

function buildLocation(name: string): string {
  const slug = sanitizeForPath(name) || 'untitled'
  return `${defaultParent()}/${slug}`
}

export function createInitialState(): WizardState {
  return {
    step: 1,
    template: null,
    projectName: '',
    location: '',
    locationManuallyEdited: false,
    seedDemo: true,
    creating: false,
    error: null,
  }
}

export function wizardReducer(
  state: WizardState,
  action: WizardAction,
): WizardState {
  switch (action.type) {
    case 'SET_TEMPLATE': {
      const name = DEFAULT_NAMES[action.template]
      return {
        ...state,
        template: action.template,
        projectName: name,
        location: buildLocation(name),
        locationManuallyEdited: false,
      }
    }

    case 'SET_PROJECT_NAME': {
      const next: WizardState = {
        ...state,
        projectName: action.name,
      }
      if (!state.locationManuallyEdited) {
        next.location = buildLocation(action.name)
      }
      return next
    }

    case 'SET_LOCATION':
      return {
        ...state,
        location: action.location,
        locationManuallyEdited: action.manual,
      }

    case 'SET_SEED_DEMO':
      return { ...state, seedDemo: action.include }

    case 'GO_TO_STEP':
      return { ...state, step: action.step, error: null }

    case 'CREATE_START':
      return { ...state, creating: true, error: null }

    case 'CREATE_ERROR':
      return { ...state, creating: false, error: action.error }

    case 'CREATE_SUCCESS':
      return { ...state, creating: false }

    default:
      return state
  }
}
```

- [ ] **Step 4: Create WizardStepTemplate**

Create `frontend/src/components/project/WizardStepTemplate.tsx`:

```tsx
import type { TemplateId } from './wizardReducer'

interface TemplateOption {
  id: TemplateId
  name: string
  description: string
  available: true
}

interface TemplateComingSoon {
  id: string
  name: string
  description: string
  available: false
}

type TemplateCard = TemplateOption | TemplateComingSoon

const TEMPLATES: TemplateCard[] = [
  {
    id: 'reward-model',
    name: 'Reward Model',
    description: 'PPO/DPO training loop, reward components, evaluation scripts',
    available: true,
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Empty project with src/, configs/, data/',
    available: true,
  },
  {
    id: 'classification',
    name: 'Classification',
    description: 'Image and text classification pipelines',
    available: false,
  },
  {
    id: 'fine-tuning',
    name: 'Fine-tuning (SFT)',
    description: 'Supervised fine-tuning workflows',
    available: false,
  },
]

interface WizardStepTemplateProps {
  selectedTemplate: TemplateId | null
  onSelectTemplate: (template: TemplateId) => void
}

export function WizardStepTemplate({
  selectedTemplate,
  onSelectTemplate,
}: WizardStepTemplateProps) {
  return (
    <div className="wizard-step">
      <h2 className="wizard-step__heading">What kind of project?</h2>
      <div className="wizard-templates">
        {TEMPLATES.map((tmpl) => {
          if (!tmpl.available) {
            return (
              <div
                key={tmpl.id}
                className="wizard-template wizard-template--disabled"
              >
                <span className="wizard-template__name">{tmpl.name}</span>
                <span className="wizard-template__desc">{tmpl.description}</span>
                <span className="wizard-template__badge">Coming soon</span>
              </div>
            )
          }
          const isSelected = selectedTemplate === tmpl.id
          return (
            <button
              key={tmpl.id}
              className={`wizard-template ${isSelected ? 'wizard-template--selected' : ''}`}
              onClick={() => onSelectTemplate(tmpl.id)}
              aria-pressed={isSelected}
            >
              <span className="wizard-template__name">{tmpl.name}</span>
              <span className="wizard-template__desc">{tmpl.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create NewProjectWizard shell**

Create `frontend/src/components/project/NewProjectWizard.tsx`:

```tsx
import { useReducer, useEffect, useCallback } from 'react'
import { wizardReducer, createInitialState } from './wizardReducer'
import { WizardStepTemplate } from './WizardStepTemplate'
import { CreateProject } from '../../../wailsjs/go/main/App'
import './NewProjectWizard.css'

const STEP_LABELS = ['Template', 'Details', 'Review'] as const

interface NewProjectWizardProps {
  onClose: () => void
  onCreated: () => void
}

export function NewProjectWizard({ onClose, onCreated }: NewProjectWizardProps) {
  const [state, dispatch] = useReducer(wizardReducer, undefined, createInitialState)

  // Close on Escape (only when not creating)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !state.creating) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, state.creating])

  const handleBackdropClick = useCallback(() => {
    if (!state.creating) {
      onClose()
    }
  }, [onClose, state.creating])

  const handleContinue = useCallback(() => {
    if (state.step < 3) {
      dispatch({ type: 'GO_TO_STEP', step: (state.step + 1) as 1 | 2 | 3 })
    }
  }, [state.step])

  const handleBack = useCallback(() => {
    if (state.step > 1) {
      dispatch({ type: 'GO_TO_STEP', step: (state.step - 1) as 1 | 2 | 3 })
    }
  }, [state.step])

  const handleCreate = useCallback(async () => {
    if (!state.template) return
    dispatch({ type: 'CREATE_START' })
    try {
      await CreateProject(
        state.projectName,
        state.location,
        state.template,
        state.seedDemo,
      )
      dispatch({ type: 'CREATE_SUCCESS' })
      onCreated()
    } catch (err) {
      dispatch({
        type: 'CREATE_ERROR',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }, [state, onCreated])

  const canContinue =
    (state.step === 1 && state.template !== null) ||
    (state.step === 2 && state.projectName.trim() !== '' && state.location.trim() !== '')

  return (
    <div className="wizard-overlay">
      <div
        className="wizard-overlay__backdrop"
        data-testid="wizard-backdrop"
        onClick={handleBackdropClick}
      />
      <div className="wizard" role="dialog" aria-label="New Project">
        {/* Step Indicator */}
        <div className="wizard__steps">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1
            const isCompleted = stepNum < state.step
            const isActive = stepNum === state.step
            return (
              <button
                key={label}
                className={`wizard__step-indicator ${isCompleted ? 'wizard__step-indicator--completed' : ''} ${isActive ? 'wizard__step-indicator--active' : ''}`}
                disabled={stepNum > state.step}
                onClick={() =>
                  stepNum <= state.step &&
                  dispatch({ type: 'GO_TO_STEP', step: stepNum as 1 | 2 | 3 })
                }
              >
                <span className="wizard__step-dot" />
                <span className="wizard__step-label">{label}</span>
              </button>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="wizard__content">
          {state.step === 1 && (
            <WizardStepTemplate
              selectedTemplate={state.template}
              onSelectTemplate={(t) => dispatch({ type: 'SET_TEMPLATE', template: t })}
            />
          )}
          {state.step === 2 && (
            <div className="wizard-step">
              <h2 className="wizard-step__heading">Project details</h2>
              <label htmlFor="wizard-name">Project Name</label>
              <input
                id="wizard-name"
                type="text"
                className="input"
                value={state.projectName}
                onChange={(e) =>
                  dispatch({ type: 'SET_PROJECT_NAME', name: e.target.value })
                }
              />
              {/* Full implementation in Task 9 */}
            </div>
          )}
          {state.step === 3 && (
            <div className="wizard-step">
              <h2 className="wizard-step__heading">Review &amp; Create</h2>
              {/* Full implementation in Task 10 */}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="wizard__footer">
          {state.step > 1 && (
            <button
              className="button button--secondary button--md"
              onClick={handleBack}
              disabled={state.creating}
            >
              Back
            </button>
          )}
          <div className="wizard__footer-spacer" />
          {state.step < 3 ? (
            <button
              className="button button--primary button--md"
              onClick={handleContinue}
              disabled={!canContinue}
            >
              Continue
            </button>
          ) : (
            <button
              className="button button--primary button--md"
              onClick={handleCreate}
              disabled={state.creating || !state.projectName.trim()}
            >
              {state.creating ? 'Creating...' : 'Create Project'}
            </button>
          )}
        </div>

        {/* Inline error */}
        {state.error && (
          <div className="wizard__error" role="alert">
            {state.error}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create NewProjectWizard CSS**

Create `frontend/src/components/project/NewProjectWizard.css`:

```css
.wizard-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
}

.wizard-overlay__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.wizard {
  position: relative;
  width: 600px;
  max-height: 80vh;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-default);
  border-radius: var(--panel-radius);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wizard__steps {
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
  padding: var(--spacing-lg) var(--spacing-xl);
  border-bottom: 1px solid var(--color-border-muted);
}

.wizard__step-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-family: var(--font-ui);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color var(--transition-fast);
}

.wizard__step-indicator:disabled {
  cursor: default;
  opacity: 0.5;
}

.wizard__step-indicator--active {
  color: var(--color-text-primary);
}

.wizard__step-indicator--completed {
  color: var(--color-success);
}

.wizard__step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--color-text-muted);
  flex-shrink: 0;
}

.wizard__step-indicator--active .wizard__step-dot {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.wizard__step-indicator--completed .wizard__step-dot {
  background: var(--color-success);
  border-color: var(--color-success);
}

.wizard__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xl);
}

.wizard__footer {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) var(--spacing-xl);
  border-top: 1px solid var(--color-border-muted);
}

.wizard__footer-spacer {
  flex: 1;
}

.wizard__error {
  padding: var(--spacing-sm) var(--spacing-xl);
  font-size: var(--font-size-sm);
  color: var(--color-error);
  background: var(--color-error-dim);
  border-top: 1px solid var(--color-error);
}

/* Step content */
.wizard-step {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.wizard-step__heading {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

/* Template grid */
.wizard-templates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.wizard-template {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-lg);
  background: var(--color-bg-content);
  border: 2px solid var(--color-border-muted);
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-ui);
  transition: all var(--transition-fast);
}

.wizard-template:hover:not(.wizard-template--disabled) {
  border-color: var(--color-border-default);
  background: var(--color-bg-hover);
}

.wizard-template--selected {
  border-color: var(--color-accent);
  background: var(--color-accent-dim);
}

.wizard-template--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wizard-template__name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.wizard-template__desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.wizard-template__badge {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-style: italic;
}
```

- [ ] **Step 7: Update barrel export**

Add to `frontend/src/components/project/index.ts`:

```typescript
export { NewProjectWizard } from './NewProjectWizard'
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/NewProjectWizard -v`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml
git add frontend/src/components/project/wizardReducer.ts \
  frontend/src/components/project/NewProjectWizard.tsx \
  frontend/src/components/project/NewProjectWizard.css \
  frontend/src/components/project/WizardStepTemplate.tsx \
  frontend/src/components/project/index.ts \
  frontend/src/__tests__/components/project/NewProjectWizard.test.tsx
git commit -m "feat(ui): add NewProjectWizard shell with template selection step (#A.5)"
```

---

### Task 9: NewProjectWizard — Details Step

**Files:**
- Create: `frontend/src/components/project/WizardStepDetails.tsx`
- Modify: `frontend/src/components/project/NewProjectWizard.tsx` (replace step 2 placeholder)
- Modify: `frontend/src/__tests__/components/project/NewProjectWizard.test.tsx` (add step 2 tests)

- [ ] **Step 1: Add step 2 tests**

Add to `frontend/src/__tests__/components/project/NewProjectWizard.test.tsx`:

```tsx
describe('Step 2: Details', () => {
  async function advanceToStep2() {
    const user = userEvent.setup()
    render(<NewProjectWizard {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /reward model/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    return user
  }

  it('shows project name pre-filled from template', async () => {
    await advanceToStep2()

    const nameInput = screen.getByLabelText(/project name/i)
    expect(nameInput).toHaveValue('reward-model-v1')
  })

  it('shows location field with auto-generated path', async () => {
    await advanceToStep2()

    const locationInput = screen.getByLabelText(/location/i)
    expect(locationInput).toHaveValue(expect.stringContaining('reward-model-v1'))
  })

  it('auto-updates location when name changes (before manual edit)', async () => {
    const user = await advanceToStep2()

    const nameInput = screen.getByLabelText(/project name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'my-custom-name')

    const locationInput = screen.getByLabelText(/location/i)
    expect(locationInput).toHaveValue(expect.stringContaining('my-custom-name'))
  })

  it('stops auto-sync after manual location edit', async () => {
    const user = await advanceToStep2()

    const locationInput = screen.getByLabelText(/location/i)
    await user.clear(locationInput)
    await user.type(locationInput, '/custom/path')

    const nameInput = screen.getByLabelText(/project name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'changed-name')

    // Location should NOT have changed
    expect(locationInput).toHaveValue('/custom/path')
  })

  it('shows include starter experiments toggle', async () => {
    await advanceToStep2()

    expect(screen.getByLabelText(/include starter experiments/i)).toBeInTheDocument()
  })

  it('has Back button that returns to step 1', async () => {
    const user = await advanceToStep2()

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByText('What kind of project?')).toBeInTheDocument()
  })

  it('disables Continue when name is empty', async () => {
    const user = await advanceToStep2()

    const nameInput = screen.getByLabelText(/project name/i)
    await user.clear(nameInput)

    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run the test to verify the new tests fail**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/NewProjectWizard -v`

Expected: FAIL — location label not found, toggle not found

- [ ] **Step 3: Create WizardStepDetails**

Create `frontend/src/components/project/WizardStepDetails.tsx`:

```tsx
interface WizardStepDetailsProps {
  projectName: string
  location: string
  seedDemo: boolean
  onNameChange: (name: string) => void
  onLocationChange: (location: string, manual: boolean) => void
  onIncludeStarterChange: (include: boolean) => void
  onBrowseLocation: () => void
}

export function WizardStepDetails({
  projectName,
  location,
  seedDemo,
  onNameChange,
  onLocationChange,
  onIncludeStarterChange,
  onBrowseLocation,
}: WizardStepDetailsProps) {
  return (
    <div className="wizard-step">
      <h2 className="wizard-step__heading">Project details</h2>

      <div className="wizard-field">
        <label htmlFor="wizard-name" className="wizard-field__label">
          Project Name
        </label>
        <input
          id="wizard-name"
          type="text"
          className="input"
          value={projectName}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus
        />
      </div>

      <div className="wizard-field">
        <label htmlFor="wizard-location" className="wizard-field__label">
          Location
        </label>
        <div className="wizard-field__row">
          <input
            id="wizard-location"
            type="text"
            className="input"
            value={location}
            onChange={(e) => onLocationChange(e.target.value, true)}
          />
          <button
            className="button button--secondary button--md"
            onClick={onBrowseLocation}
            type="button"
          >
            Browse...
          </button>
        </div>
      </div>

      <div className="wizard-field wizard-field--toggle">
        <label className="wizard-toggle">
          <input
            type="checkbox"
            checked={seedDemo}
            onChange={(e) => onIncludeStarterChange(e.target.checked)}
            aria-label="Include starter experiments"
          />
          <span className="wizard-toggle__label">Include starter experiments</span>
          <span className="wizard-toggle__desc">
            Populates charts with sample training runs matching your project type.
          </span>
        </label>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire WizardStepDetails into NewProjectWizard**

Replace the step 2 placeholder in `NewProjectWizard.tsx`:

```tsx
import { WizardStepDetails } from './WizardStepDetails'
```

Replace `{state.step === 2 && ...}` block:

```tsx
{state.step === 2 && (
  <WizardStepDetails
    projectName={state.projectName}
    location={state.location}
    seedDemo={state.seedDemo}
    onNameChange={(name) =>
      dispatch({ type: 'SET_PROJECT_NAME', name })
    }
    onLocationChange={(location, manual) =>
      dispatch({ type: 'SET_LOCATION', location, manual })
    }
    onIncludeStarterChange={(include) =>
      dispatch({ type: 'SET_SEED_DEMO', include })
    }
    onBrowseLocation={() => {
      // Will integrate OpenFolderDialog in Task 11
    }}
  />
)}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/NewProjectWizard -v`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml
git add frontend/src/components/project/WizardStepDetails.tsx \
  frontend/src/components/project/NewProjectWizard.tsx \
  frontend/src/__tests__/components/project/NewProjectWizard.test.tsx
git commit -m "feat(ui): add wizard Details step with name, location, starter toggle (#A.5)"
```

---

### Task 10: NewProjectWizard — Review Step + Summary Rail + Create Flow

**Files:**
- Create: `frontend/src/components/project/WizardStepReview.tsx`
- Create: `frontend/src/components/project/WizardSummaryRail.tsx`
- Modify: `frontend/src/components/project/NewProjectWizard.tsx` (replace step 3 placeholder, add rail)
- Modify: `frontend/src/components/project/NewProjectWizard.css` (rail styles)
- Modify: `frontend/src/__tests__/components/project/NewProjectWizard.test.tsx` (add step 3 + create tests)

- [ ] **Step 1: Add step 3 and create-flow tests**

Add to `frontend/src/__tests__/components/project/NewProjectWizard.test.tsx`:

```tsx
import {
  __resetMockState,
  __setCreateProjectError,
} from '../../../__mocks__/wailsjs/go/main/App'

// At the top, after jest.mock:
beforeEach(() => {
  __resetMockState()
  __setCreateProjectError(null)
})

describe('Step 3: Review & Create', () => {
  async function advanceToStep3() {
    const user = userEvent.setup()
    render(<NewProjectWizard {...defaultProps} />)
    // Step 1: select template
    await user.click(screen.getByRole('button', { name: /reward model/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    // Step 2: accept defaults, continue
    await user.click(screen.getByRole('button', { name: /continue/i }))
    return user
  }

  it('shows summary of all choices', async () => {
    await advanceToStep3()

    expect(screen.getByText('Reward Model')).toBeInTheDocument()
    expect(screen.getByText('reward-model-v1')).toBeInTheDocument()
  })

  it('calls CreateProject on create and closes on success', async () => {
    const user = await advanceToStep3()

    await user.click(screen.getByRole('button', { name: /create project/i }))

    expect(defaultProps.onCreated).toHaveBeenCalledTimes(1)
  })

  it('shows inline error on create failure', async () => {
    __setCreateProjectError(new Error('Directory already exists'))

    const user = await advanceToStep3()
    await user.click(screen.getByRole('button', { name: /create project/i }))

    expect(await screen.findByText(/directory already exists/i)).toBeInTheDocument()
    // Wizard should still be open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // onCreated should NOT have been called
    expect(defaultProps.onCreated).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify the new tests fail**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/NewProjectWizard -v --testNamePattern="Step 3"`

Expected: FAIL — summary content not found, or test infrastructure issues

- [ ] **Step 3: Create WizardStepReview**

Create `frontend/src/components/project/WizardStepReview.tsx`:

```tsx
import type { TemplateId } from './wizardReducer'

const TEMPLATE_LABELS: Record<TemplateId, string> = {
  'reward-model': 'Reward Model',
  blank: 'Blank',
}

interface WizardStepReviewProps {
  template: TemplateId
  projectName: string
  location: string
  seedDemo: boolean
}

export function WizardStepReview({
  template,
  projectName,
  location,
  seedDemo,
}: WizardStepReviewProps) {
  return (
    <div className="wizard-step">
      <h2 className="wizard-step__heading">Review &amp; Create</h2>

      <dl className="wizard-review">
        <div className="wizard-review__row">
          <dt className="wizard-review__label">Template</dt>
          <dd className="wizard-review__value">{TEMPLATE_LABELS[template]}</dd>
        </div>
        <div className="wizard-review__row">
          <dt className="wizard-review__label">Project Name</dt>
          <dd className="wizard-review__value">{projectName}</dd>
        </div>
        <div className="wizard-review__row">
          <dt className="wizard-review__label">Location</dt>
          <dd className="wizard-review__value wizard-review__value--mono">
            {location}
          </dd>
        </div>
        <div className="wizard-review__row">
          <dt className="wizard-review__label">Starter Experiments</dt>
          <dd className="wizard-review__value">
            {seedDemo ? 'Yes' : 'No'}
          </dd>
        </div>
      </dl>
    </div>
  )
}
```

- [ ] **Step 4: Create WizardSummaryRail**

Create `frontend/src/components/project/WizardSummaryRail.tsx`:

```tsx
import type { TemplateId } from './wizardReducer'

const TEMPLATE_LABELS: Record<TemplateId, string> = {
  'reward-model': 'Reward Model',
  blank: 'Blank',
}

interface WizardSummaryRailProps {
  template: TemplateId | null
  projectName: string
  location: string
  seedDemo: boolean
}

export function WizardSummaryRail({
  template,
  projectName,
  location,
  seedDemo,
}: WizardSummaryRailProps) {
  return (
    <aside className="wizard-rail" aria-label="Project summary">
      <h3 className="wizard-rail__title">Summary</h3>

      <div className="wizard-rail__item">
        <span className="wizard-rail__label">Template</span>
        <span className="wizard-rail__value">
          {template ? TEMPLATE_LABELS[template] : '—'}
        </span>
      </div>

      {projectName && (
        <div className="wizard-rail__item">
          <span className="wizard-rail__label">Name</span>
          <span className="wizard-rail__value">{projectName}</span>
        </div>
      )}

      {location && (
        <div className="wizard-rail__item">
          <span className="wizard-rail__label">Path</span>
          <span className="wizard-rail__value wizard-rail__value--mono">
            {location}
          </span>
        </div>
      )}

      <div className="wizard-rail__item">
        <span className="wizard-rail__label">Starter data</span>
        <span className="wizard-rail__value">
          {seedDemo ? 'Yes' : 'No'}
        </span>
      </div>
    </aside>
  )
}
```

- [ ] **Step 5: Wire Review + Rail into NewProjectWizard**

In `frontend/src/components/project/NewProjectWizard.tsx`, add imports:

```tsx
import { WizardStepReview } from './WizardStepReview'
import { WizardSummaryRail } from './WizardSummaryRail'
```

Replace the step 3 placeholder:

```tsx
{state.step === 3 && state.template && (
  <WizardStepReview
    template={state.template}
    projectName={state.projectName}
    location={state.location}
    seedDemo={state.seedDemo}
  />
)}
```

Add the summary rail alongside `wizard__content`. Update the `wizard` div's children to include a two-column layout for content + rail:

```tsx
{/* Main body: content + rail */}
<div className="wizard__body">
  <div className="wizard__content">
    {/* step rendering */}
  </div>
  <WizardSummaryRail
    template={state.template}
    projectName={state.projectName}
    location={state.location}
    seedDemo={state.seedDemo}
  />
</div>
```

Add CSS for the body layout to `NewProjectWizard.css`:

```css
.wizard__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.wizard__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xl);
}

/* Summary Rail */
.wizard-rail {
  width: 200px;
  padding: var(--spacing-xl) var(--spacing-lg);
  border-left: 1px solid var(--color-border-muted);
  background: var(--color-bg-elevated);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  flex-shrink: 0;
}

.wizard-rail__title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  margin: 0;
}

.wizard-rail__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wizard-rail__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.wizard-rail__value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  word-break: break-all;
}

.wizard-rail__value--mono {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
}

/* Review summary */
.wizard-review {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin: 0;
}

.wizard-review__row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wizard-review__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}

.wizard-review__value {
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
}

.wizard-review__value--mono {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
}

/* Wizard field layout */
.wizard-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.wizard-field__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.wizard-field__row {
  display: flex;
  gap: var(--spacing-sm);
}

.wizard-field__row .input {
  flex: 1;
}

.wizard-toggle {
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
}

.wizard-toggle input[type='checkbox'] {
  margin-right: var(--spacing-sm);
}

.wizard-toggle__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.wizard-toggle__desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  padding-left: calc(14px + var(--spacing-sm));
}
```

- [ ] **Step 6: Run all wizard tests to verify they pass**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/NewProjectWizard -v`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml
git add frontend/src/components/project/WizardStepReview.tsx \
  frontend/src/components/project/WizardSummaryRail.tsx \
  frontend/src/components/project/NewProjectWizard.tsx \
  frontend/src/components/project/NewProjectWizard.css \
  frontend/src/__tests__/components/project/NewProjectWizard.test.tsx
git commit -m "feat(ui): add wizard Review step, Summary Rail, and create flow (#A.5)"
```

---

### Task 11: ImportDialog + Open Folder / Open Existing Flows

**Files:**
- Create: `frontend/src/components/project/ImportDialog.tsx`
- Create: `frontend/src/components/project/ImportDialog.css`
- Create: `frontend/src/__tests__/components/project/ImportDialog.test.tsx`
- Modify: `frontend/src/components/layout/AppShell.tsx` (wire open flows)
- Modify: `frontend/src/components/project/index.ts`

- [ ] **Step 1: Write the failing test for ImportDialog**

Create `frontend/src/__tests__/components/project/ImportDialog.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportDialog } from '@components/project'

const defaultProps = {
  folderPath: '/home/user/ml-project',
  folderName: 'ml-project',
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ImportDialog', () => {
  it('renders the folder path context', () => {
    render(<ImportDialog {...defaultProps} />)

    expect(screen.getByText(/flux.yaml/)).toBeInTheDocument()
  })

  it('shows editable project name pre-filled with folder basename', () => {
    render(<ImportDialog {...defaultProps} />)

    expect(screen.getByLabelText(/project name/i)).toHaveValue('ml-project')
  })

  it('shows starter experiments toggle defaulting to off', () => {
    render(<ImportDialog {...defaultProps} />)

    const toggle = screen.getByLabelText(/include starter experiments/i)
    expect(toggle).not.toBeChecked()
  })

  it('calls onConfirm with name and seedDemo on Create & Open', async () => {
    const user = userEvent.setup()
    render(<ImportDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /create & open/i }))
    expect(defaultProps.onConfirm).toHaveBeenCalledWith('ml-project', false)
  })

  it('calls onConfirm with edited name', async () => {
    const user = userEvent.setup()
    render(<ImportDialog {...defaultProps} />)

    const nameInput = screen.getByLabelText(/project name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'custom-name')
    await user.click(screen.getByRole('button', { name: /create & open/i }))

    expect(defaultProps.onConfirm).toHaveBeenCalledWith('custom-name', false)
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<ImportDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/ImportDialog -v`

Expected: FAIL — module not found

- [ ] **Step 3: Create ImportDialog**

Create `frontend/src/components/project/ImportDialog.tsx`:

```tsx
import { useState } from 'react'
import './ImportDialog.css'

interface ImportDialogProps {
  folderPath: string
  folderName: string
  onConfirm: (name: string, seedDemo: boolean) => void
  onCancel: () => void
}

export function ImportDialog({
  folderPath,
  folderName,
  onConfirm,
  onCancel,
}: ImportDialogProps) {
  const [name, setName] = useState(folderName)
  const [seedDemo, setSeedDemo] = useState(false)

  return (
    <div className="import-overlay">
      <div className="import-overlay__backdrop" onClick={onCancel} />
      <div className="import-dialog" role="dialog" aria-label="Import folder">
        <p className="import-dialog__message">
          This folder doesn't have a <code>flux.yaml</code>. Flux will create one.
        </p>

        <div className="import-dialog__field">
          <label htmlFor="import-name" className="import-dialog__label">
            Project Name
          </label>
          <input
            id="import-name"
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <label className="import-dialog__toggle">
          <input
            type="checkbox"
            checked={seedDemo}
            onChange={(e) => setSeedDemo(e.target.checked)}
            aria-label="Include starter experiments"
          />
          <span>Include starter experiments</span>
        </label>

        <div className="import-dialog__actions">
          <button
            className="button button--secondary button--md"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="button button--primary button--md"
            onClick={() => onConfirm(name, seedDemo)}
            disabled={!name.trim()}
          >
            Create &amp; Open
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create ImportDialog CSS**

Create `frontend/src/components/project/ImportDialog.css`:

```css
.import-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
}

.import-overlay__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.import-dialog {
  position: relative;
  width: 400px;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-default);
  border-radius: var(--panel-radius);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.import-dialog__message {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.import-dialog__message code {
  font-family: var(--font-mono);
  background: var(--color-bg-hover);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
}

.import-dialog__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.import-dialog__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.import-dialog__toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  cursor: pointer;
}

.import-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}
```

- [ ] **Step 5: Update barrel export**

Add to `frontend/src/components/project/index.ts`:

```typescript
export { ImportDialog } from './ImportDialog'
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/ImportDialog -v`

Expected: PASS

- [ ] **Step 7: Wire open flows into AppShell**

Update `frontend/src/components/layout/AppShell.tsx` to implement the open-folder and open-existing flows:

Add imports:

```tsx
import {
  OpenProject,
  RemoveRecentProject,
  OpenFolderDialog,
  IsFluxProject,
  OpenFolderAsProject,
} from '../../../wailsjs/go/main/App'
import { NewProjectWizard, ImportDialog } from '../project'
```

Add state for wizard and import dialog:

```tsx
const [showWizard, setShowWizard] = useState(false)
const [importState, setImportState] = useState<{
  path: string
  name: string
} | null>(null)
```

Update handlers:

```tsx
const handleNewProject = useCallback(() => {
  setShowWizard(true)
}, [])

const handleWizardClose = useCallback(() => {
  setShowWizard(false)
}, [])

const handleWizardCreated = useCallback(() => {
  setShowWizard(false)
}, [])

const handleOpenFolder = useCallback(async () => {
  try {
    const dir = await OpenFolderDialog()
    if (!dir) return // user cancelled

    const isFlux = await IsFluxProject(dir)
    if (isFlux) {
      await OpenProject(dir)
    } else {
      const basename = dir.split('/').pop() || dir.split('\\').pop() || 'project'
      setImportState({ path: dir, name: basename })
    }
  } catch (err) {
    console.error('Open folder failed:', err)
  }
}, [])

const handleOpenExisting = useCallback(async () => {
  try {
    const dir = await OpenFolderDialog()
    if (!dir) return // user cancelled

    const isFlux = await IsFluxProject(dir)
    if (isFlux) {
      await OpenProject(dir)
    } else {
      // TODO: Show error toast — for now, log
      console.error('No flux.yaml found in', dir)
    }
  } catch (err) {
    console.error('Open existing failed:', err)
  }
}, [])

const handleImportConfirm = useCallback(
  async (name: string, seedDemo: boolean) => {
    if (!importState) return
    try {
      await OpenFolderAsProject(importState.path, name, seedDemo)
      setImportState(null)
    } catch (err) {
      console.error('Import failed:', err)
    }
  },
  [importState],
)

const handleImportCancel = useCallback(() => {
  setImportState(null)
}, [])
```

Add modals to the AppShell JSX, after the closing `</div>` of `app-shell`:

```tsx
return (
  <>
    <div className="app-shell">
      {/* ... existing content ... */}
    </div>

    {showWizard && (
      <NewProjectWizard
        onClose={handleWizardClose}
        onCreated={handleWizardCreated}
      />
    )}

    {importState && (
      <ImportDialog
        folderPath={importState.path}
        folderName={importState.name}
        onConfirm={handleImportConfirm}
        onCancel={handleImportCancel}
      />
    )}
  </>
)
```

Pass the keyboard shortcut handlers:

```tsx
useKeyboardShortcuts({
  onViewChange: handleViewChange,
  onCommandPalette: handleCommandPalette,
  disabledViews,
  onNewProject: handleNewProject,
  onOpenFolder: handleOpenFolder,
  onOpenExisting: handleOpenExisting,
})
```

- [ ] **Step 8: Run all project tests**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/ImportDialog __tests__/components/project/NewProjectWizard __tests__/components/layout/AppShell -v`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml
git add frontend/src/components/project/ImportDialog.tsx \
  frontend/src/components/project/ImportDialog.css \
  frontend/src/components/project/index.ts \
  frontend/src/components/layout/AppShell.tsx \
  frontend/src/__tests__/components/project/ImportDialog.test.tsx
git commit -m "feat(ui): add ImportDialog and wire open folder/existing flows (#A.5)"
```

---

### Task 12: DegradedModeBanner + NoProjectBanner

**Files:**
- Create: `frontend/src/components/project/DegradedModeBanner.tsx`
- Create: `frontend/src/components/project/DegradedModeBanner.css`
- Create: `frontend/src/components/project/NoProjectBanner.tsx`
- Create: `frontend/src/components/project/NoProjectBanner.css`
- Create: `frontend/src/__tests__/components/project/DegradedModeBanner.test.tsx`
- Create: `frontend/src/__tests__/components/project/NoProjectBanner.test.tsx`
- Modify: `frontend/src/components/project/index.ts`
- Modify: `frontend/src/components/layout/Content.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/components/project/DegradedModeBanner.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DegradedModeBanner } from '@components/project'

describe('DegradedModeBanner', () => {
  it('renders warning message', () => {
    render(<DegradedModeBanner />)

    expect(
      screen.getByText(/flux\.yaml has errors/i),
    ).toBeInTheDocument()
  })

  it('is dismissible', async () => {
    const user = userEvent.setup()
    render(<DegradedModeBanner />)

    const dismiss = screen.getByRole('button', { name: /dismiss/i })
    await user.click(dismiss)

    expect(screen.queryByText(/flux\.yaml has errors/i)).not.toBeInTheDocument()
  })

  it('has role=alert for accessibility', () => {
    render(<DegradedModeBanner />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/DegradedModeBanner -v`

Expected: FAIL — module not found

- [ ] **Step 3: Create DegradedModeBanner**

Create `frontend/src/components/project/DegradedModeBanner.tsx`:

```tsx
import { useState } from 'react'
import './DegradedModeBanner.css'

export function DegradedModeBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="degraded-banner" role="alert">
      <span className="degraded-banner__message">
        <strong>flux.yaml</strong> has errors. Some features are disabled.
      </span>
      <button
        className="degraded-banner__dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Create DegradedModeBanner CSS**

Create `frontend/src/components/project/DegradedModeBanner.css`:

```css
.degraded-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-warning-subtle);
  border-bottom: 1px solid var(--color-warning-dim);
  font-family: var(--font-ui);
  font-size: var(--font-size-sm);
  color: var(--color-warning);
}

.degraded-banner__message strong {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
}

.degraded-banner__dismiss {
  background: none;
  border: none;
  color: var(--color-warning-muted);
  cursor: pointer;
  padding: var(--spacing-xs);
  font-size: var(--font-size-sm);
  line-height: 1;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);
}

.degraded-banner__dismiss:hover {
  color: var(--color-warning);
}
```

- [ ] **Step 5: Update barrel export**

Add to `frontend/src/components/project/index.ts`:

```typescript
export { DegradedModeBanner } from './DegradedModeBanner'
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/DegradedModeBanner -v`

Expected: PASS

- [ ] **Step 7: Wire DegradedModeBanner into Content**

In `frontend/src/components/layout/Content.tsx`, render the banner when degraded and in project mode:

```tsx
import { DegradedModeBanner, NoProjectBanner } from '../project'
```

Wrap the project-mode views:

```tsx
if (appMode === 'project' || appMode === 'no-project-compat') {
  // ... existing switch
  return (
    <>
      {degraded && appMode === 'project' && <DegradedModeBanner />}
      {appMode === 'no-project-compat' && (
        <NoProjectBanner onOpenProject={onOpenExisting} />
      )}
      {viewContent}
    </>
  )
}
```

Note: The `useProjectStore` hook call must be unconditional (React rules of hooks). Move the `degraded` selector to the top of the component alongside the existing props from Task 5:

```tsx
export function Content({
  activeView,
  layout,
  appMode,
  recentProjects,
  onOpenExisting,
  ...rest
}: ContentProps) {
  const degraded = useProjectStore((s) => s.degraded)

  if (appMode === 'welcome') {
    return (
      <WelcomeScreen
        recentProjects={recentProjects}
        {...rest}
      />
    )
  }

  let viewContent: React.ReactNode
  switch (activeView) {
    case 'experiments':
      viewContent = <ExperimentsView layout={layout} />
      break
    case 'compare':
      viewContent = <CompareView layout={layout} />
      break
    case 'data':
      viewContent = <DataView layout={layout} />
      break
    case 'code':
      viewContent = <CodeView layout={layout} />
      break
    default:
      viewContent = <ExperimentsView layout={layout} />
  }

  return (
    <>
      {degraded && appMode === 'project' && <DegradedModeBanner />}
      {appMode === 'no-project-compat' && (
        <NoProjectBanner onOpenProject={onOpenExisting} />
      )}
      {viewContent}
    </>
  )
}
```

- [ ] **Step 8: Write the failing test for NoProjectBanner**

Create `frontend/src/__tests__/components/project/NoProjectBanner.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NoProjectBanner } from '@components/project'

describe('NoProjectBanner', () => {
  it('renders a message about browsing without a project', () => {
    render(<NoProjectBanner onOpenProject={jest.fn()} />)

    expect(screen.getByText(/browsing experiments without a project/i)).toBeInTheDocument()
  })

  it('has an Open Project action', async () => {
    const onOpenProject = jest.fn()
    const { getByRole } = render(<NoProjectBanner onOpenProject={onOpenProject} />)
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()

    await user.click(getByRole('button', { name: /open a project/i }))
    expect(onOpenProject).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 9: Create NoProjectBanner**

Create `frontend/src/components/project/NoProjectBanner.tsx`:

```tsx
import './NoProjectBanner.css'

interface NoProjectBannerProps {
  onOpenProject: () => void
}

export function NoProjectBanner({ onOpenProject }: NoProjectBannerProps) {
  return (
    <div className="no-project-banner" role="status">
      <span className="no-project-banner__message">
        Browsing experiments without a project. Some views are disabled.
      </span>
      <button
        className="no-project-banner__action"
        onClick={onOpenProject}
      >
        Open a project
      </button>
    </div>
  )
}
```

Create `frontend/src/components/project/NoProjectBanner.css`:

```css
.no-project-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--color-accent-dim);
  border-bottom: 1px solid var(--color-border-muted);
  font-family: var(--font-ui);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.no-project-banner__action {
  background: none;
  border: none;
  color: var(--color-accent);
  font-family: var(--font-ui);
  font-size: var(--font-size-sm);
  cursor: pointer;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.no-project-banner__action:hover {
  background: var(--color-bg-hover);
  color: var(--color-accent-bright);
}
```

Update barrel export in `frontend/src/components/project/index.ts`:

```typescript
export { NoProjectBanner } from './NoProjectBanner'
```

- [ ] **Step 10: Run all project tests**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/components/project/DegradedModeBanner __tests__/components/project/NoProjectBanner __tests__/components/layout/Content -v`

Expected: PASS

- [ ] **Step 11: Commit**

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml
git add frontend/src/components/project/DegradedModeBanner.tsx \
  frontend/src/components/project/DegradedModeBanner.css \
  frontend/src/components/project/NoProjectBanner.tsx \
  frontend/src/components/project/NoProjectBanner.css \
  frontend/src/components/project/index.ts \
  frontend/src/components/layout/Content.tsx \
  frontend/src/__tests__/components/project/DegradedModeBanner.test.tsx \
  frontend/src/__tests__/components/project/NoProjectBanner.test.tsx
git commit -m "feat(ui): add DegradedModeBanner and NoProjectBanner (#A.5)"
```

---

### Task 13: Keyboard Shortcuts + Disabled States

**Files:**
- Modify: `frontend/src/__tests__/navigation.test.tsx`
- Modify: `frontend/src/styles/components/layout.css` (disabled tab + activity bar styles)

- [ ] **Step 1: Add disabled-shortcut tests**

Add to `frontend/src/__tests__/navigation.test.tsx`:

```tsx
describe('Keyboard shortcuts in welcome mode', () => {
  it('ignores Cmd+1 when no project is open', () => {
    render(<App />)

    // App starts in welcome mode (no project)
    // Cmd+1 should NOT switch to experiments view
    fireEvent.keyDown(document, { key: '1', metaKey: true })

    expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    expect(screen.queryByTestId('experiments-view')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Add disabled tab/activity bar CSS**

Add to `frontend/src/styles/components/layout.css`:

```css
/* Disabled tab state */
.titlebar__tab--disabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}

/* Disabled activity bar button */
.activity-bar__btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
```

- [ ] **Step 3: Run the navigation tests**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest __tests__/navigation -v`

Expected: Tests should pass (may need adjustments based on AppShell refactor)

- [ ] **Step 4: Commit**

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml
git add frontend/src/__tests__/navigation.test.tsx \
  frontend/src/styles/components/layout.css
git commit -m "feat(ui): add disabled states for tabs, activity bar, and shortcuts (#A.5)"
```

---

### Task 14: Integration + Existing Test Updates

**Files:**
- Modify: `frontend/src/__tests__/components/layout/AppShell.test.tsx`
- Modify: `frontend/src/__tests__/components/layout/Content.test.tsx`
- Modify: `frontend/src/__tests__/components/layout/Header.test.tsx`
- Modify: `frontend/src/__tests__/navigation.test.tsx`

This task is a residual integration sweep only. Each prior task should already have updated directly affected tests and kept its own commit green. No new features — just catch anything missed in the cross-task seams.

- [ ] **Step 1: Update AppShell test mocks**

Update `frontend/src/__tests__/components/layout/AppShell.test.tsx`:

Add the projectStore mock reset and the new mock imports:

```tsx
import { __resetProjectStoreInitialized } from '@stores/projectStore'
import {
  __resetMockState,
  __setCurrentProjectStatus,
} from '../../../__mocks__/wailsjs/go/main/App'
import { __resetListeners } from '../../../__mocks__/wailsjs/runtime/runtime'
import { project } from '../../../__mocks__/wailsjs/go/models'

jest.mock('../../../../wailsjs/go/main/App')
jest.mock('../../../../wailsjs/runtime/runtime')

beforeEach(() => {
  __resetMockState()
  __resetListeners()
  __resetProjectStoreInitialized()
})
```

Update existing tests that expect the experiments view to be immediately visible — they now need a project to be set first. Either:
- Set up a mock project before rendering, OR
- Assert the welcome screen shows instead

For tests that need a project:

```tsx
const proj = new project.Project({
  id: 'p1', name: 'test', path: '/tmp/test',
  createdAt: 1000, updatedAt: 1000,
})
__setCurrentProjectStatus({ project: proj })
```

- [ ] **Step 2: Update Content test**

In `frontend/src/__tests__/components/layout/Content.test.tsx`, the `Content` component now requires `appMode` and callback props. Update the test to pass these:

```tsx
const contentProps = {
  appMode: 'project' as const,
  onNewProject: jest.fn(),
  onOpenFolder: jest.fn(),
  onOpenExisting: jest.fn(),
  onBrowseExperiments: jest.fn(),
  onOpenRecentProject: jest.fn(),
  onRemoveRecentProject: jest.fn(),
}
```

Pass these to `ExperimentsView` wrapper renders:

```tsx
// Note: Content.test.tsx currently tests ExperimentsView directly,
// so it may not need Content-level changes. Verify and update accordingly.
```

- [ ] **Step 3: Update Header test**

In `frontend/src/__tests__/components/layout/Header.test.tsx`, add `disabledViews` to the Header props if any tests break.

- [ ] **Step 4: Update navigation test**

In `frontend/src/__tests__/navigation.test.tsx`, `App` now starts in welcome mode by default (no project). Tests that expect immediate view switching need to set up a mock project first.

Add the project setup:

```tsx
import { __resetMockState, __setCurrentProjectStatus } from '../../__mocks__/wailsjs/go/main/App'
import { __resetListeners } from '../../__mocks__/wailsjs/runtime/runtime'
import { __resetProjectStoreInitialized } from '@stores/projectStore'
import { project } from '../../__mocks__/wailsjs/go/models'

jest.mock('../../../wailsjs/go/main/App')
jest.mock('../../../wailsjs/runtime/runtime')

beforeEach(() => {
  __resetMockState()
  __resetListeners()
  __resetProjectStoreInitialized()

  // Set up a project so the app enters project mode
  const proj = new project.Project({
    id: 'p1', name: 'test', path: '/tmp/test',
    createdAt: 1000, updatedAt: 1000,
  })
  __setCurrentProjectStatus({ project: proj })
})
```

- [ ] **Step 5: Run the full test suite**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml/frontend && npx jest --no-cache 2>&1 | tail -40`

Expected: All tests PASS (except pre-existing act() warnings in 4 suites)

- [ ] **Step 6: Run Go tests too**

Run: `cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml && go test ./... -count=1`

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
cd /Users/keith.struzzieri/projects/flux-ml/github/flux-ml
git add frontend/src/__tests__/
git commit -m "test: update existing tests for AppShell view mode refactor (#A.5)"
```

---

## Test Matrix Coverage

| Spec Requirement | Task |
|---|---|
| Startup with no active project shows welcome screen | Task 4, 5 |
| No welcome-screen flash while project state hydrates | Task 4 |
| projectStore initializes before project-specific panels mount | Task 4 |
| Welcome-screen nav and view shortcuts disabled | Task 4, 13 |
| Recent-project open success and stale-entry failure states | Task 5, 6, 7 |
| Open Existing Project rejects folder without flux.yaml | Task 11 |
| Open Folder imports folder without flux.yaml | Task 11 |
| Import of already-registered path reopens existing project | Task 11 (backend handles via GetByPath) |
| Wizard unsaved-changes confirmation on dismiss | Deferred |
| Wizard path auto-sync stops after manual location edits | Task 9 |
| Wizard empty-name validation before Continue | Task 9 |
| Wizard duplicate-path / invalid-location feedback | Submit-time backend error in Task 10 |
| Create success transitions into active project | Task 10 |
| Create failure keeps wizard open with inline error | Task 10 |
| Degraded project open shows amber switcher + warning banner | Task 7 (amber dot), 12 (banner) |
| Close Project returns to welcome screen | Task 7 (dropdown action), 4 (mode transition) |
| No-project compat mode shows NoProjectBanner | Task 12 |
| Dropdown keyboard navigation (Arrow/Enter/Home/End/Escape) | Task 7 |
| Dropdown auto-focuses first actionable item when opened | Task 7 |

## Intentionally Deferred

| Item | Reason |
|---|---|
| Wizard path "Reset to auto-generated" button | The spec mentions "unless they explicitly reset it" for location auto-sync, but this is edge-case UX that can be added as a follow-up. The core behavior (auto-sync stops on manual edit) is implemented. |
| Full pre-submit filesystem validation (non-writable parent, existing directory) | The current backend create flow surfaces these errors reliably at submit time, but there is no dedicated validation API yet. Ship empty-name validation locally in Phase A.5 and add richer preflight only when the backend exposes it cleanly. |
| Error toast for Open Existing / import failures | Requires a toast notification system that doesn't exist yet. Errors are logged to console; a toast component can be added in a follow-up. |
| Unsaved-changes confirmation on wizard dismiss | Adds complexity for minimal value in a 3-step wizard. Can be added as a refinement. |
