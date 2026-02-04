# TDD: Issue #10 - Navigation Between Views

## Issue Summary
Implement navigation between the main views (Experiments, Compare, Data, Code).

## Acceptance Criteria
- [x] Clicking tabs switches views
- [x] Active tab highlighted
- [x] Keyboard shortcuts (Cmd/Ctrl+1-4) switch views
- [x] Activity bar navigation works
- [x] Full view layouts implemented (Compare, Data, Code)
- [ ] View state preserved (deferred - requires view-specific state to test)

## Rationale
Users need to navigate between different workspaces in the application. The header tabs already exist visually, but clicking them doesn't change the displayed content. Each view should show different content appropriate to its purpose (experiments list, comparison tools, data management, code editor).

## Failing Tests

### Test 1: View switches when clicking header tab
Clicking a different tab in the header should change the active view and display corresponding content.
```typescript
it('switches view when clicking header tab', () => {
  render(<App />)

  // Initially on Experiments view
  expect(screen.getByTestId('experiments-view')).toBeInTheDocument()

  // Click Compare tab
  fireEvent.click(screen.getByRole('button', { name: /compare/i }))

  // Should show Compare view
  expect(screen.getByTestId('compare-view')).toBeInTheDocument()
  expect(screen.queryByTestId('experiments-view')).not.toBeInTheDocument()
})
```

### Test 2: Active tab is highlighted
The currently active view's tab should have the active styling applied.
```typescript
it('highlights active tab', () => {
  render(<App />)

  const experimentsTab = screen.getByRole('button', { name: /experiments/i })
  const compareTab = screen.getByRole('button', { name: /compare/i })

  // Initially Experiments is active
  expect(experimentsTab).toHaveClass('header__nav-item--active')
  expect(compareTab).not.toHaveClass('header__nav-item--active')

  // Click Compare
  fireEvent.click(compareTab)

  // Now Compare is active
  expect(compareTab).toHaveClass('header__nav-item--active')
  expect(experimentsTab).not.toHaveClass('header__nav-item--active')
})
```

### Test 3: View state is preserved when switching
When switching away from a view and back, the view's state should be preserved.
```typescript
it('preserves view state when switching views', () => {
  render(<App />)

  // Interact with Experiments view (e.g., select an experiment)
  // ... setup some state in Experiments view

  // Switch to Compare view
  fireEvent.click(screen.getByRole('button', { name: /compare/i }))

  // Switch back to Experiments view
  fireEvent.click(screen.getByRole('button', { name: /experiments/i }))

  // State should be preserved
  // ... verify state is still there
})
```

### Test 4: Keyboard shortcuts switch views
Users can switch views using keyboard shortcuts (Cmd/Ctrl + 1-4).
```typescript
it('switches views with keyboard shortcuts', () => {
  render(<App />)

  // Press Cmd+2 to go to Compare
  fireEvent.keyDown(document, { key: '2', metaKey: true })

  expect(screen.getByTestId('compare-view')).toBeInTheDocument()

  // Press Cmd+1 to go back to Experiments
  fireEvent.keyDown(document, { key: '1', metaKey: true })

  expect(screen.getByTestId('experiments-view')).toBeInTheDocument()
})
```

## Expected Output
```
FAIL src/__tests__/components/App.test.tsx
  ● App › switches view when clicking header tab
  ● App › highlights active tab
  ● App › preserves view state when switching views
  ● App › switches views with keyboard shortcuts
```

## Test Summary
| Test | Status | Rationale |
|------|--------|-----------|
| Switches view when clicking header tab | ✅ Pass | Core navigation functionality |
| Highlights active tab | ✅ Pass | Visual feedback for current location |
| Switches to all four views | ✅ Pass | Complete navigation coverage |
| Keyboard shortcuts (Cmd+1-4) | ✅ Pass | Power user efficiency |
| Ctrl key support (non-Mac) | ✅ Pass | Cross-platform compatibility |
| Activity bar navigation | ✅ Pass | Alternative navigation path |
| Activity bar highlighting | ✅ Pass | Visual feedback in activity bar |

