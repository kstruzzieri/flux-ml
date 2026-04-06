# Project UI Design (Phase A.5)

> UI/UX for project creation, opening, switching, and lifecycle management. Builds on the Phase A backend (PR #117) which provides all the necessary Go APIs.

## Context

Phase A delivered the project model backend: `flux.yaml` config, project store, scoped experiments, scaffold templates, local state, and lifecycle API. However, there is no user-facing way to create, open, or manage projects. The app currently shows experiments globally with no project context visible in the UI.

This spec adds the minimum UI surface to make projects usable: a welcome screen, header project switcher, new project wizard, import flow, and degraded mode indicators.

### Existing Backend API (already implemented)

These Wails-bound methods exist and are ready for the frontend to call:

- `CreateProject(name, dir, template, seedDemo)` -- scaffold + register + open
- `OpenProject(dir)` -- open existing flux.yaml, supports degraded mode
- `OpenFolderAsProject(dir, name, seedDemo)` -- import folder, write minimal config
- `CloseProject()` -- clear active project session
- `GetCurrentProject()` -- returns active project or nil
- `GetCurrentProjectStatus()` -- project + config + warnings + degraded flag
- `ListRecentProjects()` -- recent projects list
- `IsFluxProject(dir)` -- checks for flux.yaml
- `GetProjectConfig(dir)` -- reads and returns config

### Existing Frontend State (already implemented)

- `projectStore` (zustand) -- tracks current project, config, degraded state, recent projects
- `experimentStore` -- already refetches on project lifecycle events
- `FilesPanel` -- already shows project context and degraded mode warnings

### New Backend Method Needed

- `OpenFolderDialog() (string, error)` -- wraps Wails `runtime.OpenDirectoryDialog()` so the frontend can trigger the native OS directory picker

## Design

### 1. Welcome Screen

**When:** No project is open (app startup with no recent project auto-open, or after closing a project).

**Where:** Replaces the main content area. The header and activity bar remain visible but the nav tabs (Experiments, Compare, Data, Code) are inactive/hidden since they require a project context.

**Layout:** Two-column, vertically centered in the content area.

**Left column:**
- Flux logo + "Flux" wordmark
- Tagline: "The ML development environment"
- Action buttons (stacked vertically, full-width within column):
  - "New Project..." with Cmd+N shortcut hint -- opens the wizard
  - "Open Folder..." with Cmd+O shortcut hint -- triggers native directory picker
  - "Open Existing Project..." with Cmd+Shift+O shortcut hint -- triggers directory picker, requires flux.yaml

**Right column:**
- "Recent Projects" section header (uppercase, muted)
- List of recent projects, each showing:
  - Folder icon
  - Project name (bold)
  - Shortened path (using ~/ notation)
- Clickable -- opens the project directly via `OpenProject`
- Empty state: "No recent projects" with subtle text

**Keyboard shortcuts:**
- Cmd+N: New Project (opens wizard)
- Cmd+O: Open Folder (triggers directory picker)
- Cmd+Shift+O: Open Existing Project (triggers directory picker, requires flux.yaml)

### 2. Header Project Switcher

**When:** A project is open.

**Where:** Between the Flux logo and the nav tabs in the titlebar.

**Appearance:** A clickable pill/button showing:
- Green status dot (or amber if degraded)
- Current project name
- Chevron/dropdown indicator

**Dropdown menu (on click):**
- "New Project..." with Cmd+N shortcut
- "Open Folder..." with Cmd+O shortcut
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
- Dropdown auto-focuses first item when opened
- Click outside closes the dropdown

### 3. New Project Wizard

**Trigger:** "New Project..." from welcome screen, header dropdown, or Cmd+N.

**Container:** Centered modal overlay with backdrop. Dismissible via Escape or clicking backdrop (with unsaved changes confirmation if inputs have been modified).

**Layout:** Scrolling accordion wizard -- all steps visible on one scrollable page within the modal. Active step is expanded and fully interactive. Completed steps collapse to a one-line summary with an "Edit" link. Upcoming steps are dimmed with placeholder text.

**Sticky header:** Step indicator bar at the top of the modal (Template -> Details -> Create) with:
- Completed steps: green checkmark
- Active step: blue filled circle
- Upcoming steps: gray outlined circle
- Clickable to scroll to any completed or active step

#### Step 1: Template

- Heading: "What kind of project?"
- Template card grid (2-column):
  - **Reward Model** -- icon, name, description ("PPO/DPO training loop, reward components, evaluation scripts"). Selectable.
  - **Blank** -- icon, name, description ("Empty project with src/, configs/, data/"). Selectable.
  - **Classification** -- "Coming soon", disabled/dimmed. Not selectable.
  - **Fine-tuning (SFT)** -- "Coming soon", disabled/dimmed. Not selectable.
- Selecting a template highlights the card (blue border) and auto-advances focus to Step 2 (scroll + expand).
- "Coming soon" cards are visual placeholders that signal future growth. They are not interactive.

**When collapsed (completed):** Shows selected template icon + name in a compact summary row.

#### Step 2: Details

- **Project Name** -- text input, auto-populated based on template (e.g., "reward-model-v1"), editable. Auto-generates the location path as the user types.
- **Location** -- text input showing the full path (e.g., `~/projects/reward-model-v1`), with a "Browse..." button that triggers `OpenFolderDialog` for the parent directory. The project name is appended as a subdirectory.
- **Description** -- optional textarea, placeholder text.
- **Initialize git repository** -- toggle, default on.
- **Include starter experiments** -- toggle, default on. Subtitle: "Populates charts with sample training runs matching your project type."
- "Continue" button advances to Step 3.

**When collapsed (completed):** Shows project name and path in a compact summary row.

#### Step 3: Review & Create

- Summary of all choices:
  - Template: name + icon
  - Name, location, description
  - Options: git init, starter experiments (shown as checkmarks or dimmed)
- "Create Project" button (green, prominent)
- On click: calls `CreateProject(name, dir, template, seedDemo)`, shows a brief loading state, then closes the wizard. The app transitions to the experiments view with the new project active in the header.
- On error: shows the error inline (e.g., "Directory already exists", "Path not writable") without closing the wizard. User can fix and retry.

### 4. Open Folder / Import Flow

**Trigger:** "Open Folder..." from welcome screen, header dropdown, or Cmd+O.

**Step 1:** Native directory picker via `OpenFolderDialog`.

**Step 2 (conditional):**
- **If the selected directory contains `flux.yaml`:** open directly via `OpenProject(dir)`. No additional UI.
- **If the directory does NOT contain `flux.yaml`:** show a small confirmation dialog:
  - "This folder doesn't have a flux.yaml. Flux will create one."
  - Project name field (pre-filled with folder basename, editable)
  - Include starter experiments toggle (default off for import -- the user likely has their own data)
  - "Create & Open" / "Cancel" buttons
  - On confirm: calls `OpenFolderAsProject(dir, name, seedDemo)`

### 5. Open Existing Project Flow

**Trigger:** "Open Existing Project..." from welcome screen or Cmd+Shift+O.

**Behavior:** Native directory picker via `OpenFolderDialog`. The selected directory must contain a `flux.yaml`. If it does, calls `OpenProject(dir)`. If it doesn't, shows an error: "No flux.yaml found in this directory. Use 'Open Folder' to import a directory as a new project."

This is distinct from "Open Folder" because it requires an existing Flux project rather than offering to create one.

### 6. Degraded Mode Indicators

When a project opens with a malformed `flux.yaml`:

- **Header project switcher:** amber dot instead of green
- **FilesPanel:** already shows the parse error and degraded warning (implemented in Phase A)
- **Content area banner:** non-blocking warning bar at the top: "flux.yaml has errors -- some features are disabled." Dismissible. Does not block the user from working.

### 7. Close Project

- Accessible from the header dropdown (below the recent projects list)
- Calls `CloseProject()`
- Returns to the welcome screen
- No confirmation dialog -- closing doesn't delete anything

### 8. Keyboard Shortcuts Summary

| Shortcut | Action | Context |
|----------|--------|---------|
| Cmd+N | New Project wizard | Global |
| Cmd+O | Open Folder (directory picker) | Global |
| Cmd+Shift+O | Open Existing Project (requires flux.yaml) | Global |
| Escape | Close wizard/dropdown/dialog | When open |

## Component Structure

```
WelcomeScreen.tsx          -- two-column landing when no project
ProjectSwitcher.tsx        -- header dropdown component
ProjectSwitcherDropdown.tsx -- dropdown menu content
NewProjectWizard.tsx       -- modal with accordion wizard
  WizardStepTemplate.tsx   -- template selection grid
  WizardStepDetails.tsx    -- name, location, options
  WizardStepReview.tsx     -- summary + create button
ImportDialog.tsx           -- small confirmation for folder import
```

## State Management

The existing `projectStore` handles all project state. New UI components are consumers of this store. The wizard manages its own local form state (via `useState`) and calls the backend APIs on submit -- it does not write to `projectStore` directly. The store updates reactively via the existing project lifecycle events.

## Out of Scope

- File explorer / tree view (Phase B+ with Firn port)
- Command palette (Cmd+K) -- referenced but not implemented in this phase
- Template customization / add-ons (future wizard steps from the spec's 5-step vision)
- Auto-detection of existing project setup during import
- Cross-project experiment comparison
- Project deletion from UI (backend guard exists but no UI trigger needed yet)

## Hi-Fi Mockups

Visual designs will be created during implementation using the frontend-design skill. This spec defines the interaction model, component structure, and behavior. The pixel-perfect styling will follow the existing Flux design system (dark theme, GitHub-inspired tokens, existing panel/header CSS patterns).
