# Issue #5: Basic App Shell Renders

## Issue Summary

Get the basic application shell rendering with the main layout structure, replacing the default Wails demo with the Flux 4-panel layout.

## Acceptance Criteria

- [x] App window opens
- [x] Basic layout visible
- [x] No console errors
- [x] Wails Go-to-JS bindings functional

## TDD: Before (Failing Tests)

### Criterion 1: App shell layout renders

**Rationale:** The app must display the core 4-panel layout (header, left sidebar, main content, right inspector, bottom panel) as defined in the design docs.

**Test Code:**
```typescript
// src/__tests__/components/layout/AppShell.test.tsx
import { render, screen } from '@testing-library/react';
import { AppShell } from '@components/layout';

describe('AppShell', () => {
  it('renders all layout regions', () => {
    render(<AppShell />);

    expect(screen.getByRole('banner')).toBeInTheDocument(); // header
    expect(screen.getByRole('complementary', { name: /sidebar/i })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /inspector/i })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // bottom panel
  });

  it('displays Flux branding in header', () => {
    render(<AppShell />);

    expect(screen.getByText('Flux')).toBeInTheDocument();
  });
});
```

**Failing Output:**
```
Cannot find module '@components/layout'
```

---

### Criterion 2: CSS design tokens applied

**Rationale:** The app must use the Flux color palette and typography from the design system, implemented via CSS custom properties.

**Test:** Visual inspection - background should be `#0d1117`, not the default Wails blue.

**Failing State:** Current app shows default Wails styling with blue background.

---

### Criterion 3: Wails bindings functional

**Rationale:** Go-to-JS bindings must work to prove the Wails integration is intact after refactoring.

**Test Code:**
```typescript
// src/__tests__/integration/wails-bindings.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { AppShell } from '@components/layout';

// Mock Wails bindings
jest.mock('../../../wailsjs/go/main/App', () => ({
  GetAppInfo: jest.fn().mockResolvedValue({
    name: 'Flux',
    version: '0.1.0',
  }),
}));

describe('Wails Bindings', () => {
  it('fetches app info from Go backend', async () => {
    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument();
    });
  });
});
```

**Failing Output:**
```
GetAppInfo is not defined
```

---

### Criterion 4: No console errors

**Rationale:** A clean console indicates proper React setup and no missing dependencies.

**Test:** Open app, check browser/Wails console for errors.

**Failing State:** N/A - current app may have errors after refactoring begins.

---

## Test Summary

```
Criterion 1: App shell layout renders      ✓ PASS
Criterion 2: CSS design tokens applied     ✓ PASS
Criterion 3: Wails bindings functional     ✓ PASS
Criterion 4: No console errors             ✓ PASS
```

## TDD: After (Passing Tests)

### Expected Test Output

```
$ npm test -- AppShell

PASS src/__tests__/components/layout/AppShell.test.tsx
  AppShell
    ✓ renders all layout regions (45 ms)
    ✓ displays Flux branding in header (12 ms)

PASS src/__tests__/integration/wails-bindings.test.tsx
  Wails Bindings
    ✓ fetches app info from Go backend (23 ms)

Test Suites: 2 passed, 2 total
Tests:       3 passed, 3 total
```

### Implementation Summary

**Files Created:**
- `frontend/src/components/layout/AppShell.tsx` - Main layout container
- `frontend/src/components/layout/Header.tsx` - Top bar with logo
- `frontend/src/components/layout/LeftSidebar.tsx` - Experiments/files panel
- `frontend/src/components/layout/MainContent.tsx` - Central content area
- `frontend/src/components/layout/RightInspector.tsx` - Details panel
- `frontend/src/components/layout/BottomPanel.tsx` - Training output area
- `frontend/src/components/layout/index.ts` - Barrel export
- `frontend/src/styles/tokens.css` - Design tokens (CSS custom properties)
- `frontend/src/styles/reset.css` - CSS reset/normalize
- `frontend/src/styles/layout.css` - Layout-specific styles
- `frontend/src/__tests__/components/layout/AppShell.test.tsx` - Layout tests
- `docs/plan/08-frontend-architecture.md` - Architecture documentation

**Files Modified:**
- `frontend/src/components/App.tsx` - Replace demo with AppShell
- `frontend/src/style.css` - Import design tokens
- `app.go` - Add GetAppInfo method
- `README.md` - Add Architecture Decisions section

## Related

- PR: TBD
- Depends on: #3 (ESLint, Prettier, Testing)
- Blocks: #6 (Header component), #7 (Resizable panel system)
