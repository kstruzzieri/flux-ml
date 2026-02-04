# Flux Layout Architecture

## Main Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                  │
│  [Logo] [Nav: Experiments | Compare | Data | Code] ... [Status] [⌘K]    │
├────────────────┬────────────────────────────────────┬───────────────────┤
│                │                                    │                   │
│  LEFT SIDEBAR  │         MAIN CONTENT               │  RIGHT INSPECTOR  │
│                │                                    │                   │
│  Experiments   │  Context-sensitive main area:      │  Details of       │
│  ● running     │  - Experiment → metrics/charts     │  current          │
│  ✓ completed   │  - Compare → side-by-side         │  selection        │
│  ✗ failed      │  - Data → dataset browser         │                   │
│                │  - Code → editor                   │  Alerts           │
│  ─────────     │                                    │  Config           │
│  Files         │                                    │  Actions          │
│  └─ configs/   │                                    │                   │
│  └─ src/       │                                    │                   │
│                │                                    │                   │
├────────────────┴────────────────────────────────────┴───────────────────┤
│  BOTTOM PANEL                                                            │
│  [Training Output] [Terminal] [Problems]                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### Header (44px height)
- Logo + name (left)
- Navigation tabs (Experiments, Compare, Data, Code)
- Status indicators (running count, alerts)
- Command palette trigger (⌘K)

### Left Sidebar (280px width)
**Experiments Section** (expandable, primary)
- List of experiments with:
  - Status indicator (running/completed/failed)
  - Name
  - Duration
  - Key metrics (loss, reward)
  - Mini sparkline chart
  - Alert badge if issues detected

**Files Section** (collapsible, secondary)
- Standard file tree
- Collapsed by default when viewing experiments
- Expands when in Code view

### Main Content (flexible)
Changes based on navigation:

**Experiments View:**
- Header: experiment name, status, actions
- Metrics grid: 4 key metrics with trends
- Charts: full-width primary chart, secondary charts grid

**Compare View:**
- Header: experiment chips with color coding, add/remove, baseline indicator
- Tabbed chart area: Loss, Reward, KL Divergence, Response Length, Reward Components
- Metrics comparison table with: values, delta, 95% CI, statistical significance
- Left panel: experiment selection with checkboxes, temporal alignment control (Step/Final/Time)
- Right panel: Reward hack warnings, Winner recommendation with reasoning, Causal attribution, Config diff
- Bottom panel: Output, Terminal, Notes (with comparison metadata and sharable snapshots)

**Data View:**
- Header: dataset name, sample count, search bar, filters (category, length, issues)
- Main: scrollable table with columns (ID, Prompt, Chosen tokens, Rejected tokens, Tags)
- Left panel: dataset list with sample counts, file sizes, experiment associations, import button
- Right panel (top): Sample inspector showing full prompt, chosen/rejected responses with scores, metadata
- Right panel (bottom): Dataset quality metrics (totals, averages), length distribution histogram, issues list
- Bottom panel: Data Log (import/scan activity), Terminal

**Code View:**
- Full editor with tabs
- Standard IDE code editing

### Right Inspector (320px width)
Context-sensitive panel showing:
- Alerts/anomalies with evidence and actions
- Configuration values (clickable to source)
- System stats (GPU, throughput)
- Selected item details

### Bottom Panel (180px height, resizable)
Tabbed panel:
- **Training Output:** Structured log with alerts highlighted
- **Terminal:** Interactive shell
- **Problems:** Errors/warnings from code

## Responsive Behavior

### Panel Resizing
- All panels resizable via drag
- Minimum widths enforced
- State persisted per workspace

### Collapse States
- Left sidebar: can collapse to icons only
- Right inspector: can collapse completely
- Bottom panel: can collapse to tabs only

## Navigation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Experiments ──click──► Experiment Detail                  │
│        │                       │                            │
│        │                  see anomaly                       │
│        │                       │                            │
│        │                       ▼                            │
│        │               Anomaly Inspector ──view examples──► │
│        │                       │                            │
│        │                  click config                      │
│        │                       │                            │
│        │                       ▼                            │
│        │                 Config Detail ──click value──►     │
│        │                       │                            │
│        │                   open file                        │
│        │                       │                            │
│        │                       ▼                            │
│        └──────────────── Code Editor                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Everything stays in context. No page reloads. Fluid transitions.
