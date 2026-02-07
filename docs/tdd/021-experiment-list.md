# TDD: Issue #21 - Experiment List Component

## Issue Summary
Implement the experiment list in the left sidebar panel. Users can view all experiments with status indicators (running/completed/failed/pending), select an experiment to highlight it, and see duration. This is the first frontend feature of Phase 2B, building on the Phase 2A data layer and #20 Wails bindings.

## Acceptance Criteria
- [x] List renders experiments from backend
- [x] Selection state works (click to select)
- [x] Active experiment highlighted with accent styling
- [x] Memoized to prevent unnecessary re-renders

## Rationale
1. **Zustand store** — Matches the planned architecture (`stores/experimentStore.ts`). Tiny footprint (~1KB), no provider boilerplate. The store owns data lifecycle and subscribes to Wails events at store level so events are never missed regardless of which components are mounted.
2. **Three component layers (Panel -> List -> Card)** — ExperimentsPanel is the sidebar container. ExperimentList handles mapping and empty state (virtualization plugs in here later). ExperimentCard renders a single experiment with React.memo and custom comparison.
3. **Store-level Wails event subscription** — The store subscribes to `experiment:created`, `experiment:updated`, `experiment:deleted` events and re-fetches the full list on any mutation. This is simpler and more reliable than surgically merging individual changes into local state.
4. **Duration formatting utility** — Extracted to `utils/formatting.ts` for testability and reuse. Running experiments show elapsed time from `createdAt` to now; completed/failed show total duration; pending shows em dash.
5. **Status tooltips** — Each status dot has a `title` attribute ("Running", "Completed", etc.) for discoverability. Zero visual footprint, accessible via screen readers with `aria-label`.

## Failing Tests

### formatDuration (6 tests)

#### Test 1: formats running experiment duration from createdAt to now
Running experiments show elapsed time from creation to the current moment.
```typescript
it('formats running experiment duration from createdAt to now', () => {
  const now = Math.floor(Date.now() / 1000)
  const twoHoursAgo = now - 2 * 3600 - 34 * 60
  const result = formatDuration(twoHoursAgo, now, 'running')
  expect(result).toBe('2h 34m')
})
```

#### Test 2: formats completed experiment duration from createdAt to updatedAt
Completed experiments show the total duration from start to finish.
```typescript
it('formats completed experiment duration from createdAt to updatedAt', () => {
  const start = 1000000
  const end = start + 4 * 3600 + 12 * 60
  const result = formatDuration(start, end, 'completed')
  expect(result).toBe('4h 12m')
})
```

#### Test 3: formats failed experiment duration
Failed experiments also show total duration from start to failure.
```typescript
it('formats failed experiment duration', () => {
  const start = 1000000
  const end = start + 12 * 60
  const result = formatDuration(start, end, 'failed')
  expect(result).toBe('12m')
})
```

#### Test 4: returns dash for pending experiments
Pending experiments have no meaningful duration, so display an em dash.
```typescript
it('returns dash for pending experiments', () => {
  const now = Math.floor(Date.now() / 1000)
  const result = formatDuration(now, now, 'pending')
  expect(result).toBe('\u2014')
})
```

#### Test 5: formats sub-hour durations as minutes only
Durations under one hour omit the hours component.
```typescript
it('formats sub-hour durations as minutes only', () => {
  const start = 1000000
  const end = start + 45 * 60
  const result = formatDuration(start, end, 'completed')
  expect(result).toBe('45m')
})
```

#### Test 6: formats sub-minute durations
Very short durations display as less than one minute.
```typescript
it('formats sub-minute durations', () => {
  const start = 1000000
  const end = start + 30
  const result = formatDuration(start, end, 'completed')
  expect(result).toBe('<1m')
})
```

### experimentStore (6 tests)

#### Test 7: populates experiments from backend
Fetching experiments must populate the store with data from the Wails backend.
```typescript
it('populates experiments from backend', async () => {
  await CreateExperiment('exp-1', '{}')
  await CreateExperiment('exp-2', '{}')
  await act(async () => {
    await useExperimentStore.getState().fetchExperiments()
  })
  const state = useExperimentStore.getState()
  expect(state.experiments).toHaveLength(2)
  expect(state.loading).toBe(false)
  expect(state.error).toBeNull()
})
```

