# TDD: Issue #14 - Icon System

## Issue Summary
Set up a centralized icon system with file type icons and UI icons. Icons were duplicated across 10+ files with identical SVG definitions. This issue consolidates all icons into a single, reusable component system using `lucide-react` for UI icons and `devicons-react` for language/file type icons, with custom SVGs only for project-specific icons (folders, generic files).

## Acceptance Criteria
- [x] File type icons render correctly (Python, YAML, Markdown, folder, etc.)
- [x] UI icons available (chevron, close, warning, settings, etc.)
- [x] Icons scale appropriately (16px, 18px, 24px variants)
- [x] Colors follow design tokens (via CSS variables)
- [x] Dark theme compatibility (all icons visible on dark backgrounds)

## Rationale
A centralized icon system provides:
1. **DRY Principle** - Single source of truth for each icon (eliminated ~496 lines of duplicates)
2. **Consistency** - Uniform sizing and styling across the application
3. **Maintainability** - Update an icon once, changes propagate everywhere
4. **Performance** - Tree-shakeable exports from established libraries
5. **Scalability** - lucide-react provides 1,500+ UI icons; devicons-react provides 578 language icons

### Library Selection
- **lucide-react** - UI icons (chevrons, close, settings, etc.). Lightweight (~1KB/icon), tree-shakeable, uses `currentColor` by default.
- **devicons-react** - Language/file type icons (Python, TypeScript, Go, etc.). Official devicon set with brand-accurate colors.
- **Custom SVGs** - Only for project-specific icons not available in libraries (TextFile, GenericFile, Folder, FolderOpen). Created via `createIcon()`/`createFilledIcon()` factory functions.

## Icon Inventory

### UI Icons (lucide-react)
| Icon | Lucide Source | Usage |
|------|--------------|-------|
| ChevronLeftIcon | `ChevronLeft` | Panel collapse |
| ChevronRightIcon | `ChevronRight` | Panel expand, folder toggle |
| ChevronUpIcon | `ChevronUp` | Output expand |
| ChevronDownIcon | `ChevronDown` | Output collapse |
| CloseIcon | `X` | Tab close |
| AlertTriangleIcon | `TriangleAlert` | Alerts indicator |
| SettingsIcon | `Settings` | Settings button |
| BarChartIcon | `ChartBarBig` | Experiments nav |
| ColumnsIcon | `Columns2` | Compare nav |
| DatabaseIcon | `Database` | Data nav |
| CodeIcon | `Code` | Code nav |
| FilePlusIcon | `FilePlus` | New file action |
| FolderPlusIcon | `FolderPlus` | New folder action |

### File Type Icons (devicons-react)
| Icon | Devicon Source | Extensions |
|------|--------------|------------|
| PythonIcon | `PythonOriginal` | .py |
| YamlIcon | `YamlOriginal` | .yaml, .yml |
| MarkdownIcon | `MarkdownOriginal` | .md |
| JavascriptIcon | `JavascriptOriginal` | .js, .jsx |
| TypescriptIcon | `TypescriptOriginal` | .ts, .tsx |
| GoIcon | `GoOriginal` | .go |
| RustIcon | `RustOriginal` | .rs |
| JsonIcon | `JsonOriginal` | .json |
| DockerIcon | `DockerOriginal` | dockerfile |
| BashIcon | `BashOriginal` | .sh, .bash |
| Html5Icon | `Html5Original` | .html |
| Css3Icon | `Css3Original` | .css |
| GitIcon | `GitOriginal` | (available for future use) |

### Custom Icons (project-specific)
| Icon | Extensions | Notes |
|------|------------|-------|
| TextFileIcon | .txt | Custom SVG via `createIcon()` |
| GenericFileIcon | (fallback) | Custom SVG via `createIcon()` |
| FolderIcon | (directory) | Custom SVG via `createFilledIcon()` |
| FolderOpenIcon | (expanded directory) | Custom SVG via `createFilledIcon()` |

