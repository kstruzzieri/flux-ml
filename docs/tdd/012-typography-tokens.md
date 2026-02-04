# TDD: Issue #12 - Typography System

## Issue Summary
Set up the typography system with Inter (UI text) and JetBrains Mono (data/code) fonts, including font loading, CSS variables, and consistent sizing.

## Acceptance Criteria
- [x] Inter renders for UI text
- [x] JetBrains Mono renders for data/code
- [x] Consistent sizing throughout

## Rationale
A typography system provides:
1. **Consistency** - All text styling comes from a single source of truth
2. **Performance** - Fonts loaded with preconnect and display=swap for optimal UX
3. **Maintainability** - Change typography once, update everywhere
4. **Clarity** - Monospace for data ensures alignment and readability

**Font Choices:**
- **Inter**: Modern, highly legible UI font optimized for screens. Excellent for labels, navigation, and general text.
- **JetBrains Mono**: Designed specifically for code, with distinguishable characters (0/O, 1/l/I) and optimal metrics/data alignment.

## Current State Analysis

### Already Implemented (in `tokens.css`)
- Font families: `--font-ui`, `--font-mono`
- Font sizes: `--font-size-xs` (11px) through `--font-size-2xl` (20px)
- Font weights: `--font-weight-normal` (400), `--font-weight-medium` (500), `--font-weight-semibold` (600)
- Line heights: `--line-height-tight` (1.2), `--line-height-normal` (1.5), `--line-height-relaxed` (1.75)

### Missing
- Actual font loading (fonts referenced but not loaded)
- `--font-weight-bold` (700) for completeness
- `--letter-spacing-wide` token (already used in layout.css as hard-coded value)

## Failing Tests

### Test 1: Required typography tokens are defined
```typescript
it('defines all required typography tokens', () => {
  const cssContent = fs.readFileSync(tokensPath, 'utf-8')

  const requiredTokens = [
    '--font-ui',
    '--font-mono',
    '--font-size-xs',
    '--font-size-sm',
    '--font-size-md',
    '--font-size-lg',
    '--font-size-xl',
    '--font-size-2xl',
    '--font-weight-normal',
    '--font-weight-medium',
    '--font-weight-semibold',
    '--font-weight-bold',
    '--line-height-tight',
    '--line-height-normal',
    '--line-height-relaxed',
    '--letter-spacing-wide',
  ]

  requiredTokens.forEach((token) => {
    expect(cssContent).toContain(token)
  })
})
```

### Test 2: Font families reference correct fonts
```typescript
it('font-ui references Inter as primary font', () => {
  const cssContent = fs.readFileSync(tokensPath, 'utf-8')
  expect(cssContent).toMatch(/--font-ui:.*'Inter'/)
})

it('font-mono references JetBrains Mono as primary font', () => {
  const cssContent = fs.readFileSync(tokensPath, 'utf-8')
  expect(cssContent).toMatch(/--font-mono:.*'JetBrains Mono'/)
})
```

## Expected Output
```
FAIL src/__tests__/design-tokens.test.ts
  Design Tokens
    Token definitions
      ✕ defines all required typography tokens (5 ms)
      ✕ font-ui references Inter as primary font (3 ms)
      ✕ font-mono references JetBrains Mono as primary font (2 ms)
```

## Test Summary
| Test | Status | Rationale |
|------|--------|-----------|
| Required typography tokens defined | PASS | Verifies token completeness |
| Font-ui references Inter | PASS | Ensures correct UI font |
| Font-mono references JetBrains Mono | PASS | Ensures correct code font |

## Implementation Plan

### Phase 1: Load Fonts via Google Fonts
Add to `frontend/index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Phase 2: Add Missing Typography Tokens
Add to `frontend/src/styles/tokens.css`:
```css
--font-weight-bold: 700;
--letter-spacing-wide: 0.05em;
```

### Phase 3: Add Typography Tests
Add tests to `frontend/src/__tests__/design-tokens.test.ts` to validate typography tokens.

## Passing Test Results
```
PASS src/__tests__/design-tokens.test.ts
  Design Tokens
    Token definitions
      ✓ defines all required typography tokens (6 ms)
      ✓ font-ui references Inter as primary font (1 ms)
      ✓ font-mono references JetBrains Mono as primary font (1 ms)
      ✓ defines all required color tokens (2 ms)
    Token usage in CSS
      ✓ uses CSS variables for all colors in layout.css (no hard-coded hex) (1 ms)
      ✓ uses var() for color properties (1 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

## Implementation Summary

### Files Created
- `docs/tdd/012-typography-tokens.md` - This TDD documentation

### Files Modified
- `frontend/index.html` - Added Google Fonts preconnect and stylesheet links for Inter and JetBrains Mono
- `frontend/src/styles/tokens.css` - Added:
  - `--font-weight-bold: 700` for bold text
  - `--letter-spacing-wide: 0.05em` for uppercase headers
- `frontend/src/__tests__/design-tokens.test.ts` - Added typography token tests

### Design Decisions
1. **Google Fonts over self-hosting** - Simpler for MVP phase, can switch to self-hosted later if needed
2. **Preconnect hints** - Improves font loading performance by establishing early connections
3. **display=swap** - Prevents Flash of Invisible Text (FOIT), showing system fonts until custom fonts load
4. **Only required weights** - Inter 400/500/600 and JetBrains Mono 400/500 to minimize download size

### Token Summary
The typography system now includes 18 tokens:
- **Font families** (2): `--font-ui` (Inter), `--font-mono` (JetBrains Mono)
- **Font sizes** (6): xs (11px) through 2xl (20px)
- **Font weights** (4): normal (400), medium (500), semibold (600), bold (700)
- **Line heights** (3): tight (1.2), normal (1.5), relaxed (1.75)
- **Letter spacing** (1): wide (0.05em)

### Usage Guidelines
| Use Case | Font Family | Typical Size | Typical Weight |
|----------|-------------|--------------|----------------|
| UI text, labels | `--font-ui` | sm-md | medium |
| Panel headers | `--font-ui` | md | semibold |
| Metrics, data values | `--font-mono` | sm-md | medium |
| Code, terminal | `--font-mono` | sm | normal |
| Navigation | `--font-ui` | sm | medium |
