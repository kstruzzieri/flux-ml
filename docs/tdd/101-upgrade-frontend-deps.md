# TDD: Issue #101 - Upgrade Frontend Dependencies

## Issue Summary
Upgrade core frontend dependencies to latest stable versions: React 18 → 19, pin TypeScript ~5.9.3, keep Vite 7 (v8 is beta only). Apply required React 19 code refactors.

## Acceptance Criteria
- [x] All 171+ frontend tests pass after upgrades
- [x] `forwardRef` removed from icon components
- [x] `JSX.Element` replaced with `React.JSX.Element`
- [x] README badges updated to reflect new versions
- [x] No new deprecation warnings in test output

## Rationale
React 19 brings ref-as-prop (eliminating `forwardRef` boilerplate), improved performance, and the foundation for future features like Server Components. TypeScript 5.9.3 is already the resolved version — pinning with `~` prevents unexpected minor version jumps. Vite 8 is still in beta (8.0.0-beta.13), so we stay on the stable Vite 7.3.1.

## Dependency Changes

| Package | Before | After |
|---------|--------|-------|
| `react` | ^18.3.1 (18.3.1) | ^19.2.4 (19.2.4) |
| `react-dom` | ^18.3.1 (18.3.1) | ^19.2.4 (19.2.4) |
| `@types/react` | ^18.3.18 | ^19.2.13 |
| `@types/react-dom` | ^18.3.5 | ^19.2.3 |
| `typescript` | ^5.7.3 (5.9.3) | ~5.9.3 (5.9.3) |
| `vite` | ^7.3.1 | ^7.3.1 (unchanged) |
| `@vitejs/plugin-react` | ^4.3.4 | ^4.3.4 (unchanged) |

## Code Changes

### Remove `forwardRef` wrappers
React 19 passes `ref` as a regular prop, making `forwardRef` unnecessary.

**createIcon.tsx** — `createIcon()` and `createFilledIcon()`:
```typescript
// Before (React 18)
const Icon = forwardRef<SVGSVGElement, IconProps>(({ size, label, className, ...props }, ref) => { ... })

// After (React 19)
function Icon({ ref, size, label, className, ...props }: IconProps & { ref?: React.Ref<SVGSVGElement> }) { ... }
```

**FileIcon.tsx**:
```typescript
// Before (React 18)
export const FileIcon = forwardRef<HTMLSpanElement, FileIconProps>(({ extension, ... }, ref) => { ... })

// After (React 19)
export function FileIcon({ ref, extension, ... }: FileIconProps & { ref?: React.Ref<HTMLSpanElement> }) { ... }
```

### Replace `JSX.Element` → `React.JSX.Element`
React 19 removed the global `JSX` namespace.

**Header.tsx** and **ActivityBar.tsx**:
```typescript
// Before
const NAV_ITEMS: { id: ViewId; label: string; icon: JSX.Element }[] = [...]

// After
const NAV_ITEMS: { id: ViewId; label: string; icon: React.JSX.Element }[] = [...]
```

## Test Results

### Passing Tests
```
Test Suites: 17 passed, 17 total
Tests:       171 passed, 171 total
Time:        6.505s
```

All 171 tests pass across 17 suites. No new deprecation warnings. Production build succeeds.

## Implementation Summary
1. Upgraded `react`/`react-dom` from 18.3.1 to 19.2.4
2. Upgraded `@types/react` and `@types/react-dom` to v19
3. Pinned `typescript` to `~5.9.3`
4. Removed `forwardRef` from `createIcon.tsx` (2 functions) and `FileIcon.tsx` (1 component)
5. Replaced `JSX.Element` with `React.JSX.Element` in `Header.tsx` and `ActivityBar.tsx`
6. Updated README badge and tech stack text
7. Kept Vite at 7.3.1 (v8 is beta only)
