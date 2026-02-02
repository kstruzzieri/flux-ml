# TDD: Issue #7 - Resizable Panel System

## Issue Summary
Implement resizable panel layout with drag handles for the island-style panel grid.

## Acceptance Criteria
- [x] All six panels render in grid layout
- [x] Panels resize via drag handles
- [x] Minimum sizes enforced
- [x] Resize feels smooth

## Rationale
Users need to customize their workspace based on current tasks. When analyzing metrics, they may want a larger main panel. When debugging, they may want more space for output. Resizable panels allow users to optimize their layout without leaving the app.

## Failing Tests

### Test 1: Drag handles render between resizable panels
Drag handles provide the visual affordance and interaction target for resizing. Without visible handles, users wouldn't know panels are resizable.
```typescript
it('renders drag handles between resizable panels', () => {
  render(<Content />)

  expect(screen.getByTestId('resize-handle-left')).toBeInTheDocument()
  expect(screen.getByTestId('resize-handle-right')).toBeInTheDocument()
  expect(screen.getByTestId('resize-handle-output')).toBeInTheDocument()
})
```

### Test 2: Dragging handle updates panel width
Users resize panels by dragging handles. The panel width should update in real-time as the user drags, providing immediate visual feedback.
```typescript
it('updates left column width when handle is dragged', () => {
  render(<Content />)

  const handle = screen.getByTestId('resize-handle-left')
  const content = screen.getByTestId('content')

  fireEvent.mouseDown(handle, { clientX: 280 })
  fireEvent.mouseMove(document, { clientX: 350 })
  fireEvent.mouseUp(document)

  expect(content.style.getPropertyValue('--panel-left-width')).toBe('350px')
})
```

### Test 3: Minimum panel width is enforced
Minimum widths prevent panels from becoming too small to be useful. Without constraints, users could accidentally hide important content.
```typescript
it('enforces minimum width when dragging left handle', () => {
  render(<Content />)

  const handle = screen.getByTestId('resize-handle-left')
  const content = screen.getByTestId('content')

  fireEvent.mouseDown(handle, { clientX: 280 })
  fireEvent.mouseMove(document, { clientX: 100 })
  fireEvent.mouseUp(document)

  expect(content.style.getPropertyValue('--panel-left-width')).toBe('200px')
})
```

### Test 4: Cursor changes during drag
Cursor feedback indicates the drag operation is active and shows the resize direction, following standard desktop UI conventions.
```typescript
it('shows resize cursor while dragging', () => {
  render(<Content />)

  const handle = screen.getByTestId('resize-handle-left')

  fireEvent.mouseDown(handle, { clientX: 280 })
  expect(document.body).toHaveClass('resizing-col')

  fireEvent.mouseUp(document)
  expect(document.body).not.toHaveClass('resizing-col')
})
```

### Test 5: Drag handles have correct cursor on hover
Hover state prepares the user for interaction, indicating that the handle is interactive before they click.
```typescript
it('has col-resize cursor on vertical handle hover', () => {
  render(<Content />)

  const handle = screen.getByTestId('resize-handle-left')
  expect(handle).toHaveClass('resize-handle--vertical')
})
```

## Expected Output
```
FAIL src/__tests__/components/layout/Content.test.tsx
  ● Content › renders drag handles between resizable panels
  ● Content › updates left column width when handle is dragged
  ● Content › enforces minimum width when dragging left handle
  ● Content › shows resize cursor while dragging
  ● Content › has col-resize cursor on vertical handle hover
```

## Test Summary
| Test | Status | Rationale |
|------|--------|-----------|
| Drag handles render between panels | ✅ Pass | Visual affordance for resizing |
| Updates left column width on drag | ✅ Pass | Real-time feedback during resize |
| Minimum panel width enforced | ✅ Pass | Prevent unusable small panels |
| Cursor changes during drag | ✅ Pass | Standard desktop UI convention |
| Vertical handle has col-resize cursor | ✅ Pass | Hover state indicates interactivity |
| Updates right column width on drag | ✅ Pass | Independent resize for each column |
| Updates output height on drag | ✅ Pass | Vertical resize for output panel |
| Horizontal handle has row-resize cursor | ✅ Pass | Direction-appropriate cursor feedback |

## Passing Test Results
```
> frontend@0.0.0 test
> jest

PASS src/__tests__/setup.test.tsx
PASS src/__tests__/components/layout/Content.test.tsx
PASS src/__tests__/components/layout/Header.test.tsx
PASS src/__tests__/components/layout/AppShell.test.tsx

Test Suites: 4 passed, 4 total
Tests:       30 passed, 30 total
Snapshots:   0 total
Time:        2.365 s
```

## Implementation Summary

### Files Created
- `frontend/src/hooks/useResize.ts` - Custom hooks for resize logic
  - `useResize` - Standard resize (dragging right increases size)
  - `useResizeInverted` - Inverted resize (dragging left increases size, for right panel)
  - `useResizeVerticalInverted` - Vertical inverted resize (dragging up increases size, for output panel)
- `frontend/src/hooks/index.ts` - Hook exports
- `frontend/src/__tests__/components/layout/Content.test.tsx` - 8 tests for resize functionality

### Files Modified
- `frontend/src/components/layout/Content.tsx` - Added resize handles and dynamic CSS variables
- `frontend/src/styles/components/layout.css` - Added resize handle styles and body cursor classes

### Key Implementation Details
1. **CSS Variable Approach**: Panel sizes are controlled via CSS custom properties (`--panel-left-width`, `--panel-right-width`, `--panel-output-height`) set on the content container, allowing the grid to respond to size changes
2. **Three Resize Hooks**: Different hooks handle the math for each resize direction - left panel (normal), right panel (inverted horizontal), output panel (inverted vertical)
3. **Minimum/Maximum Constraints**: Left/right panels: 200-500px, output panel: 100-400px
4. **Body Cursor Classes**: During drag, body gets `resizing-col` or `resizing-row` class to override all element cursors
5. **Grid Positioning**: Resize handles use grid-area placement to position themselves between panels without affecting the panel layout
