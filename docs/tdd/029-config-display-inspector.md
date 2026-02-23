# TDD: Issue #29 - Config Display in Inspector

## Issue Summary
Add experiment configuration display to the right panel. InspectorPanel (top right) shows experiment metadata — name, status badge, ID, and timestamps. ConfigPanel (bottom right) shows parsed config as a clickable key-value list. Both panels read the selected experiment from the experiment store and show placeholder text when nothing is selected.

## Acceptance Criteria
- [x] Default panel heights changed to 500px (left) and 450px (right) for top panels
- [x] Seed config data enriched with varied, realistic fields per experiment
- [x] InspectorPanel shows placeholder when no experiment selected
- [x] InspectorPanel shows experiment name, status badge, truncated ID, and formatted timestamps when selected
- [x] ConfigPanel shows placeholder when no experiment selected
- [x] ConfigPanel parses config JSON and renders key-value rows
- [x] Config values displayed in cyan monospace, keys in secondary text
- [x] Config rows are clickable with hover highlight (future: navigate to Code View)
- [x] ConfigPanel handles empty, invalid, and array config JSON gracefully
- [x] CSS added for config display
- [x] All existing tests continue to pass

## Rationale
1. **Metadata at a glance** — InspectorPanel gives researchers quick context (name, status, age) without navigating away from the dashboard.
2. **Config as key-value list** — Parsed JSON is easier to scan than raw text. Cyan monospace values match the design system's data display pattern.
3. **Clickable rows** — Visual interactivity (hover/cursor) establishes the pattern for future navigation to Code View.
4. **Graceful error handling** — Config is stored as a JSON string at creation time. Invalid JSON, empty strings, and arrays are all handled without crashing.
5. **Larger top panels** — 500px left / 450px right defaults (up from 200px) give the inspector and experiments panels more room, roughly 60/40 left split and 50/50 right split.

## Failing Tests

### InspectorPanel (5 tests)

```typescript
it('renders placeholder when no experiment selected', ...)
it('shows experiment name when selected', ...)
it('shows status indicator with correct label', ...)
it('shows experiment ID in monospace', ...)
it('shows formatted timestamps', ...)
```

### ConfigPanel (7 tests)

```typescript
it('renders placeholder when no experiment selected', ...)
it('renders "No configuration data" when config is empty string', ...)
it('renders config key-value pairs from valid JSON', ...)
it('config values are displayed in monospace', ...)
it('config items have pointer cursor for clickability', ...)
it('handles invalid JSON gracefully', ...)
it('handles JSON array gracefully', ...)
```

## Expected Output
All failing tests should fail with "module not found" or "function not defined" errors before implementation, then pass after implementation.

## Test Summary

| Suite | Tests | Status |
|-------|-------|--------|
| InspectorPanel.test.tsx | 5 | PASS |
| ConfigPanel.test.tsx | 7 | PASS |
| Content.test.tsx (updated) | 2 updated | PASS |
| **Total new tests** | **12** | **PASS** |
| **Full suite** | **289 tests, 27 suites** | **ALL PASS** |

## Passing Test Results
```
Test Suites: 27 passed, 27 total
Tests:       289 passed, 289 total
Snapshots:   0 total
```

## Implementation Summary

### Files Created (3)
| File | Purpose |
|------|---------|
| `frontend/src/__tests__/.../InspectorPanel.test.tsx` | 5 tests for inspector metadata display |
| `frontend/src/__tests__/.../ConfigPanel.test.tsx` | 7 tests for config key-value display |
| `docs/tdd/029-config-display-inspector.md` | TDD document |

### Files Modified (7)
| File | Changes |
|------|---------|
| `app.go` | Default panel heights 200→500 (left) and 200→450 (right) |
| `frontend/src/hooks/useLayoutPersistence.ts` | Default heights 200→500/450 |
| `frontend/src/__mocks__/wailsjs/go/main/App.ts` | Mock default heights 200→500/450 |
| `frontend/src/__mocks__/wailsjs/go/models.ts` | Mock model defaults 200→500/450 |
| `internal/experiment/seed.go` | Per-experiment config with model, lr, batch_size, kl_coef, optimizer, max_steps, warmup_steps |
| `frontend/src/components/layout/panels/InspectorPanel.tsx` | Experiment metadata: name, status badge, truncated ID, timestamps |
| `frontend/src/components/layout/panels/ConfigPanel.tsx` | Parsed config key-value list |
| `frontend/src/styles/components/layout.css` | CSS for config-item, config-list |
| `frontend/src/__tests__/.../Content.test.tsx` | Updated drag-resize expectations for new 500/450px defaults |
