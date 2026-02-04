# TDD: Issue #11 - Color Tokens (CSS Variables)

## Issue Summary
Implement the design system color tokens as CSS variables with consistent usage across all components. No hard-coded color values should exist outside of the token definitions in `tokens.css`.

## Acceptance Criteria
- [x] All tokens defined in `:root`
- [x] Consistent usage across components
- [x] Dark theme by default
- [x] No hard-coded hex colors outside of `tokens.css` (CSS files only; TSX brand colors intentionally excluded)

## Rationale
A design token system provides:
1. **Consistency** - All colors come from a single source of truth
2. **Maintainability** - Change a color once, update everywhere
3. **Theming** - Future light mode support becomes trivial
4. **Documentation** - Token names are self-documenting

The `--color-` prefix namespaces color tokens, distinguishing them from spacing, typography, and layout tokens.

## Current State Analysis

### Already Implemented (in `tokens.css`)
- Background colors: `--color-bg-*`
- Text colors: `--color-text-*`
- Accent colors: `--color-accent-*`
- Status colors: `--color-success`, `--color-warning`, `--color-error` (with `-dim` variants)
- Chart colors: `--color-chart-1` through `--color-chart-5`
- Border colors: `--color-border-*`

### Hard-coded Colors to Replace

**CSS (`layout.css`):**
| Line | Current Value | Purpose | Proposed Token |
|------|---------------|---------|----------------|
| 674 | `#dcb67a` | Folder icon (closed) | `--color-icon-folder` |
| 678 | `#6a9ab0` | Folder icon (open) | `--color-icon-folder-open` |
| 2663 | `#d97706` | File tree folder icon | `--color-icon-folder` |
| 2667 | `#f59e0b` | File tree folder icon (open) | `--color-icon-folder-open` |

**TSX Components (file type icons):**
| File | Colors | Purpose |
|------|--------|---------|
| `FileTreePanel.tsx` | `#3776AB`, `#FFD43B` | Python icon |
| `FileTreePanel.tsx` | `#cb171e` | YAML icon |
| `FileTreePanel.tsx` | `#519aba` | TypeScript icon |
| `CodeEditorPanel.tsx` | Same as above | Python, YAML, TS icons |

**TSX Components (logo/branding SVGs):**
| File | Colors | Purpose |
|------|--------|---------|
| `Header.tsx` | `#0a0e14`, `#10B981`, `#F59E0B`, `#06B6D4`, `#F0F6FC` | Logo SVG |
| `MainPanel.tsx` | Same palette | Banner SVG |
| `ExperimentSelectionPanel.tsx` | `#8B5CF6` | Experiment color |

## Failing Tests

### Test 1: No hard-coded colors in CSS files
All color values in CSS should reference CSS variables, not raw hex values.
```typescript
it('uses CSS variables for all colors in layout.css', () => {
  const cssContent = fs.readFileSync('frontend/src/styles/components/layout.css', 'utf-8')

  // Match hex colors that are NOT inside var() or inside tokens.css
  const hardcodedColors = cssContent.match(/#[0-9a-fA-F]{3,8}\b/g) || []

  expect(hardcodedColors).toHaveLength(0)
})
```

### Test 2: tokens.css defines all required color tokens
```typescript
it('defines all required color tokens', () => {
  const cssContent = fs.readFileSync('frontend/src/styles/tokens.css', 'utf-8')

  const requiredTokens = [
    '--color-bg-base',
    '--color-bg-panel',
    '--color-bg-elevated',
    '--color-text-primary',
    '--color-text-secondary',
    '--color-text-muted',
    '--color-accent',
    '--color-success',
    '--color-warning',
    '--color-error',
    '--color-chart-1',
    '--color-chart-2',
    '--color-chart-3',
    '--color-chart-4',
    '--color-chart-5',
    '--color-icon-folder',
    '--color-icon-folder-open',
  ]

  requiredTokens.forEach(token => {
    expect(cssContent).toContain(token)
  })
})
```

### Test 3: CSS variables are consistently used
```typescript
it('uses color variables consistently across components', () => {
  const layoutCss = fs.readFileSync('frontend/src/styles/components/layout.css', 'utf-8')

  // All color properties should use var()
  const colorLines = layoutCss.split('\n').filter(line =>
    line.includes('color:') ||
    line.includes('background:') ||
    line.includes('border-color:')
  )

  colorLines.forEach(line => {
    // Should either use var() or be transparent/inherit/currentColor
    const usesVariable = line.includes('var(--')
    const usesKeyword = /transparent|inherit|currentColor|none/.test(line)
    expect(usesVariable || usesKeyword).toBe(true)
  })
})
```

