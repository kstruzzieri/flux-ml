# TDD: Issue #25 - Experiment Selection State

## Issue Summary
Complete the selection state flow for the Experiments view. The store already tracks `selectedId` and the list highlights the active card, but the MainPanel doesn't respond to selection changes — it always shows a static welcome banner. This ticket wires the selection through to the main panel and adds auto-select behavior so one experiment is always active when the list is non-empty.

## Acceptance Criteria
- [x] Auto-selects first experiment after `fetchExperiments` when `selectedId` is null
- [x] Does not change `selectedId` if already set and experiment still exists in list
- [x] Auto-selects first remaining experiment if selected experiment is removed from list
- [x] Sets `selectedId` to null when experiment list becomes empty
- [x] MainPanel shows welcome banner when `selectedId` is null
- [x] MainPanel shows experiment name when an experiment is selected
- [x] MainPanel shows status dot with correct status when selected
- [x] MainPanel shows formatted duration when selected
- [x] MainPanel updates display when selection changes to a different experiment
- [x] All existing tests continue to pass

## Rationale
1. **Auto-select** — Users expect one experiment to always be "active" when any exist. Requiring an explicit click after every page load or list refresh is friction. Auto-selecting the first experiment follows the pattern of file explorers and IDEs.
2. **Preserve selection** — If the user has explicitly selected an experiment, a background re-fetch should not clobber that choice. Only auto-select when the current selection is invalid.
3. **Conditional MainPanel** — The welcome banner is useful for empty state, but once experiments exist, the main panel should show experiment details. This is the "everything connected" design principle in action.
4. **Reuse existing components** — `StatusDot`, `formatDuration`, and `ExperimentStatus` already exist. No new UI primitives needed.

## Failing Tests

### Store Auto-Select Tests (4 tests)

#### Test 1: auto-selects first experiment after fetch when selectedId is null
When experiments are fetched and no experiment is selected, the first one should be auto-selected.
```typescript
it('auto-selects first experiment after fetch when selectedId is null', async () => {
  await CreateExperiment('exp-1', '{}')
  await CreateExperiment('exp-2', '{}')

  await act(async () => {
    await useExperimentStore.getState().fetchExperiments()
  })

  const state = useExperimentStore.getState()
  expect(state.selectedId).toBe(state.experiments[0].id)
})
```

#### Test 2: preserves selectedId if experiment still exists in list
A background refresh should not clobber a valid user selection.
```typescript
it('preserves selectedId if experiment still exists in list', async () => {
  const exp = await CreateExperiment('exp-1', '{}')

  useExperimentStore.setState({ selectedId: exp.id })

  await act(async () => {
    await useExperimentStore.getState().fetchExperiments()
  })

  expect(useExperimentStore.getState().selectedId).toBe(exp.id)
})
```

#### Test 3: auto-selects first remaining if selected experiment is removed
If the selected experiment disappears from the list, fall back to the first available.
```typescript
it('auto-selects first remaining if selected experiment is removed', async () => {
  await CreateExperiment('exp-remaining', '{}')

  useExperimentStore.setState({ selectedId: 'deleted-id' })

  await act(async () => {
    await useExperimentStore.getState().fetchExperiments()
  })

  const state = useExperimentStore.getState()
  expect(state.selectedId).toBe(state.experiments[0].id)
})
```

#### Test 4: sets selectedId to null when list becomes empty
When all experiments are deleted, selection should clear.
```typescript
it('sets selectedId to null when list becomes empty', async () => {
  useExperimentStore.setState({ selectedId: 'old-id' })

  await act(async () => {
    await useExperimentStore.getState().fetchExperiments()
  })

  expect(useExperimentStore.getState().selectedId).toBeNull()
})
```

### MainPanel Tests (5 tests)

#### Test 1: shows welcome banner when selectedId is null
```typescript
it('shows welcome banner when selectedId is null', () => {
  useExperimentStore.setState({ selectedId: null, experiments: [] })
  render(<MainPanel />)
  expect(screen.getByText('The ML development environment')).toBeInTheDocument()
})
```

#### Test 2: shows experiment name when selected
```typescript
it('shows experiment name when an experiment is selected', () => {
  // setState with experiment and selectedId
  render(<MainPanel />)
  expect(screen.getByText('ppo-run-42')).toBeInTheDocument()
})
```

#### Test 3: shows status dot with correct status
```typescript
it('shows status dot with correct status when selected', () => {
  // setState with running experiment
  render(<MainPanel />)
  expect(screen.getByRole('img', { name: 'Running' })).toBeInTheDocument()
})
```

#### Test 4: shows formatted duration
```typescript
it('shows formatted duration when selected', () => {
  // setState with completed experiment
  render(<MainPanel />)
  expect(screen.getByText(/\d+[hm]/)).toBeInTheDocument()
})
```

#### Test 5: updates display when selection changes
```typescript
it('updates display when selection changes', () => {
  // Render with exp-1 selected, then change to exp-2
  expect(screen.getByText('exp-2')).toBeInTheDocument()
})
```

## Expected Output
```
PASS  frontend/src/__tests__/stores/experimentStore.test.ts
PASS  frontend/src/__tests__/components/layout/panels/MainPanel.test.tsx
```

## Test Summary

| Suite | Tests | Status |
|-------|-------|--------|
| experimentStore (auto-select) | 4 | pass |
| MainPanel | 5 | pass |
| **Total new** | **9** | **pass** |

## Passing Tests Results
```
Test Suites: 18 passed, 18 total
Tests:       180 passed, 180 total
Snapshots:   0 total
Time:        10.634 s
```

All 180 tests pass including 9 new tests. No regressions. TypeScript compiles cleanly (`tsc --noEmit` exits 0).

## Implementation Summary

### Store changes (`experimentStore.ts`)
- **Auto-select logic** in `fetchExperiments`: after fetching, checks if `selectedId` is null or points to a missing experiment. If so, auto-selects `experiments[0]?.id ?? null`.
- **Narrowed `selectExperiment` signature** from `(id: string | null)` to `(id: string)` — null deselection is no longer needed since the store manages null state internally via auto-select.

### MainPanel changes (`MainPanel.tsx`)
- Subscribes to `selectedId` and `experiments` from the store.
- Derives selected experiment via `experiments.find(e => e.id === selectedId)`.
- **No selection**: renders existing `FluxBanner` welcome (unchanged).
- **With selection**: renders experiment header with `StatusDot`, experiment name (h1), duration via `formatDuration`, and status label. Includes placeholder `experiment-header__dashboard` div for future metric charts.

### CSS changes (`layout.css`)
- Added `.experiment-header` — flex row, align center, gap, border-bottom, 14px/16px padding.
- Added `.experiment-header__info` — flex column for name + meta.
- Added `.experiment-header__name` — 18px semibold h1.
- Added `.experiment-header__meta` — flex row, 12px, secondary color, 16px gap.
- Added `.experiment-header__dashboard` — flex column filling remaining space (placeholder).

### Test changes
- **4 new auto-select tests** in `experimentStore.test.ts`.
- **5 new MainPanel tests** in `MainPanel.test.tsx` (new file).
- **Updated 1 existing test**: replaced `selectExperiment(null)` test with `selectExperiment('def-456')` test to match narrowed type.