## Component Architecture

### Icon Sources
```
icons/index.ts (barrel export)
├── lucide-react → 13 UI icons (re-exported with aliases)
├── devicons-react → 13 language icons (re-exported with aliases)
└── custom SVGs → 4 project-specific icons (via createIcon factory)
```

### FileIcon Component
Wrapper component that maps file extensions to the appropriate icon:
```typescript
export interface FileIconProps extends SVGProps<SVGSVGElement> {
  extension?: string  // File extension without the dot
}
```
Renders a `<span>` wrapper with a CSS class for type identification (e.g., `icon--python`, `icon--yaml`), containing the library icon component.

### Size Tokens
```css
--icon-size-sm: 16px;
--icon-size-md: 18px;
--icon-size-lg: 24px;
```

### Color Behavior
- **UI icons (lucide-react):** Use `currentColor` via `stroke` attribute (inherit from parent)
- **Language icons (devicons-react):** Use embedded brand colors in SVG paths
- **Dark theme overrides:** YAML and Markdown icons use CSS `fill` override with `var(--color-text-secondary)` for visibility on dark backgrounds
- **Folder icons:** Use `--color-icon-folder` and `--color-icon-folder-open` tokens
- **Custom icons:** Use `currentColor` (inherit from parent)

## Tests

### Test 1: lucide-react UI icons render as SVG elements
All 13 UI icons render as valid SVG elements with data-testid support.
```typescript
it('renders all UI icons as SVG elements', () => {
  const uiIcons = [
    { Component: ChevronLeftIcon, name: 'chevron-left' },
    { Component: ChevronRightIcon, name: 'chevron-right' },
    // ... 11 more icons
  ]

  uiIcons.forEach(({ Component, name }) => {
    const { unmount } = render(<Component data-testid={`icon-${name}`} />)
    const el = screen.getByTestId(`icon-${name}`)
    expect(el).toBeInTheDocument()
    expect(el.tagName.toLowerCase()).toBe('svg')
    unmount()
  })
})
```

### Test 2: lucide-react icons accept size prop (numeric)
Size is set via `width`/`height` attributes (lucide API uses numbers, not CSS classes).
```typescript
it('accepts size prop', () => {
  render(<ChevronRightIcon size={16} data-testid="icon" />)
  const svg = screen.getByTestId('icon')
  expect(svg).toHaveAttribute('width', '16')
  expect(svg).toHaveAttribute('height', '16')
})
```

### Test 3: lucide-react icons accept className prop
```typescript
it('accepts className prop', () => {
  render(<ChevronRightIcon className="custom-class" data-testid="icon" />)
  expect(screen.getByTestId('icon')).toHaveClass('custom-class')
})
```

### Test 4: lucide-react icons default color to currentColor
```typescript
it('defaults color to currentColor', () => {
  render(<ChevronRightIcon data-testid="icon" />)
  expect(screen.getByTestId('icon')).toHaveAttribute('stroke', 'currentColor')
})
```

### Test 5: devicons-react language icons render as SVG elements
```typescript
it('renders language icons as SVG elements', () => {
  const fileIcons = [
    { Component: PythonIcon, name: 'python' },
    { Component: YamlIcon, name: 'yaml' },
    { Component: MarkdownIcon, name: 'markdown' },
  ]

  fileIcons.forEach(({ Component }) => {
    const { container, unmount } = render(<Component size={18} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    unmount()
  })
})
```

### Test 6: Custom icons render as SVG elements
```typescript
it('renders custom file icons as SVG elements', () => {
  const customIcons = [
    { Component: TextFileIcon, name: 'text-file' },
    { Component: GenericFileIcon, name: 'generic-file' },
    { Component: FolderIcon, name: 'folder' },
    { Component: FolderOpenIcon, name: 'folder-open' },
  ]

  customIcons.forEach(({ Component, name }) => {
    const { unmount } = render(<Component data-testid={`icon-${name}`} />)
    const el = screen.getByTestId(`icon-${name}`)
    expect(el).toBeInTheDocument()
    expect(el.tagName.toLowerCase()).toBe('svg')
    unmount()
  })
})
```