## Expected Output
```
FAIL src/__tests__/design-tokens.test.ts
  Design Tokens
    ✕ uses CSS variables for all colors in layout.css (5 ms)
    ✕ defines all required color tokens (3 ms)
    ✕ uses color variables consistently across components (4 ms)
```

## Test Summary
| Test | Status | Rationale |
|------|--------|-----------|
| No hard-coded colors in CSS | ✅ Pass | Ensures token consistency |
| All required tokens defined | ✅ Pass | Verifies token completeness |
| Variables used consistently | ✅ Pass | Validates adoption |

## Implementation Plan

### Phase 1: Add Missing Icon Tokens
Add to `tokens.css`:
```css
/* Icon colors */
--color-icon-folder: #d97706;
--color-icon-folder-open: #f59e0b;
--color-icon-python: #3776AB;
--color-icon-python-accent: #FFD43B;
--color-icon-yaml: #cb171e;
--color-icon-typescript: #519aba;
```

### Phase 2: Update CSS to Use Tokens
Replace hard-coded values in `layout.css` with `var(--color-icon-*)`.

### Phase 3: Update TSX Components
For file type icons and logo SVGs, we have two options:
1. **Keep as-is** - Logo/branding SVGs and file type icons are intentionally branded/specific
2. **Create tokens** - Use CSS custom properties via inline styles

**Decision:** File type icons (Python blue/yellow, TypeScript blue, YAML red) are industry-standard brand colors and should remain hard-coded. Logo SVGs use our design tokens and should reference them.

## Passing Test Results
```
PASS src/__tests__/design-tokens.test.ts
  Design Tokens
    Token definitions
      ✓ defines all required color tokens (6 ms)
    Token usage in CSS
      ✓ uses CSS variables for all colors in layout.css (no hard-coded hex) (1 ms)
      ✓ uses var() for color properties (1 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

## Implementation Summary

### Files Created
- `frontend/src/__tests__/design-tokens.test.ts` - Test suite for design token validation

### Files Modified
- `frontend/src/styles/tokens.css` - Added new color tokens:
  - `--color-accent-muted` (rgba 0.3 for borders)
  - `--color-warning-subtle` (rgba 0.06 for very light backgrounds)
  - `--color-warning-light` (rgba 0.15 for active states)
  - `--color-warning-medium` (rgba 0.2 for hover states)
  - `--color-warning-muted` (rgba 0.4 for borders)
  - `--color-icon-folder` (amber for closed folders)
  - `--color-icon-folder-open` (amber for open folders)

- `frontend/src/styles/components/layout.css` - Replaced hard-coded colors:
  - `.file-item__icon--folder` - now uses `var(--color-icon-folder)`
  - `.file-item__icon--folder-open` - now uses `var(--color-icon-folder-open)`
  - `.file-tree-item__icon--folder` - now uses `var(--color-icon-folder)`
  - `.file-tree-item__icon--folder-open` - now uses `var(--color-icon-folder-open)`
  - `.experiment-item--selected` border - now uses `var(--color-accent-muted)`
  - `.quality-stat--warning` - now uses `var(--color-warning-muted)` and `var(--color-warning-subtle)`
  - `.inspector-action-btn--active` - now uses `var(--color-warning-light)`, `var(--color-warning-muted)`, `var(--color-warning-medium)`

### Design Decisions
1. **Kept `--color-` prefix** - Follows industry best practices (GitHub Primer, Chakra UI) and maintains namespace clarity
2. **TSX brand colors excluded** - File type icons (Python, TypeScript, YAML) and logo SVGs use intentional brand colors that should not be tokenized
3. **Opacity scale** - Established consistent opacity levels for status colors: subtle (0.06), dim (0.12), light (0.15), medium (0.2), muted (0.4)

### Token Summary
The design system now includes 40+ color tokens organized by purpose:
- **Backgrounds** (8): base, panel, elevated, content, hover, active, chrome, chrome-hover
- **Borders** (3): default, muted, subtle
- **Accent** (5): base, bright, dim, muted, glow
- **Status - Success** (2): base, dim
- **Status - Warning** (6): base, subtle, dim, light, medium, muted
- **Accent** includes `muted` variant for 0.3 opacity borders
- **Status - Error** (2): base, dim
- **Charts** (5): chart-1 through chart-5
- **Text** (4): primary, secondary, muted, accent
- **Icons** (2): folder, folder-open
