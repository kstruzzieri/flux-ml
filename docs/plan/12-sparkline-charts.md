# Sparkline Charts — Issue #24

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add mini SVG sparkline charts to experiment cards showing loss and reward metric trends.

**Architecture:** Pure frontend feature. New `Sparkline` SVG component + LTTB downsampling utility. Extend `metricsStore` with sparkline data state. Wire through `ExperimentList` → `ExperimentCard`. Reuse existing `QueryMetrics` backend endpoint — no Go changes.

**Tech Stack:** React, TypeScript, SVG, Zustand, Jest/RTL

---

## Design

### New Files
- `frontend/src/components/Experiments/Sparkline.tsx` — Pure SVG sparkline component
- `frontend/src/utils/downsample.ts` — LTTB downsampling algorithm

### Modified Files
- `frontend/src/stores/metricsStore.ts` — Add `sparklineData` state + fetch actions
- `frontend/src/components/Experiments/ExperimentCard.tsx` — Add sparkline row + prop
- `frontend/src/components/Experiments/ExperimentCard.css` — Sparkline row styles
- `frontend/src/components/Experiments/ExperimentList.tsx` — Pass sparkline data prop
- No new CSS tokens — reuses existing `--color-chart-1` (loss/cyan) and `--color-chart-4` (reward/green)

### No Backend Changes
Reuses existing `QueryMetrics(expID, name, 0, 0)` endpoint. No new Go code or tests needed.

### Sparkline Component

```tsx
interface SparklineProps {
  data: Point[]       // {step: number, value: number}[]
  color: string       // CSS color value
  width?: number      // default ~90
  height?: number     // default 24
  showFill?: boolean  // gradient fill beneath line, default true
}
```

- SVG polyline with `strokeWidth={1.5}`, `strokeLinejoin="round"`
- X mapped linearly from step range to `[0, width]`
- Y mapped from `[min, max]` to `[height - 2, 2]` (2px padding)
- Optional `<linearGradient>` fill: line color at 20% opacity fading to transparent
- Single data point renders a dot; empty data renders nothing

### Downsampling — LTTB

`downsampleLTTB(data: Point[], targetSize: number): Point[]`

Largest Triangle Three Buckets algorithm — industry standard for time-series visualization (Grafana, TimescaleDB). Preserves peaks, valleys, and visual shape far better than nth-point or averaging. Target size: 60 points for ~90px width.

- Returns original data when length <= targetSize
- Always preserves first and last points
- Handles edge cases: empty, single point, two points

### Data Flow

1. `metricsStore` gains `sparklineData: Record<string, Record<string, Point[]>>`
2. `fetchSparklineData(experimentId)` calls `QueryMetrics` for loss and reward in parallel
3. Results LTTB-downsampled to 60 points, stored in state
4. Triggered alongside `fetchLatestMetrics` on `metrics:recorded` events (same debounce)
5. `ExperimentList` passes `sparklineDataMap` prop to cards
6. `ExperimentCard` receives `sparklineData` prop, renders sparkline row if data exists

### Visual Design

