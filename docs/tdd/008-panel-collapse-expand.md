# TDD: Issue #8 - Panel Collapse/Expand

## Issue Summary
Allow panels to collapse and expand for workspace customization.

## Acceptance Criteria
- [x] Each panel can collapse
- [x] Collapsed state shows indicator
- [x] Click to expand
- [x] Smooth transitions

## Rationale
Users need to maximize screen real estate for their current task. When focused on code, they may want to hide the inspector. When reviewing metrics, they may want to collapse the file tree. Collapsible panels provide this flexibility without requiring multiple layout presets.

## Collapse Behaviors
- **Left sidebar**: Collapse to thin bar with expand button
- **Right inspector**: Collapse to thin bar with expand button
- **Bottom panel**: Collapse to tabs only (show tab bar, hide content)

## Failing Tests

### Test 1: Left column has collapse button
Users need a visible control to collapse the left panel. The button should be in the panel header area.
```typescript
it('renders collapse button for left column', () => {
  render(<Content />)

  expect(screen.getByTestId('collapse-left')).toBeInTheDocument()
})
```

### Test 2: Clicking collapse button hides left panels
When collapsed, the experiments and files panels should be hidden, leaving only a thin expand bar.
```typescript
it('collapses left column when collapse button is clicked', async () => {
  const user = userEvent.setup()
  render(<Content />)

  await user.click(screen.getByTestId('collapse-left'))

  expect(screen.getByTestId('left-column')).toHaveClass('content__left-column--collapsed')
})
```

### Test 3: Collapsed left column shows expand button
When collapsed, users need a way to restore the panels. An expand button should appear.
```typescript
it('shows expand button when left column is collapsed', async () => {
  const user = userEvent.setup()
  render(<Content />)

  await user.click(screen.getByTestId('collapse-left'))

  expect(screen.getByTestId('expand-left')).toBeInTheDocument()
})
```

### Test 4: Right column can collapse completely
The right column (Inspector/Config) should collapse to just a thin bar.
```typescript
it('collapses right column when collapse button is clicked', async () => {
  const user = userEvent.setup()
  render(<Content />)

  await user.click(screen.getByTestId('collapse-right'))

  expect(screen.getByTestId('right-column')).toHaveClass('content__right-column--collapsed')
})
```

### Test 5: Bottom panel collapses to tabs only
The output panel should show only its tab bar when collapsed, hiding the terminal content.
```typescript
it('collapses bottom panel to tabs only', async () => {
  const user = userEvent.setup()
  render(<Content />)

  await user.click(screen.getByTestId('collapse-output'))

  expect(screen.getByTestId('output-panel')).toHaveClass('panel--collapsed')
})
```

### Test 6: Collapse state toggles on repeated clicks
Users should be able to toggle between collapsed and expanded states.
```typescript
it('expands left column when expand button is clicked', async () => {
  const user = userEvent.setup()
  render(<Content />)

  // Collapse
  await user.click(screen.getByTestId('collapse-left'))
  expect(screen.getByTestId('left-column')).toHaveClass('content__left-column--collapsed')

  // Expand
  await user.click(screen.getByTestId('expand-left'))
  expect(screen.getByTestId('left-column')).not.toHaveClass('content__left-column--collapsed')
})
```

## Expected Output
```
FAIL src/__tests__/components/layout/Content.test.tsx
  ● Content › renders collapse button for left column
  ● Content › collapses left column when collapse button is clicked
  ● Content › shows expand button when left column is collapsed
  ● Content › collapses right column when collapse button is clicked
  ● Content › collapses bottom panel to tabs only
  ● Content › expands left column when expand button is clicked
```

## Test Summary
| Test | Status | Rationale |
|------|--------|-----------|
| Left column has collapse button | ✅ Pass | Visible control for collapse action |
| Clicking collapse hides left panels | ✅ Pass | Core collapse functionality |
| Collapsed shows expand button | ✅ Pass | Way to restore panels |
| Right column can collapse | ✅ Pass | Independent collapse for right side |
| Bottom panel collapses to tabs | ✅ Pass | Preserve tab access when collapsed |
| Collapse state toggles | ✅ Pass | Repeated clicks toggle state |

## Passing Test Results
```
> frontend@0.0.0 test
> jest

PASS src/__tests__/setup.test.tsx
PASS src/__tests__/components/layout/Header.test.tsx
PASS src/__tests__/components/layout/Content.test.tsx
PASS src/__tests__/components/layout/AppShell.test.tsx

Test Suites: 4 passed, 4 total
Tests:       38 passed, 38 total
Snapshots:   0 total
Time:        3.682 s
```

## Implementation Summary

### Files Modified
- `frontend/src/components/layout/Content.tsx` - Added collapse state, collapse/expand buttons, conditional rendering
- `frontend/src/components/layout/panels/OutputPanel.tsx` - Added collapse props and collapse button in tabs
- `frontend/src/styles/components/layout.css` - Added collapse button styles and collapsed state styles

### Key Implementation Details
1. **Collapse State**: Three independent `useState` hooks manage left, right, and output panel collapse states
2. **CSS Variables**: Collapsed panels set width/height to 0 or minimal values via CSS custom properties
3. **Conditional Rendering**: Panels hide their content when collapsed, showing only the expand button
4. **Output Panel**: Collapse button in tab bar, hides terminal content but preserves tabs
5. **Accessibility**: All buttons have appropriate aria-labels describing the action
