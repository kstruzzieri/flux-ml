# TDD: Issue #13 - Base Components (Button, Card, Badge, Input)

## Issue Summary
Create reusable base UI components following the existing design token system. These components will form the foundation of the Flux design system, ensuring consistent styling across the application.

## Acceptance Criteria
- [x] All 4 components render correctly
- [x] Button variants (primary, secondary, danger) work as expected
- [x] Button sizes (sm, md, lg) apply correct styling
- [x] Card accent bar and hover states function properly
- [x] Badge variants display correct colors
- [x] Input styling matches design system
- [x] All components use CSS variables (no hard-coded colors)
- [x] Focus states visible for keyboard navigation
- [x] ARIA attributes where applicable

## Rationale
Base UI components provide:
1. **Consistency** - Uniform look and behavior across the application
2. **Reusability** - Write once, use everywhere
3. **Accessibility** - Built-in keyboard navigation and ARIA support
4. **Maintainability** - Centralized styling using design tokens

## Component Specifications

### Button
- **Variants:** `primary` (cyan filled), `secondary` (ghost with border), `danger` (red)
- **Sizes:** `sm`, `md` (default), `lg`
- **States:** default, hover, active, disabled, focus

### Card
- **Features:** Optional accent bar (top edge), hover states, alert variant (warning border)

### Badge
- **Variants:** `default` (cyan), `success` (green), `warning` (amber), `error` (red), `muted` (gray)

### Input
- **Features:** Text input, placeholder styling, focus states, optional icon slot (left), error state

## Failing Tests

### Test 1: Button renders with children
Buttons must be visible and interactive as the primary action element in the UI.
```typescript
it('renders with children', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
})
```

### Test 2: Button applies primary variant by default
Primary variant is the default call-to-action style with cyan accent background.
```typescript
it('applies primary variant by default', () => {
  render(<Button>Primary</Button>)
  expect(screen.getByRole('button')).toHaveClass('button--primary')
})
```

### Test 3: Button applies variant classes
Secondary and danger variants provide visual distinction for different action types.
```typescript
it('applies secondary variant when specified', () => {
  render(<Button variant="secondary">Secondary</Button>)
  expect(screen.getByRole('button')).toHaveClass('button--secondary')
})

it('applies danger variant when specified', () => {
  render(<Button variant="danger">Danger</Button>)
  expect(screen.getByRole('button')).toHaveClass('button--danger')
})
```

### Test 4: Button applies size classes
Size variants allow buttons to fit different UI contexts (toolbars vs forms).
```typescript
it('applies size classes correctly', () => {
  const { rerender } = render(<Button size="sm">Small</Button>)
  expect(screen.getByRole('button')).toHaveClass('button--sm')

  rerender(<Button size="lg">Large</Button>)
  expect(screen.getByRole('button')).toHaveClass('button--lg')
})
```

### Test 5: Button handles disabled state
Disabled state prevents interaction and provides visual indication.
```typescript
it('handles disabled state', () => {
  render(<Button disabled>Disabled</Button>)
  expect(screen.getByRole('button')).toBeDisabled()
})
```

### Test 6: Button click handler
Click handler enables button functionality; disabled buttons must not trigger actions.
```typescript
it('calls onClick when clicked', async () => {
  const handleClick = jest.fn()
  render(<Button onClick={handleClick}>Click</Button>)
  await userEvent.click(screen.getByRole('button'))
  expect(handleClick).toHaveBeenCalledTimes(1)
})

it('does not call onClick when disabled', async () => {
  const handleClick = jest.fn()
  render(<Button onClick={handleClick} disabled>Click</Button>)
  await userEvent.click(screen.getByRole('button'))
  expect(handleClick).not.toHaveBeenCalled()
})
```

### Test 7: Card renders children
Cards are container components that must render their children content.
```typescript
it('renders children', () => {
  render(<Card>Card content</Card>)
  expect(screen.getByText('Card content')).toBeInTheDocument()
})
```

### Test 8: Card accent bar
Accent bar provides visual hierarchy and categorization via a colored top border.
```typescript
it('applies accent bar with custom color', () => {
  render(<Card accentColor="var(--color-success)">Content</Card>)
  const card = screen.getByText('Content').closest('.card')
  expect(card).toHaveClass('card--accent')
})
```

