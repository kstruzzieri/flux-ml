# TDD: Issue #6 - Header Component

## Issue Summary
Implement the header component with navigation and status indicators.

## Acceptance Criteria
- [x] Header renders per mockup
- [x] Navigation tabs switch views
- [x] Status indicators update reactively
- [x] Command palette trigger (⌘K) displayed

## Rationale
The header provides primary navigation and at-a-glance status information. Navigation tabs control which view is displayed in the main content area. Status indicators show running experiment count and active alerts, updating reactively as experiments start/stop or alerts are triggered.

## Failing Tests

### Test 1: Navigation tabs switch active view
```typescript
it('switches active view when nav tab is clicked', async () => {
  const onViewChange = jest.fn()
  render(<Header activeView="experiments" onViewChange={onViewChange} />)

  await userEvent.click(screen.getByRole('button', { name: /compare/i }))

  expect(onViewChange).toHaveBeenCalledWith('compare')
})
```

### Test 2: Status indicators display counts
```typescript
it('displays running experiments count', () => {
  render(<Header runningCount={3} alertCount={0} />)

  expect(screen.getByText('3 running')).toBeInTheDocument()
})

it('displays alert count with warning style', () => {
  render(<Header runningCount={0} alertCount={2} />)

  expect(screen.getByText('2 alerts')).toBeInTheDocument()
})
```

### Test 3: Command palette trigger displays keyboard shortcut
```typescript
it('displays command palette keyboard shortcut', () => {
  render(<Header />)

  expect(screen.getByText('⌘K')).toBeInTheDocument()
})
```

### Test 4: Status indicators hidden when counts are zero
```typescript
it('hides running status when count is zero', () => {
  render(<Header runningCount={0} alertCount={0} />)

  expect(screen.queryByText(/running/i)).not.toBeInTheDocument()
})
```

## Expected Output
```
FAIL src/__tests__/components/layout/Header.test.tsx
  ● Header › switches active view when nav tab is clicked
  ● Header › displays running experiments count
  ● Header › displays alert count with warning style
  ● Header › displays command palette keyboard shortcut
```

## Test Summary
| Test | Status | Rationale |
|------|--------|-----------|
| Renders logo and title | ✅ Pass | Brand identity and primary landmark |
| Renders all navigation tabs | ✅ Pass | All four views must be accessible |
| Marks the active view tab | ✅ Pass | User orientation and accessibility |
| Switches active view on click | ✅ Pass | Primary way users switch views |
| Displays running count when > 0 | ✅ Pass | At-a-glance visibility of training runs |
| Displays alert count with warning | ✅ Pass | Visual urgency for anomalies |
| Singular "alert" when count is 1 | ✅ Pass | Proper grammar improves quality |
| Singular "running" when count is 1 | ✅ Pass | Consistent language treatment |
| Hides running status when zero | ✅ Pass | Reduce visual clutter |
| Hides alert status when zero | ✅ Pass | Show alerts only when needed |
| Displays command palette shortcut | ✅ Pass | Power-user feature discovery |
| Triggers callback on shortcut click | ✅ Pass | Mouse alternative to keyboard |
| Displays version when provided | ✅ Pass | Build identification for bug reports |

## Passing Test Results
```
> frontend@0.0.0 test
> jest

PASS src/__tests__/setup.test.tsx
PASS src/__tests__/components/layout/Header.test.tsx
PASS src/__tests__/components/layout/AppShell.test.tsx

Test Suites: 3 passed, 3 total
Tests:       22 passed, 22 total
Snapshots:   0 total
Time:        1.878 s
```

## Implementation Summary

### Files Modified
- `frontend/src/components/layout/Header.tsx` - Added ViewId type export, new props (activeView, onViewChange, runningCount, alertCount, onCommandPalette), conditional rendering of status indicators, command palette button
- `frontend/src/components/layout/ActivityBar.tsx` - Updated to use ViewId type for type-safe navigation
- `frontend/src/components/layout/AppShell.tsx` - Wired up Header and ActivityBar with shared ViewId state
- `frontend/src/components/layout/index.ts` - Added ViewId type export
- `frontend/src/styles/components/layout.css` - Added header__status--warning, pulse-warning animation, command palette styles

### Key Implementation Details
1. **ViewId Type**: Centralized union type `'experiments' | 'compare' | 'data' | 'code'` exported from Header for type-safe view switching
2. **Status Indicators**: Conditionally rendered only when counts > 0, with proper singular/plural grammar
3. **Warning Styling**: Alert status uses `header__status--warning` class with amber color and pulse animation
4. **Command Palette**: Clickable `<kbd>` element displaying ⌘K that triggers onCommandPalette callback
5. **ActivityBar Integration**: Bottom items (alerts, settings) are utility buttons, not navigation views - they don't call onItemClick
