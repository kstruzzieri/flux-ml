# Project UI Design (Phase A.5)

> UI/UX for project creation, opening, switching, and lifecycle management. Builds on the Phase A backend (PR #117) which provides the project model and lifecycle APIs.

## Context

Phase A delivered the project model backend: `flux.yaml` config, project store, scoped experiments, scaffold templates, local state, and lifecycle API. However, there is no user-facing way to create, open, or manage projects. The app still behaves like a mostly global dashboard with very little project context visible in the shell.

This spec adds the minimum UI surface to make projects usable: a welcome screen, header project switcher, new project wizard, import flow, and degraded mode indicators.

Phase A.5 also preserves a compatibility path for existing no-project data access. The welcome screen becomes the default no-project landing state, but it does not retire the current no-project experiments mode yet. Existing data must remain reachable until a dedicated unscoped claim flow ships.

### Existing Backend API (already implemented)

These Wails-bound methods exist and are ready for the frontend to call:

- `CreateProject(name, dir, template, seedDemo)` -- scaffold + register + open
- `OpenProject(dir)` -- open existing `flux.yaml`, supports degraded mode
- `OpenFolderAsProject(dir, name, seedDemo)` -- import folder, write minimal config
- `CloseProject()` -- clear active project session
- `GetCurrentProject()` -- returns active project or nil
- `GetCurrentProjectStatus()` -- project + config + warnings + degraded flag
- `ListRecentProjects()` -- recent projects list
- `ListExperiments()` -- returns active project experiments when a project is open, otherwise returns the current global list
- `ListUnscopedExperiments()` -- explicit unscoped list for future claim UI
- `ClaimExperimentToCurrentProject(experimentID)` -- explicit claim flow for future UI
- `IsFluxProject(dir)` -- checks for `flux.yaml`
- `GetProjectConfig(dir)` -- reads and returns config

### Existing Frontend State (already implemented)

- `projectStore` (zustand) -- tracks current project, config, degraded state, recent projects
- `experimentStore` -- already refetches on project lifecycle events
- `FilesPanel` -- already shows project context and degraded mode warnings

### New Backend Methods Needed

- `OpenFolderDialog() (string, error)` -- wraps Wails `runtime.OpenDirectoryDialog()` so the frontend can trigger the native OS directory picker
- `RemoveRecentProject(dir) error` -- removes a stale recent-project entry after the user confirms cleanup

## Design

### 1. Welcome Screen

**When:** No project is open on startup, or after `CloseProject()`.

**Where:** Replaces the main content area by default. The header and activity bar remain visible so project-management actions stay anchored in the shell.

**No-project navigation behavior:**

- While the welcome screen is visible, the titlebar nav tabs, activity bar view buttons, and `Cmd/Ctrl+1..4` view shortcuts are disabled.
- The welcome screen is the default no-project state, not a hard removal of no-project browsing.
- A secondary "Browse Existing Experiments" action is available for compatibility. It opens the existing Experiments view in no-project mode.
- In no-project experiments mode, only the Experiments view is enabled until a project is opened. Compare, Data, and Code remain disabled because they require project context.

**Layout:** Two-column, vertically centered in the content area.

**Left column:**

- Flux logo + "Flux" wordmark
- Tagline: "The ML development environment"
- Action buttons (stacked vertically, full-width within column):
  - "New Project..." with `Cmd/Ctrl+N` shortcut hint -- opens the wizard
  - "Open Folder..." with `Cmd/Ctrl+O` shortcut hint -- triggers native directory picker
  - "Open Existing Project..." with `Cmd/Ctrl+Shift+O` shortcut hint -- triggers directory picker, requires `flux.yaml`
- Secondary text action:
  - "Browse Existing Experiments" -- opens the compatibility no-project experiments view

**Right column:**

- "Recent Projects" section header (uppercase, muted)
- List of recent projects, each showing:
  - Folder icon
  - Project name (bold)
  - Shortened path (using `~/` notation)
- Click row to open directly via `OpenProject(path)`
- Empty state: "No recent projects" with subtle text

**Stale recent-project behavior:**

- If opening a recent project fails because the path no longer exists or `flux.yaml` is gone, the row enters an inline error state instead of failing silently.
- The row shows a short message such as "Project not found" or "No flux.yaml found".
- The row exposes "Remove from list" which calls `RemoveRecentProject(path)`.
- A toast also explains that the project could not be opened.

**Keyboard shortcuts:**

- `Cmd/Ctrl+N`: New Project
- `Cmd/Ctrl+O`: Open Folder
- `Cmd/Ctrl+Shift+O`: Open Existing Project

### 2. Header Project Switcher

**When:** A project is open.

**Where:** Between the Flux logo and the nav tabs in the titlebar.

**Appearance:** A clickable pill/button showing:

- Green status dot (or amber if degraded)
- Current project name
- Chevron/dropdown indicator

**Dropdown menu (on click):**

- "New Project..." with `Cmd/Ctrl+N` shortcut
- "Open Folder..." with `Cmd/Ctrl+O` shortcut
- "Open Existing Project..." with `Cmd/Ctrl+Shift+O` shortcut
- Divider
- "Recent Projects" section header (uppercase, muted)
- Recent project list (filtered to exclude the currently open project)
  - Folder icon + project name per row
  - Clickable to switch projects
- Divider
- "Close Project" action

**Keyboard navigation:**

- Arrow Up/Down to navigate items
- Enter to select
- Escape to close
- Home/End for first/last item

**Behavior:**

- Switching projects calls `OpenProject` on the selected path
- Closing project calls `CloseProject` and returns to the welcome screen
- Dropdown auto-focuses the first actionable item when opened
- Click outside closes the dropdown
- Recent project rows use the same stale-entry handling as the welcome screen

### 3. New Project Wizard

**Trigger:** "New Project..." from welcome screen, header dropdown, or `Cmd/Ctrl+N`.

**Container:** Centered modal overlay with backdrop. Dismissible via Escape or clicking backdrop, with unsaved-changes confirmation if the user has modified any field.

**Layout:** Hybrid stepped modal, not a fully interactive scrolling accordion.

- One step is editable at a time in the main pane.
- Completed steps remain visible above the active pane as compact summary cards with an "Edit" affordance.
- A sticky summary rail on the right shows the current template, resolved project path, and starter-experiment choice.
- On narrower widths or shorter heights, the summary rail collapses into a sticky footer summary.

This preserves before/after context so the user can see what they already chose and what will be created, without the higher interaction complexity of a fully scrollable accordion with multiple expand/collapse states.

**Sticky header:** Step indicator bar at the top of the modal (`Template -> Details -> Review`) with:

- Completed steps: green checkmark
- Active step: blue filled circle
- Upcoming steps: gray outlined circle
- Clickable navigation to any completed step and the current active step

**Cross-step behavior:**

- Upstream edits immediately recompute downstream summaries.
- If the user has not manually edited the location field, project-name changes continue to update the generated path.
- Once the user manually edits the location field, auto-sync stops for the rest of the wizard session unless they explicitly reset it.

#### Step 1: Template

- Heading: "What kind of project?"
- Template card grid (2-column):
  - **Reward Model** -- icon, name, description ("PPO/DPO training loop, reward components, evaluation scripts"). Selectable.
  - **Blank** -- icon, name, description ("Empty project with `src/`, `configs/`, `data/`"). Selectable.
  - **Classification** -- "Coming soon", disabled/dimmed. Not selectable.
  - **Fine-tuning (SFT)** -- "Coming soon", disabled/dimmed. Not selectable.
- Selecting a template highlights the card and enables the Continue action.
- "Coming soon" cards are visual placeholders that signal future growth. They are not interactive.

**Completed summary card:** Selected template icon + name.

#### Step 2: Details

- **Project Name** -- text input, auto-populated from the selected template (for example `reward-model-v1`), editable
- **Location** -- path input showing the full project directory, with a "Browse..." button that triggers `OpenFolderDialog` for the parent directory
- **Include starter experiments** -- toggle, default on. Subtitle: "Populates charts with sample training runs matching your project type."
- "Back" and "Continue" buttons

**Validation and path rules:**

- The displayed project name is not forcibly slugified.
- The generated directory segment should be sanitized for filesystem safety when deriving the default path.
- The default parent directory is the last successfully used project parent in this UI session when available; otherwise fall back to the user's home directory.
- Inline validation covers empty name, invalid path, non-writable parent, and an existing target directory.

**Explicitly deferred from Phase A.5:**

- Project description field
- Git initialization toggle

Those controls are omitted from this wizard because the current backend create flow does not persist them yet.

**Completed summary card:** Project name, resolved path, and starter-experiments choice.

#### Step 3: Review & Create

- Summary of all choices:
  - Template: name + icon
  - Project name
  - Final location
  - Starter experiments choice
- "Create Project" button (green, prominent)
- On click:
  - call `CreateProject(name, dir, template, seedDemo)`
  - show a loading state on the primary action
  - keep the modal open while the request is pending
  - close the wizard only on success
- On success:
  - the app transitions to the Experiments view with the new project active in the header
- On error:
  - show the error inline without closing the wizard
  - preserve all form state so the user can fix and retry

### 4. Open Folder / Import Flow

**Trigger:** "Open Folder..." from welcome screen, header dropdown, or `Cmd/Ctrl+O`.

**Step 1:** Native directory picker via `OpenFolderDialog`.

**Step 2 (conditional):**

- **If the selected directory contains `flux.yaml`:** open directly via `OpenProject(dir)`. No additional UI.
- **If the directory does NOT contain `flux.yaml`:** show a small confirmation dialog:
  - Message: "This folder doesn't have a `flux.yaml`. Flux will create one."
  - Project name field (pre-filled with the folder basename, editable)
  - Include starter experiments toggle (default off for import because the user likely has their own data)
  - "Create & Open" / "Cancel" buttons
  - On confirm: call `OpenFolderAsProject(dir, name, seedDemo)`

**Import semantics:**

- If the selected directory was already registered previously, Flux reopens the existing project record for that path.
- In that case, the editable name field is used only for newly registered imports; it does not silently rename an existing project registration.
- Cancel leaves the folder untouched and writes no `flux.yaml`.

### 5. Open Existing Project Flow

**Trigger:** "Open Existing Project..." from the welcome screen, header dropdown, or `Cmd/Ctrl+Shift+O`.

**Behavior:** Native directory picker via `OpenFolderDialog`. The selected directory must contain a `flux.yaml`. If it does, call `OpenProject(dir)`. If it does not, show an error:

> No `flux.yaml` found in this directory. Use "Open Folder" to import a directory as a new project.

This is distinct from "Open Folder" because it requires an existing Flux project rather than offering to create one.

### 6. Degraded Mode Indicators

When a project opens with a malformed `flux.yaml`:

- **Header project switcher:** amber dot instead of green
- **FilesPanel:** already shows the parse error and degraded warning (implemented in Phase A)
- **Content area banner:** non-blocking warning bar at the top:
  - "`flux.yaml` has errors. Some features are disabled."
  - dismissible for the current session
  - does not block the user from working

### 7. Close Project

- Accessible from the header dropdown
- Calls `CloseProject()`
- Returns to the welcome screen
- Does not delete or mutate any project data
- No confirmation dialog because closing is non-destructive

### 8. Keyboard Shortcuts Summary

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd/Ctrl+N` | New Project wizard | Global |
| `Cmd/Ctrl+O` | Open Folder (directory picker) | Global |
| `Cmd/Ctrl+Shift+O` | Open Existing Project (requires `flux.yaml`) | Global |
| `Cmd/Ctrl+1..4` | Switch views | Only when the target view is enabled |
| `Escape` | Close wizard/dropdown/dialog | When open |

### 9. Interaction Rules And Edge Cases

- The welcome screen is the default no-project landing surface, but the current no-project experiments view remains reachable through an explicit compatibility action.
- If the user changes the template after entering details, the wizard recomputes suggested defaults but preserves manually edited values where possible.
- If `CreateProject` fails because the directory already exists, the error is shown inline in Step 3 and the user stays in the wizard.
- If `OpenProject` fails from a recent-project entry, the failure is surfaced inline on that row and the user can remove the stale entry.
- Importing a folder does not attempt heuristic project detection in Phase A.5. Flux either opens `flux.yaml` or offers to write a minimal one.
- The welcome screen and no-project mode should never look like broken navigation states. Disabled tabs and buttons should be visibly disabled, not hidden at random.

## Component Structure

```text
WelcomeScreen.tsx             -- default landing surface when no project is open
RecentProjectsList.tsx        -- reusable recent-project list with stale-entry states
ProjectSwitcher.tsx           -- header dropdown trigger
ProjectSwitcherDropdown.tsx   -- dropdown menu content
NewProjectWizard.tsx          -- hybrid stepped modal
  WizardStepTemplate.tsx      -- template selection grid
  WizardStepDetails.tsx       -- name, location, starter experiments
  WizardStepReview.tsx        -- final summary + create button
  WizardSummaryRail.tsx       -- sticky cross-step summary
ImportDialog.tsx              -- confirmation for folder import
NoProjectBanner.tsx           -- banner for compatibility no-project experiments mode
```

## State Management

The existing `projectStore` remains the source of truth for current project status, degraded state, config warnings, and recent projects.

Required shell-level behavior:

- `projectStore.initialize()` must run in `AppShell` startup, not inside a project-specific panel.
- This ensures the shell can render the welcome screen, current project session, and recent-project list before any project view mounts.
- View-state logic in the shell decides between:
  - welcome screen
  - compatibility no-project experiments mode
  - normal project-scoped views

The wizard manages its own local form state and calls backend APIs on submit. It does not write to `projectStore` directly; the store updates via the existing project lifecycle events.

## Test Matrix

Implementation planning should cover at least these cases:

- Startup with no active project shows the welcome screen
- `projectStore` initializes before any project-specific panels mount
- Welcome-screen nav and view shortcuts are disabled until a project or compatibility no-project mode is chosen
- Recent-project open success and stale-entry failure states
- Open Existing Project rejects a folder without `flux.yaml`
- Open Folder imports a folder without `flux.yaml`
- Import of an already-registered path reopens the existing project without silently renaming it
- Wizard unsaved-changes confirmation on dismiss
- Wizard path auto-sync stops after manual location edits
- Wizard inline validation for duplicate path and invalid location
- Create success transitions into the active project
- Create failure keeps the wizard open with inline error
- Degraded project open shows amber switcher status plus warning banner
- Close Project returns to the welcome screen

## Out of Scope

- File explorer / tree view (Phase B+ with Firn port)
- Command palette (`Cmd/Ctrl+K`) -- referenced but not implemented in this phase
- Template customization / add-ons (future wizard steps from the spec's 5-step vision)
- Auto-detection of existing project setup during import
- Dedicated unscoped-claim UI (backend methods exist, but compatibility no-project browsing is sufficient for Phase A.5)
- Cross-project experiment comparison
- Project deletion from UI (backend guard exists but no UI trigger needed yet)
- Project description editing during creation
- Git repository initialization during creation

## Hi-Fi Mockups

Visual designs will be created during implementation. This spec defines the interaction model, component structure, and behavior. The pixel-perfect styling should follow the existing Flux design system (dark theme, GitHub-inspired tokens, existing panel/header CSS patterns).