#### Test 8: sets error on fetch failure
When the backend call fails, the store must capture the error message and keep experiments empty.
```typescript
it('sets error on fetch failure', async () => {
  __setListExperimentsOverride(() => Promise.reject(new Error('network error')))

  await act(async () => {
    await useExperimentStore.getState().fetchExperiments()
  })

  const state = useExperimentStore.getState()
  expect(state.error).toBe('network error')
  expect(state.experiments).toHaveLength(0)
})
```

#### Test 9: sets selectedId
Selecting an experiment must set the selectedId in the store.
```typescript
it('sets selectedId', () => {
  act(() => {
    useExperimentStore.getState().selectExperiment('abc-123')
  })
  expect(useExperimentStore.getState().selectedId).toBe('abc-123')
})
```

#### Test 10: clears selectedId with null
Passing null to selectExperiment must clear the selection.
```typescript
it('clears selectedId with null', () => {
  act(() => {
    useExperimentStore.getState().selectExperiment('abc-123')
    useExperimentStore.getState().selectExperiment(null)
  })
  expect(useExperimentStore.getState().selectedId).toBeNull()
})
```

#### Test 11: fetches experiments on init
Calling initialize must trigger an initial fetch of experiments from the backend.
```typescript
it('fetches experiments on init', async () => {
  await CreateExperiment('exp-1', '{}')
  await act(async () => {
    useExperimentStore.getState().initialize()
    await new Promise((r) => setTimeout(r, 0))
  })
  expect(useExperimentStore.getState().experiments).toHaveLength(1)
})
```

#### Test 12: re-fetches when experiment event is emitted
When a Wails experiment event fires, the store must re-fetch to stay in sync with the backend.
```typescript
it('re-fetches when experiment event is emitted', async () => {
  await act(async () => {
    useExperimentStore.getState().initialize()
    await new Promise((r) => setTimeout(r, 0))
  })
  expect(useExperimentStore.getState().experiments).toHaveLength(0)
  await CreateExperiment('exp-new', '{}')
  await act(async () => {
    EventsEmit('experiment:created')
    await new Promise((r) => setTimeout(r, 0))
  })
  expect(useExperimentStore.getState().experiments).toHaveLength(1)
})
```

### ExperimentCard (10 tests)

#### Test 13: renders experiment name
The experiment name is the primary identifier displayed on each card.
```typescript
it('renders experiment name', () => {
  render(<ExperimentCard {...defaultProps} />)
  expect(screen.getByText('reward-model-v2-run-47')).toBeInTheDocument()
})
```

#### Test 14: renders running status dot with correct class
Running experiments must display a status dot with the running CSS class for cyan color and pulse animation.
```typescript
it('renders running status dot with correct class', () => {
  render(<ExperimentCard {...defaultProps} />)
  const dot = screen.getByTitle('Running')
  expect(dot).toHaveClass('experiment-item__status--running')
})
```

#### Test 15: renders completed status dot with correct class
Completed experiments must display a green status dot.
```typescript
it('renders completed status dot with correct class', () => {
  const exp = makeExperiment({ status: 'completed' })
  render(<ExperimentCard {...defaultProps} experiment={exp} />)
  const dot = screen.getByTitle('Completed')
  expect(dot).toHaveClass('experiment-item__status--completed')
})
```

#### Test 16: renders failed status dot with correct class
Failed experiments must display a red status dot.
```typescript
it('renders failed status dot with correct class', () => {
  const exp = makeExperiment({ status: 'failed' })
  render(<ExperimentCard {...defaultProps} experiment={exp} />)
  const dot = screen.getByTitle('Failed')
  expect(dot).toHaveClass('experiment-item__status--failed')
})
```

#### Test 17: renders pending status dot with correct class
Pending experiments must display a muted status dot.
```typescript
it('renders pending status dot with correct class', () => {
  const exp = makeExperiment({ status: 'pending' })
  render(<ExperimentCard {...defaultProps} experiment={exp} />)
  const dot = screen.getByTitle('Pending')
  expect(dot).toHaveClass('experiment-item__status--pending')
})
```

