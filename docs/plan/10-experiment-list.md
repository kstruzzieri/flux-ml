# Experiment List Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

This document covers the experiment list component for the left sidebar panel. This corresponds to issue #21 in the roadmap (Phase 2B: Experiment List).

**Goal:** Implement the experiment list in the left sidebar with status indicators, selection state, and memoization.

**Architecture:** Zustand store fetches experiments from the Wails backend and subscribes to mutation events for live updates. Three component layers (ExperimentsPanel -> ExperimentList -> ExperimentCard) with React.memo on the card. Duration formatting utility computes elapsed time from timestamps.

**Tech Stack:** React 18, TypeScript, Zustand, Wails runtime events, Jest + React Testing Library

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Zustand | Matches planned architecture, tiny footprint, no provider boilerplate |
| Event sync | Store-level Wails subscription | Store owns data lifecycle, events never missed regardless of mounted components |
| Component layers | Panel → List → Card | Three layers: container, list (virtualization-ready), item (memoized) |
| Duration display | Static computation | Computes from timestamps on render; live ticking is a polish concern |
| Status legend | Tooltip on hover | Zero visual footprint, accessible via `title` + `aria-label` |
| CSS class names | Match mockup | `experiment-item`, `experiment-item__row`, etc. from v2 mockup |

## New Dependency

- `zustand` — state management (~1KB, establishes pattern for metricsStore, alertStore)

## Store: `experimentStore.ts`

```typescript
interface ExperimentState {
  experiments: Experiment[]
  selectedId: string | null
  loading: boolean
  error: string | null

  fetchExperiments: () => Promise<void>
  selectExperiment: (id: string | null) => void
  initialize: () => void
}
```

- `fetchExperiments()` calls `ListExperiments()` from Wails bindings
- `selectExperiment(id)` sets `selectedId`
- `initialize()` fetches experiments + subscribes to Wails events (`experiment:created`, `experiment:updated`, `experiment:deleted`) — on any event, re-fetches full list

## Components

### ExperimentsPanel (updated)

Location: `components/layout/panels/ExperimentsPanel.tsx` (existing)

- Connects to `useExperimentStore`
- Calls `initialize()` on mount
- Renders dynamic experiment count in header badge
- Renders `<ExperimentList>` in content area

### ExperimentList (new)

Location: `components/Experiments/ExperimentList.tsx`

Props: `experiments`, `selectedId`, `onSelect`

- Maps experiments to `<ExperimentCard>`
- Empty state: "No experiments yet" placeholder
- Virtualization plugs in here later

### ExperimentCard (new)

Location: `components/Experiments/ExperimentCard.tsx`

Props: `experiment`, `isActive`, `onSelect`

Renders per mockup:
- Status dot (colored per status, pulsing for running via existing `pulse` animation)
- Status tooltip (`title` + `aria-label`)
- Name (truncated with ellipsis)
- Duration (formatted from timestamps)
- `experiment-item--active` class when selected (accent border + dim background)
- Alert badge placeholder (`hasAlert` prop for future use)

Wrapped in `React.memo` with custom comparison on `experiment.id`, `experiment.status`, `experiment.updatedAt`, `isActive`.

## Utility: `formatDuration`

Location: `utils/formatting.ts`

```typescript
formatDuration(createdAt: number, updatedAt: number, status: string): string
```

- `running`: elapsed from `createdAt` to now (e.g. "2h 34m")
- `completed`/`failed`: total from `createdAt` to `updatedAt`
- `pending`: "—"

## CSS

- `components/Experiments/ExperimentCard.css` — card styles from mockup
- `components/Experiments/ExperimentList.css` — list container + empty state
- Reuses existing `pulse` keyframe from `layout.css`
- Reuses existing design tokens (`--color-accent`, `--color-success`, `--color-error`, `--color-text-muted`)

## Status Indicators

| Status | Color | Token | Animation |
|--------|-------|-------|-----------|
| running | cyan | `--color-accent` | pulse glow |
| completed | green | `--color-success` | none |
| failed | red | `--color-error` | none |
| pending | muted | `--color-text-muted` | none |

## Out of Scope

- Inline metrics display (separate Phase 2B item)
- Sparkline charts (separate Phase 2B item)
- Virtualization (noted for future, list structure supports it)
- Live-ticking duration for running experiments (polish)

---

## Implementation Tasks

