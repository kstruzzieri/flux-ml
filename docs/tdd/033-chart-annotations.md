# TDD: Issue #33 — Chart Annotations

## Issue Summary
Add annotation support to all chart types — dashed vertical lines, color-coded by type (checkpoint, config_change, alert, note), with hover tooltips. Both system-generated and user-created annotations are supported.

## Acceptance Criteria
- [ ] SQLite `annotations` table with FK to experiments, ON DELETE CASCADE
- [ ] Annotation store (`internal/annotation/store.go`) with Create, Query, Delete
- [ ] API layer (`annotation_api.go`) emitting `annotation:created` / `annotation:deleted` events
- [ ] Frontend `Annotation` type and `ANNOTATION_COLORS` constants
- [ ] Zustand `annotationStore` with event-driven updates (200ms debounce)
- [ ] uPlot `annotationsPlugin` rendering dashed vertical lines with hover tooltip
- [ ] `TimeSeriesChart` and `MultiLineChart` accept optional `annotations` prop
- [ ] `ChartsArea` fetches and passes annotations to charts
- [ ] All backend tests pass (`go test ./...`)
- [ ] All frontend tests pass (`npm test`)

## Rationale
ML practitioners need to visually correlate data trends with training events. Annotations provide contextual markers — when a checkpoint was saved, when hyperparameters changed, when an anomaly was detected — directly overlaid on charts. This avoids the mental overhead of cross-referencing logs with chart timestamps.

**Design decisions:**
- **Separate table** rather than modifying events — events are timestamp-indexed (wall-clock), charts are step-indexed. Annotations are a step-indexed read model optimized for chart display.
- **Full-height dashed lines** — subtle enough not to obscure data, visible enough to catch attention. Color-coded by type for quick visual classification.
- **DOM tooltip** rather than React state — avoids 60fps re-renders on mouse move. Direct DOM manipulation in the uPlot setCursor hook is the idiomatic approach for high-frequency updates.

## Failing Tests (TDD)

### Backend — Store Tests
```
go test ./internal/annotation/... -v
--- FAIL: TestCreate (expected: annotation stored and retrieved)
--- FAIL: TestQuery_FilterByType (expected: type filter works)
--- FAIL: TestQuery_FilterByStepRange (expected: step range filter works)
--- FAIL: TestDelete (expected: annotation removed)
--- FAIL: TestCascadeDelete (expected: annotations deleted with experiment)
```

### Backend — API Tests
```
go test -run 'TestApp_.*Annotation' -v
--- FAIL: TestApp_CreateAnnotation (expected: annotation created via API)
--- FAIL: TestApp_QueryAnnotations (expected: annotations queried via API)
--- FAIL: TestApp_DeleteAnnotation (expected: annotation deleted via API)
--- FAIL: TestApp_NilAnnotationStore (expected: nil store returns error)
```

### Frontend — Store Tests
```
npm test -- annotationStore
--- FAIL: fetchAnnotations populates state
--- FAIL: createAnnotation calls the API
--- FAIL: deleteAnnotation removes annotation
--- FAIL: annotation:created event triggers re-fetch
--- FAIL: annotation:deleted event triggers re-fetch
```

### Frontend — Plugin Tests
```
npm test -- annotationsPlugin
--- FAIL: returns plugin with draw and setCursor hooks
--- FAIL: draw hook renders dashed lines
--- FAIL: draw hook skips out-of-range annotations
--- FAIL: correct colors per type
```

## Expected Output
All tests pass. Charts display dashed vertical lines at annotation steps, color-coded by type. Hover near a line shows a tooltip with type, step, and label.

## Test Summary

### Backend (Go)
| Test | Status |
|---|---|
| TestCreate | PASS |
| TestCreate_EmptyExperimentID | PASS |
| TestCreate_EmptyType | PASS |
| TestCreate_ForeignKeyViolation | PASS |
| TestCreate_EmptyData | PASS |
| TestQuery_EmptyExperimentID | PASS |
| TestQuery_All | PASS |
| TestQuery_FilterByType | PASS |
| TestQuery_FilterByStepRange | PASS |
| TestQuery_NoMatches | PASS |
| TestDelete | PASS |
| TestDelete_NotFound | PASS |
| TestCascadeDelete | PASS |
| TestApp_CreateAnnotation | PASS |
| TestApp_QueryAnnotations | PASS |
| TestApp_DeleteAnnotation | PASS |
| TestApp_NilAnnotationStore | PASS |

### Frontend (Jest)
| Test | Status |
|---|---|
| annotationStore: fetchAnnotations populates state | PASS |
| annotationStore: empty experiment returns empty array | PASS |
| annotationStore: createAnnotation calls API | PASS |
| annotationStore: deleteAnnotation removes annotation | PASS |
| annotationStore: annotation:created triggers re-fetch | PASS |
| annotationStore: annotation:deleted triggers re-fetch | PASS |
| annotationsPlugin: returns draw and setCursor hooks | PASS |
| annotationsPlugin: draw renders dashed vertical lines | PASS |
| annotationsPlugin: skips out-of-range annotations | PASS |
| annotationsPlugin: correct colors per type | PASS |
| annotationsPlugin: empty annotations no-op | PASS |
| annotationsPlugin: hides tooltip when cursor outside | PASS |

## Passing Test Results
*(To be filled after running tests)*

## Implementation Summary

### New Files
- `internal/database/migrations/004_annotations.sql` — annotations table + index
- `internal/annotation/store.go` — Create, Query, Delete operations
- `internal/annotation/store_test.go` — 13 store tests
- `annotation_api.go` — Wails API with event emission
- `frontend/src/types/annotation.ts` — Annotation type + ANNOTATION_COLORS
- `frontend/src/stores/annotationStore.ts` — Zustand store with event-driven updates
- `frontend/src/components/Charts/annotationsPlugin.ts` — uPlot draw + setCursor hooks
- `frontend/src/__tests__/stores/annotationStore.test.ts` — store tests
- `frontend/src/__tests__/components/Charts/annotationsPlugin.test.ts` — plugin tests
- `docs/tdd/033-chart-annotations.md` — this document

### Modified Files
- `app.go` — added `annotations *annotation.Store` field + init
- `app_api_test.go` — 4 annotation API tests
- `internal/database/migrate_test.go` — updated version count + cascade test
- `frontend/wailsjs/go/models.ts` — added annotation namespace
- `frontend/wailsjs/go/main/App.{js,d.ts}` — added annotation bindings
- `frontend/src/components/Charts/TimeSeriesChart.tsx` — annotations prop + plugins
- `frontend/src/components/Charts/MultiLineChart.tsx` — annotations prop + plugins
- `frontend/src/components/Charts/index.ts` — export annotationsPlugin
- `frontend/src/components/Experiments/ChartsArea.tsx` — fetch + pass annotations
- `frontend/src/stores/index.ts` — export annotationStore
- `frontend/src/__mocks__/wailsjs/go/main/App.ts` — annotation mock functions
- `frontend/src/__mocks__/wailsjs/go/models.ts` — annotation mock model