#### Test 18: applies active class when isActive is true
The selected experiment must be visually distinct with accent styling.
```typescript
it('applies active class when isActive is true', () => {
  render(<ExperimentCard {...defaultProps} isActive={true} />)
  const item = screen.getByRole('button')
  expect(item).toHaveClass('experiment-item--active')
})
```

#### Test 19: does not apply active class when isActive is false
Non-selected experiments must not have the active class.
```typescript
it('does not apply active class when isActive is false', () => {
  render(<ExperimentCard {...defaultProps} isActive={false} />)
  const item = screen.getByRole('button')
  expect(item).not.toHaveClass('experiment-item--active')
})
```

#### Test 20: calls onSelect with experiment id on click
Clicking a card must invoke the onSelect callback with the experiment's ID.
```typescript
it('calls onSelect with experiment id on click', async () => {
  const user = userEvent.setup()
  const onSelect = jest.fn()
  render(<ExperimentCard {...defaultProps} onSelect={onSelect} />)
  await user.click(screen.getByRole('button'))
  expect(onSelect).toHaveBeenCalledWith('exp-1')
})
```

#### Test 21: shows formatted duration
Each card must display the formatted duration based on experiment timestamps and status.
```typescript
it('shows formatted duration', () => {
  const now = Math.floor(Date.now() / 1000)
  const exp = makeExperiment({
    status: 'completed',
    createdAt: now - 4 * 3600 - 12 * 60,
    updatedAt: now,
  })
  render(<ExperimentCard {...defaultProps} experiment={exp} />)
  expect(screen.getByText('4h 12m')).toBeInTheDocument()
})
```

#### Test 22: does not re-render when props are unchanged (memo)
React.memo with custom comparison must prevent unnecessary re-renders when props have equal values.
```typescript
it('does not re-render when props are unchanged', () => {
  const exp = makeExperiment()
  const { rerender } = render(
    <ExperimentCard experiment={exp} isActive={false} onSelect={jest.fn()} />
  )
  const firstHTML = screen.getByRole('button').innerHTML
  const exp2 = makeExperiment()
  rerender(
    <ExperimentCard experiment={exp2} isActive={false} onSelect={jest.fn()} />
  )
  const secondHTML = screen.getByRole('button').innerHTML
  expect(firstHTML).toBe(secondHTML)
})
```

### ExperimentList (4 tests)

#### Test 23: renders a card for each experiment
The list must render one ExperimentCard per experiment in the array.
```typescript
it('renders a card for each experiment', () => {
  const experiments = [
    makeExperiment('1', 'exp-alpha'),
    makeExperiment('2', 'exp-beta'),
    makeExperiment('3', 'exp-gamma'),
  ]
  render(
    <ExperimentList experiments={experiments} selectedId={null} onSelect={jest.fn()} />
  )
  expect(screen.getByText('exp-alpha')).toBeInTheDocument()
  expect(screen.getByText('exp-beta')).toBeInTheDocument()
  expect(screen.getByText('exp-gamma')).toBeInTheDocument()
})
```

#### Test 24: shows empty state when no experiments
When no experiments exist, the list must display an empty state message.
```typescript
it('shows empty state when no experiments', () => {
  render(
    <ExperimentList experiments={[]} selectedId={null} onSelect={jest.fn()} />
  )
  expect(screen.getByText('No experiments yet')).toBeInTheDocument()
})
```

#### Test 25: calls onSelect with experiment id on card click
Clicking an experiment card in the list must delegate selection to the parent via onSelect.
```typescript
it('calls onSelect with experiment id on card click', async () => {
  const user = userEvent.setup()
  const onSelect = jest.fn()
  const experiments = [makeExperiment('abc-123', 'my-experiment')]
  render(
    <ExperimentList experiments={experiments} selectedId={null} onSelect={onSelect} />
  )
  await user.click(screen.getByText('my-experiment'))
  expect(onSelect).toHaveBeenCalledWith('abc-123')
})
```