### Task 1: Install Zustand and Create Feature Branch

**Files:**
- Modify: `frontend/package.json`

**Step 1: Create feature branch**

```bash
git checkout -b feature/21-experiment-list develop
```

**Step 2: Install Zustand**

```bash
cd frontend && npm install zustand
```

**Step 3: Verify installation**

```bash
cd frontend && node -e "require('zustand')" && echo "OK"
```
Expected: `OK`

**Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add zustand dependency (#21)"
```

---

### Task 2: Wails Runtime Mock

The store needs `EventsOn` and `EventsOff` from the Wails runtime. Tests need a mock for this module. The jest config needs a new moduleNameMapper entry to intercept the runtime import.

**Files:**
- Create: `frontend/src/__mocks__/wailsjs/runtime/runtime.ts`
- Modify: `frontend/jest.config.js` (add runtime mock mapping)

**Step 1: Create the Wails runtime mock**

Create `frontend/src/__mocks__/wailsjs/runtime/runtime.ts`:

```typescript
// Mock for Wails runtime - used in Jest tests

type Callback = (...data: unknown[]) => void

const listeners: Map<string, Set<Callback>> = new Map()

export function EventsOn(eventName: string, callback: Callback): () => void {
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set())
  }
  listeners.get(eventName)!.add(callback)
  return () => {
    listeners.get(eventName)?.delete(callback)
  }
}

export function EventsOff(eventName: string): void {
  listeners.delete(eventName)
}

export function EventsEmit(eventName: string, ...data: unknown[]): void {
  listeners.get(eventName)?.forEach((cb) => cb(...data))
}

// Test helper: clear all listeners
export function __resetListeners(): void {
  listeners.clear()
}
```

**Step 2: Add runtime mock mapping to jest config**

In `frontend/jest.config.js`, add this entry to `moduleNameMapper` after the existing `wailsjs/go/models` entry:

```javascript
'^(\\.\\./)+wailsjs/runtime/runtime$':
  '<rootDir>/src/__mocks__/wailsjs/runtime/runtime.ts',
```

**Step 3: Update setupTests to reset listeners**

In `frontend/src/setupTests.ts`, add the runtime reset alongside the existing mock reset:

```typescript
import '@testing-library/jest-dom'
import { __resetMockLayout } from './__mocks__/wailsjs/go/main/App'
import { __resetListeners } from './__mocks__/wailsjs/runtime/runtime'

// Reset Wails mock state before each test
beforeEach(() => {
  __resetMockLayout()
  __resetListeners()
})
```

**Step 4: Run existing tests to verify nothing broke**

```bash
cd frontend && npx jest --no-cache 2>&1 | tail -20
```
Expected: All existing tests pass (9 suites, 105 tests)

**Step 5: Commit**

```bash
git add frontend/src/__mocks__/wailsjs/runtime/runtime.ts frontend/jest.config.js frontend/src/setupTests.ts
git commit -m "test: add Wails runtime mock for event subscription (#21)"
```

---

### Task 3: Duration Formatting Utility

**Files:**
- Create: `frontend/src/utils/formatting.ts`
- Create: `frontend/src/__tests__/utils/formatting.test.ts`

**Step 1: Write the failing tests**

Create `frontend/src/__tests__/utils/formatting.test.ts`:

```typescript
import { formatDuration } from '@utils/formatting'

