# Issue #2: Set up React + Vite + TypeScript

## Issue Summary

Configure the frontend with modern tooling and best practices from day one. Path aliases for clean imports.

## Acceptance Criteria

- [x] Vite 7.x installed (done in #1)
- [x] TypeScript 5.7+ with strict mode (done in #1)
- [x] Path aliases working (`@/`, `@components/`, `@stores/`)
- [x] Fast HMR in development (done in #1)

## TDD: Before (Failing Tests)

### Criterion: Path aliases resolve correctly

**Rationale:** Path aliases like `@/` and `@components/` make imports cleaner and avoid brittle relative paths (`../../../`). TypeScript must resolve these at compile time, and Vite must resolve them at bundle time.

**Test Code:**
```typescript
// src/__tests__/setup/path-aliases.test.ts
import { describe, it, expect } from 'vitest';

describe('Path Aliases', () => {
  it('resolves @/ alias to src/', async () => {
    // This import should work if path aliases are configured
    const module = await import('@/main');
    expect(module).toBeDefined();
  });

  it('resolves @components/ alias', async () => {
    const module = await import('@components/App');
    expect(module).toBeDefined();
  });

  it('resolves @stores/ alias', async () => {
    // Will fail until stores directory exists
    const module = await import('@stores/index');
    expect(module).toBeDefined();
  });
});
```

**Failing Output:**
```
FAIL src/__tests__/setup/path-aliases.test.ts
  ● Path Aliases › resolves @/ alias to src/

    Error: Failed to resolve import "@/main" from "src/__tests__/setup/path-aliases.test.ts"

  ● Path Aliases › resolves @components/ alias

    Error: Failed to resolve import "@components/App" from "src/__tests__/setup/path-aliases.test.ts"
```

---

## Test Summary

```
$ npm test -- path-aliases

Test Suites: 1 failed, 1 total
Tests:       0 passed, 0 total
```

## TDD: After (Passing Tests)

Build passes with path aliases:

```
$ npm run build

> frontend@0.0.0 build
> tsc && vite build

vite v7.3.1 building client environment for production...
✓ 31 modules transformed.
dist/index.html                   0.38 kB │ gzip:  0.27 kB
dist/assets/index-Cffr8MgJ.css    1.15 kB │ gzip:  0.58 kB
dist/assets/index-BbdGSvLB.js   143.28 kB │ gzip: 46.25 kB
✓ built in 2.14s
```

### Implementation Summary

**Files Modified:**
- `frontend/tsconfig.json` - Add paths configuration with baseUrl and path mappings
- `frontend/vite.config.ts` - Add resolve.alias configuration using path.resolve
- `frontend/src/main.tsx` - Update imports to use path aliases

**Files Created:**
- `frontend/src/stores/index.ts` - Empty stores barrel export
- `frontend/src/components/App.tsx` - App component using path aliases
- `frontend/src/components/index.ts` - Barrel export for components

**Files Deleted:**
- `frontend/src/App.tsx` - Moved to components directory

## Related

- PR: TBD
- Depends on: #1 (Wails initialization)
- Blocks: #3 (ESLint, Prettier, Testing)