## Passing Test Results
```
PASS src/__tests__/navigation.test.tsx
  Navigation
    View switching via header tabs
      ✓ switches view when clicking header tab (177 ms)
      ✓ highlights active tab (88 ms)
      ✓ switches to all four views (161 ms)
    Keyboard shortcuts
      ✓ switches to Experiments with Cmd+1 (55 ms)
      ✓ switches to Compare with Cmd+2 (13 ms)
      ✓ switches to Data with Cmd+3 (12 ms)
      ✓ switches to Code with Cmd+4 (12 ms)
      ✓ also works with Ctrl key (for non-Mac) (12 ms)
    Activity bar navigation
      ✓ switches view when clicking activity bar icon (13 ms)
      ✓ highlights active item in activity bar (13 ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

## Implementation Summary

### Files Created
- `frontend/src/components/views/ExperimentsView.tsx` - Experiments view with full layout persistence
- `frontend/src/components/views/CompareView.tsx` - Compare view with experiment selection, charts, metrics table, analysis panel
- `frontend/src/components/views/DataView.tsx` - Data view with datasets, quality stats, data browser, sample inspector
- `frontend/src/components/views/CodeView.tsx` - Code view with file tree and code editor (2-column layout)
- `frontend/src/components/views/index.ts` - View exports
- `frontend/src/hooks/useKeyboardShortcuts.ts` - Keyboard shortcut handler (Cmd/Ctrl+1-4)
- `frontend/src/__tests__/navigation.test.tsx` - Navigation test suite (10 tests)

### Panel Components Created
**Compare View Panels:**
- `ExperimentSelectionPanel.tsx` - Experiment checkboxes with color indicators
- `CompareMainPanel.tsx` - Chart tabs (Loss/Reward/KL/Components) and metrics comparison table
- `AnalysisPanel.tsx` - Reward hack warnings, recommendations, and insights

**Data View Panels:**
- `DatasetsPanel.tsx` - Dataset list with usage indicators (training/validation/test)
- `QualityPanel.tsx` - Quality stats and data quality issues
- `DataBrowserPanel.tsx` - Data table with prompt/chosen/rejected responses and score bars
- `SampleInspectorPanel.tsx` - Detailed sample view with chosen/rejected comparison

**Code View Panels:**
- `FileTreePanel.tsx` - Hierarchical file tree with folder expand/collapse
- `CodeEditorPanel.tsx` - Editor with tabs and line numbers

### Files Modified
- `frontend/src/components/layout/AppShell.tsx` - Added activeView state, useKeyboardShortcuts hook
- `frontend/src/components/layout/Content.tsx` - Render active view based on activeView prop
- `frontend/src/components/layout/ActivityBar.tsx` - Added data-testid attributes for testing
- `frontend/src/components/layout/panels/index.ts` - Export all new panel components
- `frontend/src/hooks/index.ts` - Export useKeyboardShortcuts
- `frontend/src/styles/components/layout.css` - Added styles for all new panels and view-specific layouts

### Key Implementation Details
1. **View state management**: `activeView` state in AppShell, passed to Header, ActivityBar, and Content
2. **View switching**: Three methods - header tabs, activity bar icons, keyboard shortcuts
3. **Content routing**: Switch statement in Content.tsx renders appropriate view component
4. **Keyboard shortcuts**: `useKeyboardShortcuts` hook with Cmd/Ctrl + 1-4 mappings
5. **Layout persistence**: All views use `useLayoutPersistence` hook for panel sizing
6. **View-specific layouts**:
   - **Experiments**: 3-column layout (experiments+files | main | inspector+config)
   - **Compare**: 3-column layout (experiment selection | charts+metrics | analysis)
   - **Data**: 3-column layout (datasets+quality | data browser | sample inspector)
   - **Code**: 2-column layout (file tree | code editor) - no right column

### View Architecture
Each view follows a consistent pattern:
- Uses CSS Grid with CSS custom properties for panel dimensions
- Supports layout persistence via the `useLayoutPersistence` hook
- Includes resizable panels with drag handles
- Has collapsible left, right, and output panels
- Contains appropriate data-testid attributes for testing