describe('formatDuration', () => {
  // Duration is key experiment metadata shown on every card.
  // Running experiments show elapsed time from creation to now.
  it('formats running experiment duration from createdAt to now', () => {
    const now = Math.floor(Date.now() / 1000)
    const twoHoursAgo = now - 2 * 3600 - 34 * 60
    const result = formatDuration(twoHoursAgo, now, 'running')
    expect(result).toBe('2h 34m')
  })

  // Completed experiments show total duration from start to finish.
  it('formats completed experiment duration from createdAt to updatedAt', () => {
    const start = 1000000
    const end = start + 4 * 3600 + 12 * 60
    const result = formatDuration(start, end, 'completed')
    expect(result).toBe('4h 12m')
  })

  // Failed experiments also show total duration.
  it('formats failed experiment duration', () => {
    const start = 1000000
    const end = start + 12 * 60
    const result = formatDuration(start, end, 'failed')
    expect(result).toBe('12m')
  })

  // Pending experiments have no meaningful duration.
  it('returns dash for pending experiments', () => {
    const now = Math.floor(Date.now() / 1000)
    const result = formatDuration(now, now, 'pending')
    expect(result).toBe('\u2014')
  })

  // Short durations should show minutes only.
  it('formats sub-hour durations as minutes only', () => {
    const start = 1000000
    const end = start + 45 * 60
    const result = formatDuration(start, end, 'completed')
    expect(result).toBe('45m')
  })

  // Very short durations show less than a minute.
  it('formats sub-minute durations', () => {
    const start = 1000000
    const end = start + 30
    const result = formatDuration(start, end, 'completed')
    expect(result).toBe('<1m')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
cd frontend && npx jest __tests__/utils/formatting.test.ts --no-cache 2>&1 | tail -10
```
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `frontend/src/utils/formatting.ts`:

```typescript
/**
 * Formats the duration of an experiment for display in the experiment card.
 *
 * - running: elapsed from createdAt to now
 * - completed/failed: total from createdAt to updatedAt
 * - pending: em dash
 */
export function formatDuration(createdAt: number, updatedAt: number, status: string): string {
  if (status === 'pending') {
    return '\u2014'
  }

  const endTime = status === 'running' ? Math.floor(Date.now() / 1000) : updatedAt
  const seconds = Math.max(0, endTime - createdAt)

  if (seconds < 60) {
    return '<1m'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0) {
    return `${minutes}m`
  }

  return `${hours}h ${minutes}m`
}
```

**Step 4: Run tests to verify they pass**

```bash
cd frontend && npx jest __tests__/utils/formatting.test.ts --no-cache 2>&1 | tail -10
```
Expected: 6 tests pass

**Step 5: Commit**

```bash
git add frontend/src/utils/formatting.ts frontend/src/__tests__/utils/formatting.test.ts
git commit -m "feat: add formatDuration utility (#21)"
```

---

### Task 4: Experiment Store

**Files:**
- Create: `frontend/src/stores/experimentStore.ts`
- Modify: `frontend/src/stores/index.ts`
- Create: `frontend/src/__tests__/stores/experimentStore.test.ts`

**Step 1: Write the failing tests**

Create `frontend/src/__tests__/stores/experimentStore.test.ts`:

```typescript
import { useExperimentStore } from '@stores/experimentStore'
import { CreateExperiment, __resetMockState } from '../../__mocks__/wailsjs/go/main/App'
import { EventsEmit } from '../../__mocks__/wailsjs/runtime/runtime'
import { act } from '@testing-library/react'

// Reset store state between tests
beforeEach(() => {
  useExperimentStore.setState({
    experiments: [],
    selectedId: null,
    loading: false,
    error: null,
  })
  __resetMockState()
})

describe('experimentStore', () => {
  // The store must be able to fetch experiments from the backend.
  describe('fetchExperiments', () => {
    it('populates experiments from backend', async () => {
      // Seed mock with experiments
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

    it('sets error on fetch failure', async () => {
      jest.spyOn(
        require('../../__mocks__/wailsjs/go/main/App'),
        'ListExperiments'
      ).mockRejectedValueOnce(new Error('network error'))

      await act(async () => {
        await useExperimentStore.getState().fetchExperiments()
      })

      const state = useExperimentStore.getState()
      expect(state.error).toBe('network error')
      expect(state.experiments).toHaveLength(0)
    })
  })

  // Selection is the primary interaction — clicking an experiment card.
  describe('selectExperiment', () => {
    it('sets selectedId', () => {
      act(() => {
        useExperimentStore.getState().selectExperiment('abc-123')
      })
      expect(useExperimentStore.getState().selectedId).toBe('abc-123')
    })

    it('clears selectedId with null', () => {
      act(() => {
        useExperimentStore.getState().selectExperiment('abc-123')
        useExperimentStore.getState().selectExperiment(null)
      })
      expect(useExperimentStore.getState().selectedId).toBeNull()
    })
  })

  // The store subscribes to Wails events and re-fetches on mutations.
  describe('initialize', () => {
    it('fetches experiments on init', async () => {
      await CreateExperiment('exp-1', '{}')

      await act(async () => {
        useExperimentStore.getState().initialize()
        // Allow the async fetch inside initialize to complete
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(useExperimentStore.getState().experiments).toHaveLength(1)
    })

    it('re-fetches when experiment event is emitted', async () => {
      await act(async () => {
        useExperimentStore.getState().initialize()
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(useExperimentStore.getState().experiments).toHaveLength(0)

      // Create an experiment via mock, then emit the event
      await CreateExperiment('exp-new', '{}')

      await act(async () => {
        EventsEmit('experiment:created')
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(useExperimentStore.getState().experiments).toHaveLength(1)
    })
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
cd frontend && npx jest __tests__/stores/experimentStore.test.ts --no-cache 2>&1 | tail -10
```
Expected: FAIL — module not found

**Step 3: Write the store implementation**

Create `frontend/src/stores/experimentStore.ts`:

```typescript
import { create } from 'zustand'
import { ListExperiments } from '../../wailsjs/go/main/App'
import { EventsOn } from '../../wailsjs/runtime/runtime'
import type { experiment } from '../../wailsjs/go/models'

interface ExperimentState {
  experiments: experiment.Experiment[]
  selectedId: string | null
  loading: boolean
  error: string | null

  fetchExperiments: () => Promise<void>
  selectExperiment: (id: string | null) => void
  initialize: () => void
}

export const useExperimentStore = create<ExperimentState>((set, get) => ({
  experiments: [],
  selectedId: null,
  loading: false,
  error: null,

  fetchExperiments: async () => {
    set({ loading: true, error: null })
    try {
      const experiments = await ListExperiments()
      set({ experiments, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        loading: false,
      })
    }
  },

  selectExperiment: (id: string | null) => {
    set({ selectedId: id })
  },

  initialize: () => {
    const { fetchExperiments } = get()
    fetchExperiments()

    const events = [
      'experiment:created',
      'experiment:updated',
      'experiment:deleted',
    ]
    events.forEach((eventName) => {
      EventsOn(eventName, () => {
        fetchExperiments()
      })
    })
  },
}))
```

**Step 4: Update stores barrel export**

Replace `frontend/src/stores/index.ts`:

```typescript
export { useExperimentStore } from './experimentStore'
```

**Step 5: Run tests to verify they pass**

```bash
cd frontend && npx jest __tests__/stores/experimentStore.test.ts --no-cache 2>&1 | tail -10
```
Expected: 5 tests pass

**Step 6: Commit**

```bash
git add frontend/src/stores/experimentStore.ts frontend/src/stores/index.ts frontend/src/__tests__/stores/experimentStore.test.ts
git commit -m "feat: add experiment Zustand store with event subscription (#21)"
```

---

### Task 5: ExperimentCard Component

**Files:**
- Create: `frontend/src/components/Experiments/ExperimentCard.tsx`
- Create: `frontend/src/components/Experiments/ExperimentCard.css`
- Create: `frontend/src/__tests__/components/Experiments/ExperimentCard.test.tsx`

**Step 1: Write the failing tests**

Create `frontend/src/__tests__/components/Experiments/ExperimentCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExperimentCard } from '@components/Experiments/ExperimentCard'
import { experiment } from '../../../__mocks__/wailsjs/go/models'

function makeExperiment(overrides: Partial<Record<string, unknown>> = {}): experiment.Experiment {
  const now = Math.floor(Date.now() / 1000)
  return new experiment.Experiment({
    id: 'exp-1',
    name: 'reward-model-v2-run-47',
    config: '{}',
    status: 'running',
    createdAt: now - 2 * 3600 - 34 * 60,
    updatedAt: now,
    ...overrides,
  })
}

describe('ExperimentCard', () => {
  const defaultProps = {
    experiment: makeExperiment(),
    isActive: false,
    onSelect: jest.fn(),
  }

  // Name is the primary identifier for an experiment.
  it('renders experiment name', () => {
    render(<ExperimentCard {...defaultProps} />)
    expect(screen.getByText('reward-model-v2-run-47')).toBeInTheDocument()
  })

  // Status dot color must match the experiment status.
  it('renders running status dot with correct class', () => {
    render(<ExperimentCard {...defaultProps} />)
    const dot = screen.getByTitle('Running')
    expect(dot).toHaveClass('experiment-item__status--running')
  })

  it('renders completed status dot with correct class', () => {
    const exp = makeExperiment({ status: 'completed' })
    render(<ExperimentCard {...defaultProps} experiment={exp} />)
    const dot = screen.getByTitle('Completed')
    expect(dot).toHaveClass('experiment-item__status--completed')
  })

  it('renders failed status dot with correct class', () => {
    const exp = makeExperiment({ status: 'failed' })
    render(<ExperimentCard {...defaultProps} experiment={exp} />)
    const dot = screen.getByTitle('Failed')
    expect(dot).toHaveClass('experiment-item__status--failed')
  })

  it('renders pending status dot with correct class', () => {
    const exp = makeExperiment({ status: 'pending' })
    render(<ExperimentCard {...defaultProps} experiment={exp} />)
    const dot = screen.getByTitle('Pending')
    expect(dot).toHaveClass('experiment-item__status--pending')
  })

  // Active experiment must be visually distinct with accent styling.
  it('applies active class when isActive is true', () => {
    render(<ExperimentCard {...defaultProps} isActive={true} />)
    const item = screen.getByRole('button')
    expect(item).toHaveClass('experiment-item--active')
  })

  it('does not apply active class when isActive is false', () => {
    render(<ExperimentCard {...defaultProps} isActive={false} />)
    const item = screen.getByRole('button')
    expect(item).not.toHaveClass('experiment-item--active')
  })

  // Clicking a card selects it.
  it('calls onSelect with experiment id on click', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(<ExperimentCard {...defaultProps} onSelect={onSelect} />)
    await user.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith('exp-1')
  })

  // Duration is shown for each card.
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

  // Memoization prevents unnecessary re-renders.
  it('does not re-render when props are unchanged', () => {
    const exp = makeExperiment()
    const { rerender } = render(
      <ExperimentCard experiment={exp} isActive={false} onSelect={jest.fn()} />
    )
    const firstHTML = screen.getByRole('button').innerHTML

    // Re-render with same props (new object but same values)
    const exp2 = makeExperiment()
    rerender(
      <ExperimentCard experiment={exp2} isActive={false} onSelect={jest.fn()} />
    )
    const secondHTML = screen.getByRole('button').innerHTML

    expect(firstHTML).toBe(secondHTML)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
cd frontend && npx jest __tests__/components/Experiments/ExperimentCard.test.tsx --no-cache 2>&1 | tail -10
```
Expected: FAIL — module not found

**Step 3: Write the CSS**

Create `frontend/src/components/Experiments/ExperimentCard.css`:

```css
.experiment-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease;
  width: 100%;
  text-align: left;
  color: inherit;
  font: inherit;
}

.experiment-item:hover {
  border-color: var(--color-border-default);
  background: var(--color-bg-hover);
}

.experiment-item--active {
  border-color: var(--color-accent);
  background: var(--color-accent-dim);
}

.experiment-item__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.experiment-item__status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.experiment-item__status--running {
  background: var(--color-accent);
  box-shadow: 0 0 6px var(--color-accent);
  animation: pulse 2s infinite;
}

.experiment-item__status--completed {
  background: var(--color-success);
}

.experiment-item__status--failed {
  background: var(--color-error);
}

.experiment-item__status--pending {
  background: var(--color-text-muted);
}

.experiment-item__name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.experiment-item__duration {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  flex-shrink: 0;
}
```

**Step 4: Write the component**

Create `frontend/src/components/Experiments/ExperimentCard.tsx`:

```typescript
import { memo } from 'react'
import { formatDuration } from '@utils/formatting'
import type { experiment } from '../../../wailsjs/go/models'
import './ExperimentCard.css'

interface ExperimentCardProps {
  experiment: experiment.Experiment
  isActive: boolean
  onSelect: (id: string) => void
}

const STATUS_LABELS: Record<string, string> = {
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  pending: 'Pending',
}

function ExperimentCardInner({ experiment: exp, isActive, onSelect }: ExperimentCardProps) {
  const statusLabel = STATUS_LABELS[exp.status] || exp.status
  const duration = formatDuration(exp.createdAt, exp.updatedAt, exp.status)

  const className = ['experiment-item', isActive && 'experiment-item--active']
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={className}
      onClick={() => onSelect(exp.id)}
      aria-label={`${exp.name}, ${statusLabel}`}
    >
      <div className="experiment-item__row">
        <span
          className={`experiment-item__status experiment-item__status--${exp.status}`}
          title={statusLabel}
          aria-label={statusLabel}
        />
        <span className="experiment-item__name">{exp.name}</span>
        <span className="experiment-item__duration">{duration}</span>
      </div>
    </button>
  )
}

export const ExperimentCard = memo(ExperimentCardInner, (prev, next) => {
  return (
    prev.experiment.id === next.experiment.id &&
    prev.experiment.status === next.experiment.status &&
    prev.experiment.updatedAt === next.experiment.updatedAt &&
    prev.isActive === next.isActive
  )
})
```

**Step 5: Run tests to verify they pass**

```bash
cd frontend && npx jest __tests__/components/Experiments/ExperimentCard.test.tsx --no-cache 2>&1 | tail -10
```
Expected: 10 tests pass

**Step 6: Commit**

```bash
git add frontend/src/components/Experiments/ExperimentCard.tsx frontend/src/components/Experiments/ExperimentCard.css frontend/src/__tests__/components/Experiments/ExperimentCard.test.tsx
git commit -m "feat: add ExperimentCard component with status indicators (#21)"
```

---

### Task 6: ExperimentList Component

**Files:**
- Create: `frontend/src/components/Experiments/ExperimentList.tsx`
- Create: `frontend/src/components/Experiments/ExperimentList.css`
- Create: `frontend/src/components/Experiments/index.ts`
- Create: `frontend/src/__tests__/components/Experiments/ExperimentList.test.tsx`

**Step 1: Write the failing tests**

Create `frontend/src/__tests__/components/Experiments/ExperimentList.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExperimentList } from '@components/Experiments/ExperimentList'
import { experiment } from '../../../__mocks__/wailsjs/go/models'

function makeExperiment(id: string, name: string, status: string = 'completed'): experiment.Experiment {
  const now = Math.floor(Date.now() / 1000)
  return new experiment.Experiment({
    id,
    name,
    config: '{}',
    status,
    createdAt: now - 3600,
    updatedAt: now,
  })
}

describe('ExperimentList', () => {
  // The list is the primary way users see their experiments.
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

  // Empty state is shown when no experiments exist yet.
  it('shows empty state when no experiments', () => {
    render(
      <ExperimentList experiments={[]} selectedId={null} onSelect={jest.fn()} />
    )
    expect(screen.getByText('No experiments yet')).toBeInTheDocument()
  })

  // Clicking a card delegates selection to the parent.
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

  // The selected experiment should be highlighted.
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
})
```

**Step 2: Run tests to verify they fail**

```bash
cd frontend && npx jest __tests__/components/Experiments/ExperimentList.test.tsx --no-cache 2>&1 | tail -10
```
Expected: FAIL — module not found

**Step 3: Write the CSS**

Create `frontend/src/components/Experiments/ExperimentList.css`:

```css
.experiment-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.experiment-list__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  font-size: 12px;
  color: var(--color-text-muted);
}
```

**Step 4: Write the component**

Create `frontend/src/components/Experiments/ExperimentList.tsx`:

```typescript
import { ExperimentCard } from './ExperimentCard'
import type { experiment } from '../../../wailsjs/go/models'
import './ExperimentList.css'

interface ExperimentListProps {
  experiments: experiment.Experiment[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ExperimentList({ experiments, selectedId, onSelect }: ExperimentListProps) {
  if (experiments.length === 0) {
    return (
      <div className="experiment-list">
        <div className="experiment-list__empty">No experiments yet</div>
      </div>
    )
  }

  return (
    <div className="experiment-list">
      {experiments.map((exp) => (
        <ExperimentCard
          key={exp.id}
          experiment={exp}
          isActive={exp.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
```

**Step 5: Create barrel export**

Create `frontend/src/components/Experiments/index.ts`:

```typescript
export { ExperimentCard } from './ExperimentCard'
export { ExperimentList } from './ExperimentList'
```

**Step 6: Run tests to verify they pass**

```bash
cd frontend && npx jest __tests__/components/Experiments/ExperimentList.test.tsx --no-cache 2>&1 | tail -10
```
Expected: 4 tests pass

**Step 7: Commit**

```bash
git add frontend/src/components/Experiments/ExperimentList.tsx frontend/src/components/Experiments/ExperimentList.css frontend/src/components/Experiments/index.ts frontend/src/__tests__/components/Experiments/ExperimentList.test.tsx
git commit -m "feat: add ExperimentList component with empty state (#21)"
```

---

### Task 7: Wire ExperimentsPanel to Store

**Files:**
- Modify: `frontend/src/components/layout/panels/ExperimentsPanel.tsx`

**Step 1: Update ExperimentsPanel**

Replace `frontend/src/components/layout/panels/ExperimentsPanel.tsx`:

```typescript
import { useEffect } from 'react'
import { useExperimentStore } from '@stores/experimentStore'
import { ExperimentList } from '../../Experiments/ExperimentList'

export function ExperimentsPanel() {
  const experiments = useExperimentStore((s) => s.experiments)
  const selectedId = useExperimentStore((s) => s.selectedId)
  const selectExperiment = useExperimentStore((s) => s.selectExperiment)
  const initialize = useExperimentStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <div className="panel panel--experiments">
      <div className="panel__header">
        <span className="panel__title">Experiments</span>
        <span className="panel__badge">{experiments.length}</span>
        <div className="panel__actions">
          <button className="panel__action" title="New Experiment" aria-label="New Experiment">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="panel__content">
        <ExperimentList
          experiments={experiments}
          selectedId={selectedId}
          onSelect={selectExperiment}
        />
      </div>
    </div>
  )
}
```

**Step 2: Run full test suite to verify nothing broke**

```bash
cd frontend && npx jest --no-cache 2>&1 | tail -20
```
Expected: All tests pass (existing + new)

**Step 3: Commit**

```bash
git add frontend/src/components/layout/panels/ExperimentsPanel.tsx
git commit -m "feat: wire ExperimentsPanel to experiment store (#21)"
```

---

### Task 8: Full Test Suite and TDD Doc

**Files:**
- Create: `docs/tdd/021-experiment-list.md`

**Step 1: Run full test suite (Go + frontend)**

```bash
cd /Users/keithstruzzieri/projects/portfolio/flux-ml && go test ./... 2>&1 | tail -20
```

```bash
cd frontend && npx jest --no-cache 2>&1 | tail -30
```

Expected: All Go tests pass (75 tests, 5 packages), all frontend tests pass (existing 105 + ~24 new)

**Step 2: Create TDD document**

Create `docs/tdd/021-experiment-list.md` with the standard sections:
- Issue summary
- Acceptance criteria (from ticket)
- Rationale
- Test summary (list all tests with pass/fail)
- Implementation summary

Use the actual test output from step 1 to fill in results.

**Step 3: Commit**

```bash
git add docs/tdd/021-experiment-list.md
git commit -m "docs: add TDD doc with passing results (#21)"
```

---

## File Summary

| Action | File |
|--------|------|
| Create | `frontend/src/__mocks__/wailsjs/runtime/runtime.ts` |
| Create | `frontend/src/utils/formatting.ts` |
| Create | `frontend/src/stores/experimentStore.ts` |
| Create | `frontend/src/components/Experiments/ExperimentCard.tsx` |
| Create | `frontend/src/components/Experiments/ExperimentCard.css` |
| Create | `frontend/src/components/Experiments/ExperimentList.tsx` |
| Create | `frontend/src/components/Experiments/ExperimentList.css` |
| Create | `frontend/src/components/Experiments/index.ts` |
| Create | `frontend/src/__tests__/utils/formatting.test.ts` |
| Create | `frontend/src/__tests__/stores/experimentStore.test.ts` |
| Create | `frontend/src/__tests__/components/Experiments/ExperimentCard.test.tsx` |
| Create | `frontend/src/__tests__/components/Experiments/ExperimentList.test.tsx` |
| Create | `docs/tdd/021-experiment-list.md` |
| Modify | `frontend/package.json` (zustand dep) |
| Modify | `frontend/jest.config.js` (runtime mock mapping) |
| Modify | `frontend/src/setupTests.ts` (reset listeners) |
| Modify | `frontend/src/stores/index.ts` (barrel export) |
| Modify | `frontend/src/components/layout/panels/ExperimentsPanel.tsx` (wire to store) |

## Commit Sequence

1. `chore: add zustand dependency (#21)`
2. `test: add Wails runtime mock for event subscription (#21)`
3. `feat: add formatDuration utility (#21)`
4. `feat: add experiment Zustand store with event subscription (#21)`
5. `feat: add ExperimentCard component with status indicators (#21)`
6. `feat: add ExperimentList component with empty state (#21)`
7. `feat: wire ExperimentsPanel to experiment store (#21)`
8. `docs: add TDD doc with passing results (#21)`