### Test 9: Card alert variant
Alert variant signals important information requiring user attention with warning styling.
```typescript
it('applies alert variant', () => {
  render(<Card alert>Alert content</Card>)
  const card = screen.getByText('Alert content').closest('.card')
  expect(card).toHaveClass('card--alert')
})
```

### Test 10: Card hoverable styling
Hoverable cards indicate interactivity for clickable card elements.
```typescript
it('applies hoverable styling', () => {
  render(<Card hoverable>Hover me</Card>)
  const card = screen.getByText('Hover me').closest('.card')
  expect(card).toHaveClass('card--hoverable')
})
```

### Test 11: Badge renders with children
Badges display short labels or status indicators inline with other content.
```typescript
it('renders with children', () => {
  render(<Badge>Label</Badge>)
  expect(screen.getByText('Label')).toBeInTheDocument()
})
```

### Test 12: Badge applies variant classes
Each variant uses semantic colors for its intended purpose (default, success, warning, error, muted).
```typescript
it('applies default variant by default', () => {
  render(<Badge>Default</Badge>)
  expect(screen.getByText('Default')).toHaveClass('badge--default')
})

it('applies variant classes correctly', () => {
  const variants = ['success', 'warning', 'error', 'muted'] as const
  variants.forEach(variant => {
    const { unmount } = render(<Badge variant={variant}>{variant}</Badge>)
    expect(screen.getByText(variant)).toHaveClass(`badge--${variant}`)
    unmount()
  })
})
```

### Test 13: Input renders with placeholder
Placeholder provides hint text for expected input content.
```typescript
it('renders with placeholder', () => {
  render(<Input placeholder="Enter text" />)
  expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
})
```

### Test 14: Input renders with icon
Icon slot allows adding visual context like search or user icons.
```typescript
it('renders with icon', () => {
  render(<Input icon={<span data-testid="icon">icon</span>} />)
  expect(screen.getByTestId('icon')).toBeInTheDocument()
  expect(screen.getByRole('textbox').closest('.input-wrapper')).toHaveClass('input-wrapper--with-icon')
})
```

### Test 15: Input error styling
Error state provides visual feedback for invalid input via red border.
```typescript
it('applies error styling', () => {
  render(<Input error />)
  expect(screen.getByRole('textbox')).toHaveClass('input--error')
})
```

### Test 16: Input onChange handler
onChange handler enables controlled input behavior for form state management.
```typescript
it('calls onChange with value', async () => {
  const handleChange = jest.fn()
  render(<Input onChange={handleChange} />)
  await userEvent.type(screen.getByRole('textbox'), 'test')
  expect(handleChange).toHaveBeenLastCalledWith('test')
})

it('displays controlled value', () => {
  render(<Input value="controlled" onChange={() => {}} />)
  expect(screen.getByRole('textbox')).toHaveValue('controlled')
})
```

## Expected Output (Failing)
```
FAIL frontend/src/__tests__/components/ui.test.tsx
  Button
    ✕ renders with children
    ✕ applies primary variant by default
    ✕ applies secondary variant when specified
    ✕ applies danger variant when specified
    ✕ applies size classes correctly
    ✕ handles disabled state
    ✕ calls onClick when clicked
    ✕ does not call onClick when disabled
  Card
    ✕ renders children
    ✕ applies accent bar with custom color
    ✕ applies alert variant
    ✕ applies hoverable styling
  Badge
    ✕ renders with children
    ✕ applies default variant by default
    ✕ applies variant classes correctly
  Input
    ✕ renders with placeholder
    ✕ renders with icon
    ✕ applies error styling
    ✕ calls onChange with value
    ✕ displays controlled value
```

## Test Summary
| Component | Tests | Status |
|-----------|-------|--------|
| Button | 11 | Pass |
| Card | 6 | Pass |
| Badge | 7 | Pass |
| Input | 8 | Pass |

## Implementation Summary

### Files to Create
- `docs/tdd/013-base-components.md` - This TDD document
- `frontend/src/components/ui/Button/Button.tsx`
- `frontend/src/components/ui/Button/Button.css`
- `frontend/src/components/ui/Card/Card.tsx`
- `frontend/src/components/ui/Card/Card.css`
- `frontend/src/components/ui/Badge/Badge.tsx`
- `frontend/src/components/ui/Badge/Badge.css`
- `frontend/src/components/ui/Input/Input.tsx`
- `frontend/src/components/ui/Input/Input.css`
- `frontend/src/components/ui/index.ts`
- `frontend/src/__tests__/components/ui.test.tsx`