### Test 7: Folder icons have correct CSS classes
```typescript
it('folder icon has folder class', () => {
  render(<FolderIcon data-testid="icon" />)
  expect(screen.getByTestId('icon')).toHaveClass('icon--folder')
})

it('folder open icon has folder-open class', () => {
  render(<FolderOpenIcon data-testid="icon" />)
  expect(screen.getByTestId('icon')).toHaveClass('icon--folder-open')
})
```

### Test 8: FileIcon selects correct icon by extension
```typescript
it('selects correct icon by extension', () => {
  const { rerender } = render(<FileIcon extension="py" data-testid="file-icon" />)
  expect(screen.getByTestId('file-icon')).toHaveClass('icon--python')

  rerender(<FileIcon extension="yaml" data-testid="file-icon" />)
  expect(screen.getByTestId('file-icon')).toHaveClass('icon--yaml')

  // ... yml, md, txt, unknown
})
```

### Test 9: FileIcon maps additional language extensions
```typescript
it('maps additional language extensions', () => {
  const { rerender } = render(<FileIcon extension="js" data-testid="file-icon" />)
  expect(screen.getByTestId('file-icon')).toHaveClass('icon--javascript')

  // ... ts, go, rs, json, sh
})
```

### Test 10: Icon CSS uses design tokens for sizing
```typescript
it('icon CSS uses design tokens for sizing', () => {
  const cssContent = fs.readFileSync(
    path.join(__dirname, '../../components/ui/Icon/Icon.css'),
    'utf-8'
  )
  expect(cssContent).toContain('--icon-size-sm')
  expect(cssContent).toContain('--icon-size-md')
  expect(cssContent).toContain('--icon-size-lg')
})
```

### Test 11: Folder icons use color tokens
```typescript
it('folder icons use color tokens', () => {
  const cssContent = fs.readFileSync(
    path.join(__dirname, '../../components/ui/Icon/Icon.css'),
    'utf-8'
  )
  expect(cssContent).toContain('--color-icon-folder')
  expect(cssContent).toContain('--color-icon-folder-open')
})
```

## Test Summary
| Test Group | Tests | Status |
|------------|-------|--------|
| lucide-react UI icons | 4 | Pass |
| devicons-react file type icons | 1 | Pass |
| Custom icons | 3 | Pass |
| FileIcon extension mapping | 2 | Pass |
| CSS tokens | 2 | Pass |

## Passing Test Results
```
PASS src/__tests__/components/Icon.test.tsx
  Icon
    lucide-react UI icons
      ✓ renders all UI icons as SVG elements
      ✓ accepts size prop
      ✓ accepts className prop
      ✓ defaults color to currentColor
    devicons-react file type icons
      ✓ renders language icons as SVG elements
    custom icons
      ✓ renders custom file icons as SVG elements
      ✓ folder icon has folder class
      ✓ folder open icon has folder-open class
    FileIcon extension mapping
      ✓ selects correct icon by extension
      ✓ maps additional language extensions
    CSS tokens
      ✓ icon CSS uses design tokens for sizing
      ✓ folder icons use color tokens

Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
```

## Implementation Summary

### Dependencies Added
- `lucide-react` - 1,541 tree-shakeable UI icons
- `devicons-react` - 578 language/technology icons

