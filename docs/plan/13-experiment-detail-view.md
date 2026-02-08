# Experiment Detail View Layout — Design Document

**Issue:** #26
**Date:** 2026-02-08
**Status:** Approved

## Problem

When a researcher selects an experiment, the MainPanel shows a header with name/status but an empty dashboard area. Researchers need at-a-glance access to training health — core metrics, reward component balance, and trend information — without clicking through multiple dashboards.

## Design Principles

- **Vital signs, not raw numbers** — Surface health status alongside values. Color-coded borders indicate whether a metric is healthy, concerning, or critical.
- **Reward component balance front-and-center** — Divergence between reward components is the most dangerous signal in RLHF training. Don't hide it behind a tab.
- **2-second glance rule** — A researcher should answer "is anything off?" within 2 seconds of selecting an experiment.

## Layout Structure

Three vertical sections within MainPanel, scrolling together:

### 1. Experiment Header (existing, enhanced)

- Status dot + experiment name + duration + status (already built)
- **New:** Step count display (e.g., "Step 12,400") — researchers orient by step number

### 2. Metrics Grid (new)

Responsive grid of metric cards:

**Row 1 (4 cards):**
| Loss | Reward | KL Divergence | Learning Rate |
|------|--------|---------------|---------------|

**Row 2:**
| Reward Components (2-col span) |
|--------------------------------|

> **Note:** ML engineer review recommended replacing Learning Rate with Gradient Norm and adding Policy Entropy. These are deferred to #107 since the seed data and backend don't yet emit these metrics. The grid structure supports easy swapping once those metrics are available.

### 3. Charts Area (new, placeholder)

Tabbed area for future Phase 3 uPlot integration:
- Tab bar: "Overview" | "Reward Components" | "Diagnostics"
- Chart body: centered placeholder with icon and message

> **Note:** Tab names follow ML engineer recommendation to organize by workflow ("routine check", "reward model health", "dig deeper") rather than individual metric names. Actual chart content deferred to Phase 3.

## Metric Card Design

Each card has consistent anatomy:

```
┌─ health border (left accent: green/amber/red/muted) ─┐
│  LABEL          (uppercase, muted, 10px)              │
│  0.2341         (mono font, 20px, primary color)      │
│  ↓ 0.03         (trend arrow + delta, colored)         │
└───────────────────────────────────────────────────────┘
```

### Health Thresholds

Thresholds are stored as a configurable `HEALTH_THRESHOLDS` constant in `health.ts` — documented as defaults that will become user-configurable in Phase 4.

| Metric | Green | Amber | Red |
|--------|-------|-------|-----|
| Loss | Decreasing (window avg) | Flat | Increasing |
| Reward | Increasing (window avg) | Flat | Decreasing |
| KL Divergence | Trend stable | Accelerating upward | Exponential runaway |
| Learning Rate | No health coloring | — | — |

**Trend computation:** Compare mean of last 10 downsampled sparkline points vs. previous 10 points (20-point window). This provides stable trend assessment from the existing 60-point LTTB data without additional queries. Avoids the noise of 2-point comparison.

**Insufficient data state:** When an experiment has fewer data points than the trend window requires, health border shows muted (no color) — not a false green/amber/red.

> **Note:** KL thresholds changed from absolute values (0.05/0.1) to trend-based per ML engineer review. Absolute KL values vary dramatically by training algorithm and KL coefficient. Cross-metric health logic (reward up + KL diverging = reward hacking) deferred to #105.

### Reward Components Card

Wider card spanning 2 grid columns:

```
┌─ health border ──────────────────────────────────┐
│  REWARD COMPONENTS              Step 9,990        │
│  Helpfulness    ████████████░░░░  0.82            │
│  Harmlessness   ██████████░░░░░░  0.74            │
│  Honesty        ███████████░░░░░  0.79            │
└──────────────────────────────────────────────────┘
```

Health border turns amber when any component is >2x another **AND** the max-min spread exceeds 0.1 (avoids false alarms on near-zero values).

Displays the step number the reward signal data corresponds to, since rewards and metrics may arrive at different steps.

## Component Architecture

```
MainPanel (modified)
├── ExperimentHeader (existing section, add step count)
├── MetricsGrid (new)
│   ├── MetricCard × 4 (reusable)
│   └── RewardComponentsCard (specialized)
└── ChartsArea (new)
    ├── ChartTabs (tab navigation)
    └── ChartPlaceholder (placeholder body)
```

## File Plan

| File | Purpose |
|------|---------|
| `components/Experiments/MetricCard.tsx` | Single metric card with health border |
| `components/Experiments/MetricCard.css` | Card styles |
| `components/Experiments/RewardComponentsCard.tsx` | Reward components card with bars |
| `components/Experiments/MetricsGrid.tsx` | Grid layout, fetches data |
| `components/Experiments/ChartsArea.tsx` | Tabbed charts placeholder |
| `components/Experiments/ChartsArea.css` | Charts area styles |
| `components/layout/panels/MainPanel.tsx` | Modified to compose new components |
| `styles/components/layout.css` | Additional grid/card CSS |
| `utils/formatting.ts` | Extended for KL, LR formatting |
| `utils/health.ts` | Trend computation and health thresholds |

## Data Flow

- `MainPanel` gets `selectedId` from `experimentStore`
- `MetricsGrid` calls `metricsStore.fetchLatestMetrics(id)` and reads `latestMetrics[id]`
- Trend arrows computed from `sparklineData[id]` using 20-point windowed average comparison
- **Reward signals:** Subscribe to `rewards:recorded` Wails event in metricsStore (or extend with dedicated methods). Fetch latest reward signals via `QueryRewardSignals`. This ensures the RewardComponentsCard updates reactively.
- No new store needed — existing metricsStore extended with reward signal support

## Test Plan

1. **MetricCard:** renders label/value/trend, correct health colors, handles null values, muted border for insufficient data
2. **RewardComponentsCard:** renders 3 bars, proportional widths, divergence detection with min-spread guard, displays step number
3. **MetricsGrid:** renders all cards, fetches on mount, handles loading/empty states
4. **ChartsArea:** renders tabs, active tab toggles, placeholder content
5. **MainPanel integration:** welcome screen without selection, full detail with selection, step count in header
6. **Health utilities:** windowed trend computation, threshold evaluation, insufficient data handling

## What We're NOT Building

- Real chart rendering (Phase 3 — uPlot)
- Configurable threshold UI (Phase 4 — alert engine)
- Cross-metric health correlation (#105)
- Server-side LTTB downsampling (#104)
- Throughput metric (#106)
- Gradient norm / policy entropy metrics (#107)
- Live updating animations (handled by existing store event subscriptions)
- Config display (already in InspectorPanel/ConfigPanel)

## Expert Review Notes

Design reviewed by ML engineer and MLOps engineer agents. Key findings incorporated:
- Trend-based KL thresholds instead of absolute values
- 20-point windowed trend computation instead of 2-point
- `rewards:recorded` event subscription for live reward component updates
- Step number display on RewardComponentsCard
- Min-spread guard on reward component divergence detection
- Insufficient data state for health borders
- Chart tabs renamed to workflow-oriented names

Deferred findings tracked as follow-up issues:
- #104: Server-side LTTB downsampling for sparkline scalability
- #105: Cross-metric health logic for reward hacking detection
- #106: Throughput metric (steps/sec)
- #107: Gradient norm and policy entropy metrics