### Files to Modify
- `frontend/src/components/index.ts` - Add UI component exports

## Passing Test Results
```
PASS src/__tests__/components/ui.test.tsx
  Button
    ✓ renders with children (55 ms)
    ✓ applies primary variant by default (6 ms)
    ✓ applies secondary variant when specified (6 ms)
    ✓ applies danger variant when specified (8 ms)
    ✓ applies size classes correctly (8 ms)
    ✓ applies medium size by default (4 ms)
    ✓ handles disabled state (3 ms)
    ✓ calls onClick when clicked (37 ms)
    ✓ does not call onClick when disabled (15 ms)
    ✓ supports button type attribute (4 ms)
    ✓ defaults to type button (3 ms)
  Card
    ✓ renders children (2 ms)
    ✓ applies accent bar with custom color (2 ms)
    ✓ applies alert variant (2 ms)
    ✓ applies hoverable styling (1 ms)
    ✓ has base card class (1 ms)
    ✓ accepts custom className (1 ms)
  Badge
    ✓ renders with children (1 ms)
    ✓ applies default variant by default (1 ms)
    ✓ applies success variant (1 ms)
    ✓ applies warning variant (1 ms)
    ✓ applies error variant (1 ms)
    ✓ applies muted variant
    ✓ has base badge class
  Input
    ✓ renders with placeholder (3 ms)
    ✓ renders with icon (7 ms)
    ✓ applies error styling (3 ms)
    ✓ calls onChange with value (29 ms)
    ✓ displays controlled value (5 ms)
    ✓ has base input class (4 ms)
    ✓ handles disabled state (5 ms)
    ✓ supports type attribute (2 ms)

Test Suites: 1 passed, 1 total
Tests:       32 passed, 32 total
```

## Implementation Summary

### Files Created
- `docs/tdd/013-base-components.md` - This TDD document
- `frontend/src/components/ui/Button/Button.tsx` - Button component with primary/secondary/danger variants and sm/md/lg sizes
- `frontend/src/components/ui/Button/Button.css` - Button styling using CSS variables
- `frontend/src/components/ui/Card/Card.tsx` - Card component with accent bar, alert, and hoverable options
- `frontend/src/components/ui/Card/Card.css` - Card styling using CSS variables
- `frontend/src/components/ui/Badge/Badge.tsx` - Badge component with 5 variants (default, success, warning, error, muted)
- `frontend/src/components/ui/Badge/Badge.css` - Badge styling using CSS variables
- `frontend/src/components/ui/Input/Input.tsx` - Input component with icon slot, error state, and controlled value support
- `frontend/src/components/ui/Input/Input.css` - Input styling using CSS variables
- `frontend/src/components/ui/index.ts` - Barrel export for all UI components
- `frontend/src/__tests__/components/ui.test.tsx` - 32 tests covering all components

### Files Modified
- `frontend/src/components/index.ts` - Added `export * from './ui'`

### Design Decisions

1. **CSS Variables Only** - All colors, spacing, typography, and other values use design tokens from `tokens.css`. No hard-coded hex values.

2. **BEM-style Naming** - Component classes follow BEM conventions:
   - `.button`, `.button--primary`, `.button--sm`
   - `.card`, `.card--accent`, `.card--alert`
   - `.badge`, `.badge--success`
   - `.input`, `.input--error`

3. **Focus States** - All interactive components have `:focus-visible` styles for keyboard accessibility using the accent color with offset outline.

4. **Component Structure** - Each component has its own directory with `.tsx` and `.css` files for easy maintenance and code splitting.

5. **Type Exports** - All component props interfaces are exported for type-safe usage across the application.

### Token Usage Summary
| Token Category | Usage |
|---------------|-------|
| Colors | `--color-accent`, `--color-bg-*`, `--color-text-*`, `--color-border-*`, `--color-success`, `--color-warning`, `--color-error` |
| Spacing | `--spacing-xs`, `--spacing-sm`, `--spacing-md`, `--spacing-lg`, `--spacing-xl` |
| Typography | `--font-ui`, `--font-size-xs/sm/md`, `--font-weight-medium/semibold` |
| Layout | `--radius-sm`, `--radius-md`, `--radius-lg` |
| Transitions | `--transition-fast` |
