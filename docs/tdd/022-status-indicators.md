# TDD: Issue #22 - Status Indicators (running, completed, failed)

## Issue Summary
Extract the inline status dot from `ExperimentCard` into a reusable `StatusDot` component. Fix duplicate `@keyframes pulse` definitions in `layout.css`. Ensure all four experiment statuses (running, completed, failed, pending) render correctly with proper colors, pulse animation, and accessibility. Update `ExperimentSelectionPanel` and `ExperimentCard` to use the new component.

## Acceptance Criteria
- [x] All three states (running, completed, failed) render correctly
- [x] Running state pulses with animation
- [x] Colors match design tokens (`--color-accent`, `--color-success`, `--color-error`)
- [x] Pending state renders as muted dot
- [x] StatusDot is a reusable component in `ui/StatusDot/`
- [x] Duplicate `@keyframes pulse` definitions cleaned up
- [x] ExperimentCard uses StatusDot component
- [x] All existing tests continue to pass
- [x] New StatusDot tests cover all states

## Rationale
1. **Reusable component** — The status dot was inlined in `ExperimentCard` and duplicated in `ExperimentSelectionPanel` with separate CSS classes (`exp-card__status--*` and `experiment-item__status--*`). Extracting to a single `StatusDot` component eliminates duplication and enables reuse in future views (experiment detail, comparison).
2. **Dedicated animation** — `layout.css` had two conflicting `@keyframes pulse` definitions (lines 164 and 985). StatusDot defines its own `@keyframes status-pulse` to avoid collisions with the header's pulse animation.
3. **Accessibility** — Uses `role="img"` with `aria-label` (e.g., "Running") so screen readers announce the status. Previous implementation used `title` which is less accessible.
4. **Size variants** — Supports `sm` (6px) and `md` (8px, default) to accommodate different contexts. ExperimentCard uses `md`, ExperimentSelectionPanel uses `sm`.

## Failing Tests

### StatusDot Component (8 tests)

#### Test 1: renders with running status and correct class
Running experiments must display a status dot with the running CSS class for cyan color.
```typescript
it('renders with running status and correct class', () => {
  render(<StatusDot status="running" />)
  const dot = screen.getByRole('img', { name: 'Running' })
  expect(dot).toHaveClass('status-dot', 'status-dot--running')
})
```

#### Test 2: renders with completed status and correct class
Completed experiments must display a green status dot.
```typescript
it('renders with completed status and correct class', () => {
  render(<StatusDot status="completed" />)
  const dot = screen.getByRole('img', { name: 'Completed' })
  expect(dot).toHaveClass('status-dot', 'status-dot--completed')
})
```

#### Test 3: renders with failed status and correct class
Failed experiments must display a red status dot.
```typescript
it('renders with failed status and correct class', () => {
  render(<StatusDot status="failed" />)
  const dot = screen.getByRole('img', { name: 'Failed' })
  expect(dot).toHaveClass('status-dot', 'status-dot--failed')
})
```

#### Test 4: renders with pending status and correct class
Pending experiments must display a muted gray status dot.
```typescript
it('renders with pending status and correct class', () => {
  render(<StatusDot status="pending" />)
  const dot = screen.getByRole('img', { name: 'Pending' })
  expect(dot).toHaveClass('status-dot', 'status-dot--pending')
})
```

#### Test 5: applies pulse animation class only to running status
Only the running status should have the pulse animation. All other statuses must not pulse.
```typescript
it('applies pulse animation class only to running status', () => {
  const { rerender } = render(<StatusDot status="running" />)
  expect(screen.getByRole('img', { name: 'Running' })).toHaveClass('status-dot--pulse')

  rerender(<StatusDot status="completed" />)
  expect(screen.getByRole('img', { name: 'Completed' })).not.toHaveClass('status-dot--pulse')

  rerender(<StatusDot status="failed" />)
  expect(screen.getByRole('img', { name: 'Failed' })).not.toHaveClass('status-dot--pulse')

  rerender(<StatusDot status="pending" />)
  expect(screen.getByRole('img', { name: 'Pending' })).not.toHaveClass('status-dot--pulse')
})
```

#### Test 6: accepts custom className
Custom classes must be merged with the default status-dot classes.
```typescript
it('accepts custom className', () => {
  render(<StatusDot status="running" className="my-custom" />)
  const dot = screen.getByRole('img', { name: 'Running' })
  expect(dot).toHaveClass('status-dot', 'my-custom')
})
```

#### Test 7: renders small size when size is sm
The `sm` size variant renders a 6px dot.
```typescript
it('renders small size when size is sm', () => {
  render(<StatusDot status="running" size="sm" />)
  const dot = screen.getByRole('img', { name: 'Running' })
  expect(dot).toHaveClass('status-dot--sm')
})
```

#### Test 8: renders medium size by default
The default size is `md` (8px).
```typescript
it('renders medium size by default', () => {
  render(<StatusDot status="running" />)
  const dot = screen.getByRole('img', { name: 'Running' })
  expect(dot).toHaveClass('status-dot--md')
})
```

### ExperimentCard Integration (10 tests, updated)

#### Test 9: renders experiment name
The experiment name is the primary identifier displayed on each card.
```typescript
it('renders experiment name', () => {
  render(<ExperimentCard {...defaultProps} />)
  expect(screen.getByText('reward-model-v2-run-47')).toBeInTheDocument()
})
```

#### Test 10: renders running status dot with correct class
Running experiments must display a StatusDot with the running CSS class.
```typescript
it('renders running status dot with correct class', () => {
  render(<ExperimentCard {...defaultProps} />)
  const dot = screen.getByRole('img', { name: 'Running' })
  expect(dot).toHaveClass('status-dot--running')
})
```