- Sparkline row below `.exp-card__metrics`, flex container, two sparklines side by side
- Each ~90x24px with metric name label in 11px muted text
- Loss color: `var(--color-chart-1)` — cyan (#06b6d4, existing token)
- Reward color: `var(--color-chart-4)` — green (#10b981, existing token)
- No sparkline row rendered when no metric data exists (card stays compact)
- `showFill` prop toggleable — implemented with fill on, easy to disable

### Testing (16 tests)

#### Sparkline component (5)
- Renders SVG polyline with correct number of points
- Handles single data point (renders circle)
- Renders nothing when data is empty
- Applies gradient fill when showFill=true
- Omits gradient fill when showFill=false

#### LTTB downsample (4)
- Returns original data when under target size
- Downsamples to target size preserving first and last points
- Preserves peaks/valleys (known spike appears in output)
- Edge cases: empty, single, two points

#### ExperimentCard integration (3)
- Renders sparkline row when data provided
- Does not render sparkline row when data absent
- Memo comparator detects sparkline data changes

#### metricsStore sparkline (3)
- fetchSparklineData populates state
- Returns empty object for no metrics
- fetchAllSparklineData fetches for multiple experiments

#### ExperimentList pass-through (1)
- Passes sparkline data from sparklineDataMap prop to cards

---

## Implementation Plan

### Task 1: LTTB Downsample Utility

**Files:**
- Create: `frontend/src/utils/downsample.ts`
- Create: `frontend/src/__tests__/utils/downsample.test.ts`

**Step 1: Write the failing tests**

Create `frontend/src/__tests__/utils/downsample.test.ts`:

```typescript
import { downsampleLTTB, type Point } from '@utils/downsample'

describe('downsampleLTTB', () => {
  it('returns original data when length is under target size', () => {
    const data: Point[] = [
      { step: 1, value: 1.0 },
      { step: 2, value: 2.0 },
      { step: 3, value: 1.5 },
    ]
    const result = downsampleLTTB(data, 10)
    expect(result).toEqual(data)
  })

  it('downsamples to target size preserving first and last points', () => {
    const data: Point[] = Array.from({ length: 100 }, (_, i) => ({
      step: i,
      value: Math.sin(i / 10),
    }))
    const result = downsampleLTTB(data, 20)
    expect(result).toHaveLength(20)
    expect(result[0]).toEqual(data[0])
    expect(result[result.length - 1]).toEqual(data[data.length - 1])
  })

  it('preserves peaks and valleys', () => {
    const data: Point[] = Array.from({ length: 100 }, (_, i) => ({
      step: i,
      value: i === 50 ? 100.0 : 1.0,
    }))
    const result = downsampleLTTB(data, 20)
    const hasSpike = result.some((p) => p.value === 100.0)
    expect(hasSpike).toBe(true)
  })

  it('handles edge cases: empty, single, two points', () => {
    expect(downsampleLTTB([], 10)).toEqual([])
    const single: Point[] = [{ step: 1, value: 5.0 }]
    expect(downsampleLTTB(single, 10)).toEqual(single)
    const two: Point[] = [{ step: 1, value: 1.0 }, { step: 2, value: 2.0 }]
    expect(downsampleLTTB(two, 10)).toEqual(two)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest src/__tests__/utils/downsample.test.ts --no-coverage 2>&1 | tail -20`
Expected: FAIL — Cannot find module `@utils/downsample`

**Step 3: Write minimal implementation**

Create `frontend/src/utils/downsample.ts`:

```typescript
export interface Point {
  step: number
  value: number
}

/**
 * Largest Triangle Three Buckets (LTTB) downsampling.
 * Reduces time-series data to targetSize points while preserving visual shape.
 * Always keeps first and last points. Returns original data if length <= targetSize.
 */
export function downsampleLTTB(data: Point[], targetSize: number): Point[] {
  if (data.length <= targetSize || targetSize < 3) {
    return data
  }

  const sampled: Point[] = [data[0]]
  const bucketSize = (data.length - 2) / (targetSize - 2)

  let prevIndex = 0

  for (let i = 0; i < targetSize - 2; i++) {
    // Calculate bucket boundaries
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1
    const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length - 1)

    // Calculate average of next bucket for area comparison
    const nextBucketStart = Math.floor((i + 2) * bucketSize) + 1
    const nextBucketEnd = Math.min(Math.floor((i + 3) * bucketSize) + 1, data.length - 1)
    let avgStep = 0
    let avgValue = 0
    let count = 0
    for (let j = nextBucketStart; j < nextBucketEnd && j < data.length; j++) {
      avgStep += data[j].step
      avgValue += data[j].value
      count++
    }
    if (count > 0) {
      avgStep /= count
      avgValue /= count
    }

    // Find point in current bucket that forms largest triangle with prev and avg
    let maxArea = -1
    let maxIndex = bucketStart
    const prevPoint = data[prevIndex]

    for (let j = bucketStart; j < bucketEnd && j < data.length; j++) {
      const area = Math.abs(
        (prevPoint.step - avgStep) * (data[j].value - prevPoint.value) -
        (prevPoint.step - data[j].step) * (avgValue - prevPoint.value)
      )
      if (area > maxArea) {
        maxArea = area
        maxIndex = j
      }
    }

    sampled.push(data[maxIndex])
    prevIndex = maxIndex
  }

  sampled.push(data[data.length - 1])
  return sampled
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest src/__tests__/utils/downsample.test.ts --no-coverage 2>&1 | tail -20`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add frontend/src/utils/downsample.ts frontend/src/__tests__/utils/downsample.test.ts
git commit -m "feat: add LTTB downsample utility (#24)"
```

---

### Task 2: Sparkline Component

**Files:**
- Create: `frontend/src/components/Experiments/Sparkline.tsx`
- Create: `frontend/src/__tests__/components/Experiments/Sparkline.test.tsx`
- Modify: `frontend/src/components/Experiments/index.ts` — add Sparkline export

**Step 1: Write the failing tests**

Create `frontend/src/__tests__/components/Experiments/Sparkline.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { Sparkline } from '@components/Experiments/Sparkline'

describe('Sparkline', () => {
  it('renders SVG polyline with correct points', () => {
    const data = [
      { step: 0, value: 1.0 },
      { step: 1, value: 2.0 },
      { step: 2, value: 1.5 },
    ]
    const { container } = render(<Sparkline data={data} color="#06b6d4" />)
    const polyline = container.querySelector('polyline')
    expect(polyline).toBeInTheDocument()
    const points = polyline!.getAttribute('points')!.split(' ')
    expect(points).toHaveLength(3)
  })

  it('renders circle for single data point', () => {
    const data = [{ step: 0, value: 5.0 }]
    const { container } = render(<Sparkline data={data} color="#06b6d4" />)
    expect(container.querySelector('circle')).toBeInTheDocument()
    expect(container.querySelector('polyline')).not.toBeInTheDocument()
  })

  it('renders nothing when data is empty', () => {
    const { container } = render(<Sparkline data={[]} color="#06b6d4" />)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders gradient fill when showFill is true', () => {
    const data = [
      { step: 0, value: 1.0 },
      { step: 1, value: 2.0 },
      { step: 2, value: 1.5 },
    ]
    const { container } = render(<Sparkline data={data} color="#06b6d4" showFill={true} />)
    expect(container.querySelector('linearGradient')).toBeInTheDocument()
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBeGreaterThanOrEqual(1)
  })

  it('omits gradient fill when showFill is false', () => {
    const data = [
      { step: 0, value: 1.0 },
      { step: 1, value: 2.0 },
      { step: 2, value: 1.5 },
    ]
    const { container } = render(<Sparkline data={data} color="#06b6d4" showFill={false} />)
    expect(container.querySelector('linearGradient')).not.toBeInTheDocument()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest src/__tests__/components/Experiments/Sparkline.test.tsx --no-coverage 2>&1 | tail -20`
Expected: FAIL — Cannot find module `@components/Experiments/Sparkline`

**Step 3: Write minimal implementation**

Create `frontend/src/components/Experiments/Sparkline.tsx`:

```tsx
import { useId } from 'react'
import type { Point } from '@utils/downsample'

interface SparklineProps {
  data: Point[]
  color: string
  width?: number
  height?: number
  showFill?: boolean
}

const PADDING = 2

export function Sparkline({
  data,
  color,
  width = 90,
  height = 24,
  showFill = true,
}: SparklineProps) {
  const gradientId = useId()

  if (data.length === 0) return null

  const minStep = data[0].step
  const maxStep = data[data.length - 1].step
  const stepRange = maxStep - minStep || 1

  let minValue = Infinity
  let maxValue = -Infinity
  for (const p of data) {
    if (p.value < minValue) minValue = p.value
    if (p.value > maxValue) maxValue = p.value
  }
  const valueRange = maxValue - minValue || 1

  const toX = (step: number) => ((step - minStep) / stepRange) * width
  const toY = (value: number) =>
    height - PADDING - ((value - minValue) / valueRange) * (height - PADDING * 2)

  if (data.length === 1) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <circle cx={width / 2} cy={height / 2} r={2} fill={color} />
      </svg>
    )
  }

  const points = data.map((p) => `${toX(p.step)},${toY(p.value)}`).join(' ')
  const fillPath =
    `M${toX(data[0].step)},${toY(data[0].value)} ` +
    data.slice(1).map((p) => `L${toX(p.step)},${toY(p.value)}`).join(' ') +
    ` L${toX(data[data.length - 1].step)},${height} L${toX(data[0].step)},${height} Z`

  return (
    <svg width={width} height={height} aria-hidden="true">
      {showFill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={fillPath} fill={`url(#${gradientId})`} />
        </>
      )}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
```

Add export to `frontend/src/components/Experiments/index.ts`:

```typescript
export { ExperimentCard } from './ExperimentCard'
export { ExperimentList } from './ExperimentList'
export { Sparkline } from './Sparkline'
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest src/__tests__/components/Experiments/Sparkline.test.tsx --no-coverage 2>&1 | tail -20`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add frontend/src/components/Experiments/Sparkline.tsx frontend/src/components/Experiments/index.ts frontend/src/__tests__/components/Experiments/Sparkline.test.tsx
git commit -m "feat: add Sparkline SVG component (#24)"
```

---

### Task 3: metricsStore Sparkline State

**Files:**
- Modify: `frontend/src/stores/metricsStore.ts` — add `sparklineData`, `fetchSparklineData`, `fetchAllSparklineData`
- Modify: `frontend/src/__tests__/stores/metricsStore.test.ts` — add 3 sparkline tests

**Step 1: Write the failing tests**

Append to `frontend/src/__tests__/stores/metricsStore.test.ts` inside the existing `describe('useMetricsStore')` block:

```typescript
  it('fetchSparklineData populates state for an experiment', async () => {
    await RecordMetrics('exp-1', [
      new metrics.Metric({ experiment_id: 'exp-1', step: 1, name: 'loss', value: 2.5, timestamp: 1000 }),
      new metrics.Metric({ experiment_id: 'exp-1', step: 2, name: 'loss', value: 1.8, timestamp: 2000 }),
      new metrics.Metric({ experiment_id: 'exp-1', step: 3, name: 'loss', value: 0.9, timestamp: 3000 }),
      new metrics.Metric({ experiment_id: 'exp-1', step: 1, name: 'reward', value: 0.1, timestamp: 1000 }),
      new metrics.Metric({ experiment_id: 'exp-1', step: 2, name: 'reward', value: 0.5, timestamp: 2000 }),
    ])
    await act(async () => {
      await useMetricsStore.getState().fetchSparklineData('exp-1')
    })
    const sparkData = useMetricsStore.getState().sparklineData['exp-1']
    expect(sparkData).toBeDefined()
    expect(sparkData['loss']).toHaveLength(3)
    expect(sparkData['reward']).toHaveLength(2)
    expect(sparkData['loss'][0]).toEqual({ step: 1, value: 2.5 })
  })

  it('fetchSparklineData returns empty object for experiment with no metrics', async () => {
    await act(async () => {
      await useMetricsStore.getState().fetchSparklineData('exp-no-data')
    })
    const sparkData = useMetricsStore.getState().sparklineData['exp-no-data']
    expect(sparkData).toEqual({})
  })

  it('fetchAllSparklineData fetches for multiple experiments', async () => {
    await RecordMetrics('exp-a', [
      new metrics.Metric({ experiment_id: 'exp-a', step: 1, name: 'loss', value: 1.0, timestamp: 1000 }),
    ])
    await RecordMetrics('exp-b', [
      new metrics.Metric({ experiment_id: 'exp-b', step: 1, name: 'loss', value: 2.0, timestamp: 1000 }),
    ])
    await act(async () => {
      await useMetricsStore.getState().fetchAllSparklineData(['exp-a', 'exp-b'])
    })
    expect(useMetricsStore.getState().sparklineData['exp-a']['loss']).toHaveLength(1)
    expect(useMetricsStore.getState().sparklineData['exp-b']['loss']).toHaveLength(1)
  })
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest src/__tests__/stores/metricsStore.test.ts --no-coverage 2>&1 | tail -20`
Expected: FAIL — `fetchSparklineData is not a function`

**Step 3: Write minimal implementation**

Modify `frontend/src/stores/metricsStore.ts`:

- Add import: `import { QueryMetrics } from '../../wailsjs/go/main/App'`
- Add import: `import { downsampleLTTB, type Point } from '@utils/downsample'`
- Add `sparklineData: Record<string, Record<string, Point[]>>` to state interface and initial state
- Add `fetchSparklineData` action: calls `QueryMetrics(expId, 'loss', 0, 0)` and `QueryMetrics(expId, 'reward', 0, 0)` in parallel, maps results to `Point[]`, downsamples via `downsampleLTTB(points, 60)`, stores in `sparklineData`
- Add `fetchAllSparklineData`: parallel map like `fetchAllLatestMetrics`
- Update `__resetMetricsStore` to also clear `sparklineData: {}`
- Update `initialize` debounce handler to also call `fetchSparklineData`

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest src/__tests__/stores/metricsStore.test.ts --no-coverage 2>&1 | tail -20`
Expected: 6 tests PASS (3 existing + 3 new)

**Step 5: Commit**

```bash
git add frontend/src/stores/metricsStore.ts frontend/src/__tests__/stores/metricsStore.test.ts
git commit -m "feat: add sparkline data fetching to metricsStore (#24)"
```

---

### Task 4: ExperimentCard Sparkline Row

**Files:**
- Modify: `frontend/src/components/Experiments/ExperimentCard.tsx:7-13,48-57,62-71` — add sparklineData prop, sparkline row, memo comparator
- Modify: `frontend/src/components/Experiments/ExperimentCard.css:53+` — sparkline row styles
- Modify: `frontend/src/__tests__/components/Experiments/ExperimentCard.test.tsx` — add 3 tests

**Step 1: Write the failing tests**

Append to `frontend/src/__tests__/components/Experiments/ExperimentCard.test.tsx` inside the existing `describe('ExperimentCard')` block:

```typescript
  // Sparkline charts display
  it('renders sparkline row when sparkline data provided', () => {
    const sparklineData = {
      loss: [{ step: 0, value: 2.0 }, { step: 1, value: 1.5 }, { step: 2, value: 1.0 }],
      reward: [{ step: 0, value: 0.1 }, { step: 1, value: 0.3 }, { step: 2, value: 0.5 }],
    }
    render(<ExperimentCard {...defaultProps} sparklineData={sparklineData} />)
    const sparklineRow = screen.getByTestId('sparkline-row')
    expect(sparklineRow).toBeInTheDocument()
    const svgs = sparklineRow.querySelectorAll('svg')
    expect(svgs).toHaveLength(2)
  })

  it('does not render sparkline row when data is absent', () => {
    render(<ExperimentCard {...defaultProps} />)
    expect(screen.queryByTestId('sparkline-row')).not.toBeInTheDocument()
  })

  it('memo comparator detects sparkline data changes', () => {
    const sparkData1 = {
      loss: [{ step: 0, value: 2.0 }],
    }
    const sparkData2 = {
      loss: [{ step: 0, value: 2.0 }, { step: 1, value: 1.0 }],
    }
    const { rerender } = render(
      <ExperimentCard {...defaultProps} sparklineData={sparkData1} />
    )
    expect(screen.getByTestId('sparkline-row').querySelectorAll('svg')).toHaveLength(1)
    rerender(<ExperimentCard {...defaultProps} sparklineData={sparkData2} />)
    const polyline = screen.getByTestId('sparkline-row').querySelector('polyline')
    const points = polyline!.getAttribute('points')!.split(' ')
    expect(points).toHaveLength(2)
  })
```

**Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest src/__tests__/components/Experiments/ExperimentCard.test.tsx --no-coverage 2>&1 | tail -20`
Expected: FAIL — Unable to find element with data-testid `sparkline-row`

**Step 3: Write minimal implementation**

Modify `frontend/src/components/Experiments/ExperimentCard.tsx`:

- Add import: `import { Sparkline } from './Sparkline'`
- Add import: `import type { Point } from '@utils/downsample'`
- Add to `ExperimentCardProps`: `sparklineData?: Record<string, Point[]>`
- Add to destructured props: `sparklineData`
- After the metrics div, conditionally render sparkline row:
  ```tsx
  {sparklineData && Object.keys(sparklineData).length > 0 && (
    <div className="exp-card__sparklines" data-testid="sparkline-row">
      {sparklineData.loss && (
        <div className="exp-card__sparkline">
          <span className="exp-card__sparkline-label">loss</span>
          <Sparkline data={sparklineData.loss} color="var(--color-chart-1)" />
        </div>
      )}
      {sparklineData.reward && (
        <div className="exp-card__sparkline">
          <span className="exp-card__sparkline-label">reward</span>
          <Sparkline data={sparklineData.reward} color="var(--color-chart-4)" />
        </div>
      )}
    </div>
  )}
  ```
- Update memo comparator: add `prev.sparklineData === next.sparklineData`

Add CSS to `frontend/src/components/Experiments/ExperimentCard.css`:

```css
.exp-card__sparklines {
  display: flex;
  gap: 12px;
  padding-left: 22px;
}

.exp-card__sparkline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.exp-card__sparkline-label {
  font-size: 11px;
  color: var(--color-text-muted);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest src/__tests__/components/Experiments/ExperimentCard.test.tsx --no-coverage 2>&1 | tail -20`
Expected: 16 tests PASS (13 existing + 3 new)

**Step 5: Commit**

```bash
git add frontend/src/components/Experiments/ExperimentCard.tsx frontend/src/components/Experiments/ExperimentCard.css frontend/src/__tests__/components/Experiments/ExperimentCard.test.tsx
git commit -m "feat: add sparkline row to ExperimentCard (#24)"
```

---

### Task 5: ExperimentList Sparkline Pass-through

**Files:**
- Modify: `frontend/src/components/Experiments/ExperimentList.tsx:5-9,28-39` — add sparklineDataMap prop, pass to cards
- Modify: `frontend/src/__tests__/components/Experiments/ExperimentList.test.tsx` — add 1 test

**Step 1: Write the failing test**

Append to `frontend/src/__tests__/components/Experiments/ExperimentList.test.tsx` inside the existing `describe('ExperimentList')` block:

```typescript
  it('passes sparkline data from sparklineDataMap prop to cards', () => {
    const experiments = [makeExperiment('exp-1', 'exp-alpha', 'running')]
    const sparklineDataMap: Record<string, Record<string, { step: number; value: number }[]>> = {
      'exp-1': {
        loss: [{ step: 0, value: 2.0 }, { step: 1, value: 1.0 }],
        reward: [{ step: 0, value: 0.1 }, { step: 1, value: 0.5 }],
      },
    }
    render(
      <ExperimentList
        experiments={experiments}
        selectedId={null}
        onSelect={jest.fn()}
        metricsMap={{}}
        sparklineDataMap={sparklineDataMap}
      />
    )
    expect(screen.getByTestId('sparkline-row')).toBeInTheDocument()
  })
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx jest src/__tests__/components/Experiments/ExperimentList.test.tsx --no-coverage 2>&1 | tail -20`
Expected: FAIL — Unable to find element with data-testid `sparkline-row`

**Step 3: Write minimal implementation**

Modify `frontend/src/components/Experiments/ExperimentList.tsx`:

- Add import: `import type { Point } from '@utils/downsample'`
- Add to `ExperimentListProps`: `sparklineDataMap?: Record<string, Record<string, Point[]>>`
- Add to destructured props: `sparklineDataMap = {}`
- In the map, pass to each card: `sparklineData={sparklineDataMap[exp.id]}`

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest src/__tests__/components/Experiments/ExperimentList.test.tsx --no-coverage 2>&1 | tail -20`
Expected: 7 tests PASS (6 existing + 1 new)

**Step 5: Commit**

```bash
git add frontend/src/components/Experiments/ExperimentList.tsx frontend/src/__tests__/components/Experiments/ExperimentList.test.tsx
git commit -m "feat: pass sparkline data through ExperimentList (#24)"
```

---

### Task 6: Full Test Suite Verification

**Step 1: Run all frontend tests**

Run: `cd frontend && npx jest --no-coverage 2>&1 | tail -30`
Expected: All suites pass, 16 new tests + all existing tests

**Step 2: Run Go tests (sanity check — no Go changes)**

Run: `go test ./... 2>&1 | tail -10`
Expected: All packages pass, no changes

**Step 3: Update TDD doc**

Fill in the "Passing Test Results" and "Implementation Summary" sections of `docs/tdd/024-sparkline-charts.md`.

**Step 4: Commit**

```bash
git add docs/tdd/024-sparkline-charts.md
git commit -m "docs: update TDD doc with passing results (#24)"
```