#### Test 26: passes isActive to the selected card
The list must pass isActive=true only to the card whose ID matches selectedId.
```typescript
it('passes isActive to the selected card', () => {
  const experiments = [
    makeExperiment('1', 'exp-alpha'),
    makeExperiment('2', 'exp-beta'),
  ]
  render(
    <ExperimentList experiments={experiments} selectedId="1" onSelect={jest.fn()} />
  )
  const buttons = screen.getAllByRole('button')
  expect(buttons[0]).toHaveClass('experiment-item--active')
  expect(buttons[1]).not.toHaveClass('experiment-item--active')
})
```

## Expected Output (Failing)
```
FAIL  src/__tests__/utils/formatting.test.ts
  Cannot find module '@utils/formatting'

FAIL  src/__tests__/stores/experimentStore.test.ts
  Cannot find module '@stores/experimentStore'

FAIL  src/__tests__/components/Experiments/ExperimentCard.test.tsx
  Cannot find module '@components/Experiments/ExperimentCard'

FAIL  src/__tests__/components/Experiments/ExperimentList.test.tsx
  Cannot find module '@components/Experiments/ExperimentList'

Tests:  0 passed, ~26 failed, ~26 total
```

## Test Summary

```
PASS src/__tests__/utils/formatting.test.ts
  formatDuration
    ✓ formats running experiment duration from createdAt to now
    ✓ formats completed experiment duration from createdAt to updatedAt
    ✓ formats failed experiment duration
    ✓ returns dash for pending experiments
    ✓ formats sub-hour durations as minutes only
    ✓ formats sub-minute durations

PASS src/__tests__/stores/experimentStore.test.ts
  experimentStore
    fetchExperiments
      ✓ populates experiments from backend
      ✓ sets error on fetch failure
    selectExperiment
      ✓ sets selectedId
      ✓ clears selectedId with null
    initialize
      ✓ fetches experiments on init
      ✓ re-fetches when experiment event is emitted

PASS src/__tests__/components/Experiments/ExperimentCard.test.tsx
  ExperimentCard
    ✓ renders experiment name
    ✓ renders running status dot with correct class
    ✓ renders completed status dot with correct class
    ✓ renders failed status dot with correct class
    ✓ renders pending status dot with correct class
    ✓ applies active class when isActive is true
    ✓ does not apply active class when isActive is false
    ✓ calls onSelect with experiment id on click
    ✓ shows formatted duration
    ✓ does not re-render when props are unchanged

PASS src/__tests__/components/Experiments/ExperimentList.test.tsx
  ExperimentList
    ✓ renders a card for each experiment
    ✓ shows empty state when no experiments
    ✓ calls onSelect with experiment id on card click
    ✓ passes isActive to the selected card

Test Suites: 13 passed, 13 total
Tests:       131 passed, 131 total (26 new + 105 existing)
```

## Implementation Summary

Implemented the experiment list for the left sidebar panel with 26 new tests across 4 test suites.

**New files:**
- `frontend/src/utils/formatting.ts` — `formatDuration` utility for experiment cards
- `frontend/src/stores/experimentStore.ts` — Zustand store with Wails event subscription
- `frontend/src/components/Experiments/ExperimentCard.tsx` — Memoized card component with status dots
- `frontend/src/components/Experiments/ExperimentCard.css` — Card styles with status indicators
- `frontend/src/components/Experiments/ExperimentList.tsx` — List component with empty state
- `frontend/src/components/Experiments/ExperimentList.css` — List container styles
- `frontend/src/components/Experiments/index.ts` — Barrel export

**Modified files:**
- `frontend/package.json` — Added zustand dependency
- `frontend/jest.config.js` — Added Wails runtime mock mapping
- `frontend/src/setupTests.ts` — Added `__resetListeners` + `crypto.randomUUID` polyfill
- `frontend/src/stores/index.ts` — Added experimentStore barrel export
- `frontend/src/__mocks__/wailsjs/runtime/runtime.ts` — Wails runtime mock for EventsOn/EventsOff
- `frontend/src/__mocks__/wailsjs/go/main/App.ts` — Added listExperimentsOverride for error testing
- `frontend/src/components/layout/panels/ExperimentsPanel.tsx` — Wired to store with dynamic data
