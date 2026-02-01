# Technical Notes & Lessons Learned

This document captures technical considerations and patterns to follow from the start.

## Dependencies - Stay Current

Use latest stable versions from day one:

| Package | Minimum Version | Why |
|---------|-----------------|-----|
| TypeScript | 5.7+ | Better inference, security patches, modern features |
| Vite | 6.x | 30-50% faster builds, better HMR |
| React | 18.x | Concurrent features, Suspense, useTransition |

## Performance Patterns

### 1. Memoize Recursive Components

Tree components (file explorer, experiment list) must use `React.memo` with custom comparison:

```typescript
export const TreeNode = React.memo(function TreeNode({...}) {
  // component body
}, (prev, next) => {
  return prev.entry.path === next.entry.path &&
         prev.isExpanded === next.isExpanded &&
         prev.selectedPath === next.selectedPath;
});
```

### 2. Virtual Scrolling for Large Lists

Any list that could exceed ~100 items needs virtualization:
- File tree (projects can have 10,000+ files)
- Experiment list (researchers run many experiments)
- Log output (training generates thousands of lines)

Use `@tanstack/react-virtual` or `react-window`.

### 3. Lazy Load Directory Children

Never load full directory tree upfront. Load children on folder expansion:
- Show loading indicator during fetch
- Cache loaded children in state
- Only expand one level at a time

### 4. Dynamic Language Imports

CodeMirror language extensions should be dynamically imported per file type:

```typescript
async function getLanguageExtension(filename: string) {
  const ext = filename.split('.').pop();
  switch (ext) {
    case 'py':
      const { python } = await import('@codemirror/lang-python');
      return python();
    // ...
  }
}
```

### 5. Use useTransition for Heavy Operations

Wrap tree operations in useTransition to keep UI responsive:

```typescript
const [isPending, startTransition] = useTransition();
const handleToggle = useCallback((path) => {
  startTransition(() => toggleExpanded(path));
}, [toggleExpanded]);
```

## State Management

### Split Zustand Store into Slices

Don't create one monolithic store. Split by domain:

```
src/stores/
  index.ts              # Composer
  slices/
    experimentSlice.ts  # experiments, activeExperiment
    metricsSlice.ts     # liveMetrics, alerts
    fileTreeSlice.ts    # directoryTree, expanded, selected
    editorSlice.ts      # openFiles, activeFile
    uiSlice.ts          # panels, modals
```

### Use Composite Selector Hooks

Create hooks that compute derived state:

```typescript
export const useActiveExperiment = () => useStore((state) => ({
  experiment: state.experiments.find(e => e.id === state.activeExperimentId),
  isRunning: state.activeExperimentId &&
             state.experiments.find(e => e.id === state.activeExperimentId)?.status === 'running',
}));
```

## React Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Inline callbacks in map loops | Creates new function each render | Extract memoized handler |
| Object literals as default props | New object reference each render | Define outside component |
| Mixed store access patterns | Inconsistent, hard to optimize | Standardize on selector hooks |
| String class concatenation | Error-prone | Use `clsx` library |

## Accessibility from Day One

### Contrast Ratios
- Regular text: minimum 4.5:1 contrast ratio
- Large text: minimum 3:1 contrast ratio
- Disabled text: must still meet 4.5:1 (use `#4a6070` minimum)

### ARIA Requirements
- Tree components: `role="tree"`, `role="treeitem"`, `aria-expanded`
- Tab components: `role="tablist"`, `role="tab"`, `role="tabpanel"`
- Loading states: `aria-busy="true"`
- Interactive icons: `aria-label` or `aria-hidden="true"` for decorative

### Keyboard Navigation
- All actions accessible via keyboard
- Roving tabindex for tree/list navigation
- Focus trap in modals
- Skip-to-content link

## Vite Configuration

```typescript
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand'],
    exclude: ['@codemirror/lang-python'] // lazy load
  },
  server: {
    warmup: {
      clientFiles: ['./src/App.tsx', './src/stores/index.ts']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@stores': path.resolve(__dirname, './src/stores'),
    }
  }
});
```

## Testing

- Use `@swc/jest` instead of `ts-jest` (10-20x faster)
- Set coverage thresholds at 60-80%
- Add pre-commit hooks with husky + lint-staged
- Centralize Wails mocks in `__mocks__/wailsjs/`

## Charts - Use uPlot

- Lightweight: 29KB gzipped
- Canvas-based: handles 100k+ points at 60fps
- Avoid heavy alternatives: Recharts (200KB+), Victory (300KB+)
