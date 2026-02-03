# TDD: Issue #9 - Layout State Persistence

## Issue Summary
Persist layout state (panel sizes, collapsed state) across sessions.

## Acceptance Criteria
- [x] Panel sizes persist across restart
- [x] Collapsed state persists
- [x] No layout flash on load

## Rationale
Users spend time customizing their workspace layout - resizing panels to fit their workflow, collapsing panels they don't need. Losing this configuration on every app restart is frustrating and wastes time. Persisting layout state respects user preferences and provides a seamless experience.

## Implementation Note

Initial implementation used localStorage, but Wails webview localStorage does not persist between app restarts. The final implementation uses Go backend file storage (`~/Library/Application Support/Flux/layout.json` on macOS) to reliably persist layout across sessions.

## Test Summary
| Test | Status | Rationale |
|------|--------|-----------|
| Loads layout from Go backend on mount | ✅ Pass | Restore preferences on startup |
| Saves layout to Go backend when values change | ✅ Pass | Persist user's layout customizations |
| Uses defaults when no saved state | ✅ Pass | Graceful first-run experience |
| Collapsed state updates trigger re-render | ✅ Pass | Collapsed panels need immediate visual feedback |
| Saves collapsed state to Go backend | ✅ Pass | Remember collapse preferences |
| Saves immediately when resize ends | ✅ Pass | Persist without debounce on mouse up |

## Passing Test Results
```
> frontend@0.0.0 test
> jest

PASS src/__tests__/setup.test.tsx
PASS src/__tests__/hooks/useLayoutPersistence.test.tsx
PASS src/__tests__/components/layout/Header.test.tsx
PASS src/__tests__/components/layout/Content.test.tsx
PASS src/__tests__/components/layout/AppShell.test.tsx

Test Suites: 5 passed, 5 total
Tests:       44 passed, 44 total
Snapshots:   0 total
Time:        2.5 s
```

## Implementation Summary

### Files Created
- `frontend/src/hooks/useLayoutPersistence.ts` - Hook for persisting and restoring layout state via Go backend
- `frontend/src/__mocks__/wailsjs/go/main/App.ts` - Jest mock for Wails Go bindings
- `frontend/src/__mocks__/wailsjs/go/models.ts` - Jest mock for Wails Go models

### Files Modified
- `app.go` - Added `GetLayout()` and `SaveLayout()` methods for file-based persistence
- `frontend/src/hooks/useResize.ts` - Changed from `onResize` to `onResizeEnd` callback for performance
- `frontend/src/components/layout/Content.tsx` - Integrated layout persistence hook
- `frontend/jest.config.js` - Added Wails mock module mappings
- `frontend/src/setupTests.ts` - Added mock reset before each test

### Key Implementation Details

1. **Go Backend Persistence**: Layout state is stored in `~/Library/Application Support/Flux/layout.json` (macOS) or equivalent config directory on other platforms, ensuring persistence across app restarts.

2. **LayoutState struct**: Defined in Go with JSON tags matching TypeScript interface:
   ```go
   type LayoutState struct {
       LeftWidth       int  `json:"leftWidth"`
       RightWidth      int  `json:"rightWidth"`
       OutputHeight    int  `json:"outputHeight"`
       LeftTopHeight   int  `json:"leftTopHeight"`
       RightTopHeight  int  `json:"rightTopHeight"`
       LeftCollapsed   bool `json:"leftCollapsed"`
       RightCollapsed  bool `json:"rightCollapsed"`
       OutputCollapsed bool `json:"outputCollapsed"`
   }
   ```

3. **Ref-based size tracking**: Panel sizes use refs (`layoutRef`) instead of state to avoid re-renders during resize. Only collapsed states trigger re-renders since they affect visibility.

4. **onResizeEnd callback**: Changed from continuous `onResize` to `onResizeEnd` (mouse up) to improve performance and reduce backend calls.

5. **Async loading with isLoaded flag**: Hook exposes `isLoaded` boolean so components can optionally wait for layout to load before rendering.

6. **Jest mocking**: Wails Go bindings are mocked in tests since `window.go` doesn't exist in jsdom environment. The mock provides controllable Promise-based functions matching the Wails API.