### Files Created
- `docs/tdd/014-icon-system.md` - This TDD document
- `frontend/src/components/ui/Icon/Icon.css` - Icon styles with CSS variable sizing and dark theme overrides
- `frontend/src/components/ui/Icon/types.ts` - IconProps and IconSize types
- `frontend/src/components/ui/Icon/createIcon.tsx` - Factory functions for custom icons
- `frontend/src/components/ui/Icon/icons/TextFile.tsx` - Custom text file icon
- `frontend/src/components/ui/Icon/icons/GenericFile.tsx` - Custom generic file icon
- `frontend/src/components/ui/Icon/icons/Folder.tsx` - Custom folder icon
- `frontend/src/components/ui/Icon/icons/FolderOpen.tsx` - Custom open folder icon
- `frontend/src/components/ui/Icon/icons/index.ts` - Barrel export (lucide + devicons + custom)
- `frontend/src/components/ui/Icon/FileIcon.tsx` - Extension-based icon selector (17 extensions)
- `frontend/src/components/ui/Icon/index.ts` - Main barrel export
- `frontend/src/__tests__/components/Icon.test.tsx` - 12 tests

### Files Modified
- `frontend/src/styles/tokens.css` - Added `--icon-size-sm`, `--icon-size-md`, `--icon-size-lg` tokens
- `frontend/src/components/ui/index.ts` - Added `export * from './Icon'`
- `frontend/src/components/layout/panels/FileTreePanel.tsx` - Replaced inline SVGs with imports, added tree indent guides
- `frontend/src/components/layout/panels/CodeEditorPanel.tsx` - Replaced inline SVGs with imports
- `frontend/src/components/layout/Header.tsx` - Replaced inline SVGs with imports
- `frontend/src/components/layout/ActivityBar.tsx` - Replaced inline SVGs with imports
- `frontend/src/components/views/ExperimentsView.tsx` - Replaced inline SVGs with imports
- `frontend/src/components/views/CodeView.tsx` - Replaced inline SVGs with imports
- `frontend/src/components/views/DataView.tsx` - Replaced inline SVGs with imports
- `frontend/src/components/views/CompareView.tsx` - Replaced inline SVGs with imports

### Design Decisions

1. **Library-first approach** - Use established icon libraries (`lucide-react`, `devicons-react`) instead of custom SVGs wherever possible. Custom SVGs only for icons not available in any library (folders, generic file).

2. **Factory functions for custom icons** - `createIcon()` and `createFilledIcon()` reduce boilerplate for the remaining custom icons. Size defaults to `undefined` so container CSS controls dimensions.

3. **CSS Variable Sizing** - Size variants use `--icon-size-sm/md/lg` tokens from `tokens.css`. Icons inherit size from their container by default; explicit size classes are for standalone usage only.

4. **Dark theme compatibility** - YAML and Markdown devicons use black fills that are invisible on dark backgrounds. CSS `fill` overrides with `var(--color-text-secondary)` ensure visibility. YAML's red "A" accent is preserved via SVG attribute specificity.

5. **Wrapper span pattern** - `FileIcon` renders library icons inside a `<span>` with a CSS class (e.g., `icon--python`) for type-specific styling. This decouples the icon library API from the project's CSS system.

6. **Tree-shakeable barrel exports** - `icons/index.ts` re-exports from libraries with project-specific aliases (e.g., `ChevronLeft as ChevronLeftIcon`), keeping imports clean while enabling tree-shaking.

### Duplicate Code Eliminated
| Component | Lines Removed |
|-----------|---------------|
| ExperimentsView.tsx | 30 |
| CodeView.tsx | 30 |
| DataView.tsx | 30 |
| CompareView.tsx | 30 |
| FileTreePanel.tsx | 116 |
| CodeEditorPanel.tsx | 80 |
| Header.tsx | 72 |
| ActivityBar.tsx | 108 |
| **Total** | **~496 lines** |

### Token Usage Summary
| Token | Value | Usage |
|-------|-------|-------|
| `--icon-size-sm` | 16px | Small icons in compact UIs |
| `--icon-size-md` | 18px | Default size for most icons |
| `--icon-size-lg` | 24px | Larger icons for emphasis |
| `--color-icon-folder` | #d97706 | Closed folder color |
| `--color-icon-folder-open` | #f59e0b | Open folder color |