#### Test 11: renders completed status dot with correct class
Completed experiments must display a StatusDot with the completed CSS class.
```typescript
it('renders completed status dot with correct class', () => {
  const exp = makeExperiment({ status: 'completed' })
  render(<ExperimentCard {...defaultProps} experiment={exp} />)
  const dot = screen.getByRole('img', { name: 'Completed' })
  expect(dot).toHaveClass('status-dot--completed')
})
```

#### Test 12: renders failed status dot with correct class
Failed experiments must display a StatusDot with the failed CSS class.
```typescript
it('renders failed status dot with correct class', () => {
  const exp = makeExperiment({ status: 'failed' })
  render(<ExperimentCard {...defaultProps} experiment={exp} />)
  const dot = screen.getByRole('img', { name: 'Failed' })
  expect(dot).toHaveClass('status-dot--failed')
})
```

#### Test 13: renders pending status dot with correct class
Pending experiments must display a StatusDot with the pending CSS class.
```typescript
it('renders pending status dot with correct class', () => {
  const exp = makeExperiment({ status: 'pending' })
  render(<ExperimentCard {...defaultProps} experiment={exp} />)
  const dot = screen.getByRole('img', { name: 'Pending' })
  expect(dot).toHaveClass('status-dot--pending')
})
```

#### Test 14: applies active class when isActive is true
The selected experiment must be visually distinct with accent styling.
```typescript
it('applies active class when isActive is true', () => {
  render(<ExperimentCard {...defaultProps} isActive={true} />)
  const item = screen.getByRole('button')
  expect(item).toHaveClass('exp-card--active')
})
```

#### Test 15: does not apply active class when isActive is false
Non-selected experiments must not have the active class.
```typescript
it('does not apply active class when isActive is false', () => {
  render(<ExperimentCard {...defaultProps} isActive={false} />)
  const item = screen.getByRole('button')
  expect(item).not.toHaveClass('exp-card--active')
})
```

#### Test 16: calls onSelect with experiment id on click
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

#### Test 17: shows formatted duration
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

#### Test 18: does not re-render when props are unchanged (memo)
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

## Expected Output (Failing)
```
FAIL  src/__tests__/components/ui/StatusDot.test.tsx
  Cannot find module '@components/ui/StatusDot/StatusDot'

Tests:  0 passed, 8 failed, 8 total
```

## Test Summary

### Passing Test Results
```
PASS  src/__tests__/components/ui/StatusDot.test.tsx
  StatusDot
    ✓ renders with running status and correct class (146 ms)
    ✓ renders with completed status and correct class (9 ms)
    ✓ renders with failed status and correct class (8 ms)
    ✓ renders with pending status and correct class (5 ms)
    ✓ applies pulse animation class only to running status (24 ms)
    ✓ accepts custom className (4 ms)
    ✓ renders small size when size is sm (3 ms)
    ✓ renders medium size by default (5 ms)

PASS  src/__tests__/components/Experiments/ExperimentCard.test.tsx
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

Test Suites: 14 passed, 14 total
Tests:       139 passed, 139 total (8 new + 131 existing)

Go tests: 5 packages, all passing
```

## Implementation Summary

### Files Created
- `frontend/src/components/ui/StatusDot/StatusDot.tsx` — Reusable component with `status`, `size`, and `className` props. Uses `role="img"` + `aria-label` for accessibility. Applies `status-dot--pulse` class only to running status.
- `frontend/src/components/ui/StatusDot/StatusDot.css` — Dedicated styles with `@keyframes status-pulse` animation (opacity + scale). Supports `sm` (6px) and `md` (8px) sizes. Colors from design tokens.
- `frontend/src/__tests__/components/ui/StatusDot.test.tsx` — 8 tests covering all 4 statuses, pulse animation exclusivity, custom className, and size variants.

### Files Modified
- `frontend/src/components/Experiments/ExperimentCard.tsx` — Replaced inline status `<span>` with `<StatusDot>` component import.
- `frontend/src/components/Experiments/ExperimentCard.css` — Removed old `.exp-card__status` and `.exp-card__status--*` rules (now in StatusDot.css).
- `frontend/src/__tests__/components/Experiments/ExperimentCard.test.tsx` — Updated queries from `getByTitle('Running')` to `getByRole('img', { name: 'Running' })` to match StatusDot's accessibility pattern. Updated class assertions from `exp-card__status--*` to `status-dot--*`.
- `frontend/src/components/layout/panels/ExperimentSelectionPanel.tsx` — Replaced inline status dots with `<StatusDot status={exp.status} size="sm" />`.
- `frontend/src/styles/components/layout.css` — Removed duplicate `@keyframes pulse` definition and old `.experiment-item__status` / `.experiment-item__status--running` / `.experiment-item__status--completed` rules.

### Design Decisions
1. **Dedicated `@keyframes status-pulse`** — Named distinctly from the existing `pulse` keyframe in layout.css (used by `header__status-dot`) to avoid collisions. Uses both opacity and scale transform for a more polished effect.
2. **`role="img"` over `title`** — `aria-label` with `role="img"` is more accessible than `title` attribute. Screen readers reliably announce the status label. The `title` attribute on the old implementation was a tooltip-only affordance.
3. **Size prop** — Two sizes (`sm`=6px, `md`=8px) cover current use cases. ExperimentSelectionPanel uses `sm` for a more compact layout; ExperimentCard uses the default `md`.
4. **Pulse only on running** — The `status-dot--pulse` class is conditionally applied only when `status === 'running'`, keeping completed/failed/pending dots static per the design spec.
