# Issue #3: Configure ESLint, Prettier, and Testing

## Issue Summary

Set up code quality tooling and testing infrastructure with fast test execution using @swc/jest.

## Acceptance Criteria

- [x] ESLint catches issues
- [x] Prettier formats on save
- [x] Tests run fast with @swc/jest
- [x] Pre-commit hooks prevent bad commits
- [x] GitHub Actions CI runs on PRs

## TDD: Before (Failing Tests)

### Criterion 1: ESLint catches TypeScript/React issues

**Rationale:** ESLint must catch common issues like unused variables, missing dependencies in useEffect, and React-specific problems.

**Test:** Create a file with intentional issues:
```typescript
// src/__tests__/lint-test.tsx
import { useState } from 'react';

function BadComponent() {
  const [count, setCount] = useState(0);
  const unused = 'this should trigger warning';  // unused variable

  useEffect(() => {
    console.log(count);
  }, []);  // missing dependency

  return <div>{count}</div>;
}
```

**Expected ESLint Output:**
```
error  'unused' is assigned a value but never used  @typescript-eslint/no-unused-vars
error  React Hook useEffect has a missing dependency: 'count'  react-hooks/exhaustive-deps
```

---

### Criterion 2: Prettier formats consistently

**Rationale:** Consistent formatting prevents merge conflicts and improves readability.

**Test:** Run prettier check on unformatted code:
```bash
npx prettier --check "src/**/*.{ts,tsx}"
```

**Expected Output (before config):**
```
Checking formatting...
[error] Some files are not formatted
```

---

### Criterion 3: Tests run with @swc/jest

**Rationale:** Tests must execute quickly (<5s for unit tests) to encourage TDD practices.

**Test Code:**
```typescript
// src/__tests__/setup.test.ts
describe('Test Setup', () => {
  it('runs TypeScript tests', () => {
    const add = (a: number, b: number): number => a + b;
    expect(add(1, 2)).toBe(3);
  });

  it('supports React Testing Library', () => {
    // Will fail until RTL is configured
    const { render, screen } = require('@testing-library/react');
    render(<div>Hello</div>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

**Failing Output:**
```
Cannot find module '@swc/jest'
```

---

### Criterion 4: Pre-commit hooks run linting

**Rationale:** Bad code should be caught before commit, not in CI.

**Test:** Attempt to commit code with lint errors.

**Expected behavior:** Commit blocked with lint errors shown.

---

## Test Summary

```
$ npm test
Command not found or configuration missing
```

## TDD: After (Passing Tests)

All checks pass:

```
$ npm run typecheck && npm run lint && npm run format:check && npm test

> tsc --noEmit
> eslint src --ext .ts,.tsx
> prettier --check "src/**/*.{ts,tsx,css}"
All matched files use Prettier code style!

PASS src/__tests__/setup.test.tsx
  Test Setup
    ✓ runs TypeScript tests (2 ms)
    ✓ supports React Testing Library (25 ms)
    ✓ supports jest-dom matchers (40 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Time:        1.614 s
```

### Implementation Summary

**Files Created:**
- `frontend/eslint.config.js` - ESLint flat config for v9
- `frontend/.prettierrc` - Prettier configuration
- `frontend/.prettierignore` - Prettier ignore patterns
- `frontend/jest.config.js` - Jest configuration with @swc/jest
- `frontend/src/setupTests.ts` - Jest DOM setup
- `frontend/src/__mocks__/fileMock.js` - Asset mock for tests
- `frontend/src/__tests__/setup.test.tsx` - Verification tests
- `.husky/pre-commit` - Pre-commit hook running lint-staged
- `.github/workflows/ci.yml` - GitHub Actions CI workflow
- `package.json` - Root package.json with husky + lint-staged

**Files Modified:**
- `frontend/package.json` - Add dev dependencies and npm scripts

## Related

- PR: TBD
- Depends on: #2 (TypeScript configuration)
- Blocks: All future features (quality gates)
