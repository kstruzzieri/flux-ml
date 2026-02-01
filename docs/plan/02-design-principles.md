# Flux Design Principles

## Core Philosophy

### No Modes, Just Flow
There are no "Code Mode" or "ML Mode" switches. It's one unified workspace where everything is connected. You drill in and out fluidly:

```
Experiment list → Click experiment → Metrics appear
See anomaly → Click it → Config at that point
See config value → Click it → Code file opens
Fix code → Save → Still in context, experiment right there
```

### Dashboard-First, Code-On-Demand
The primary view is experiment status and health. Code is what you go *into* when something needs fixing. This matches how ML researchers actually work:
- Morning: Check overnight runs
- Mid-day: Analyze results, tweak config
- Afternoon: Launch experiments, monitor
- End of day: Set up overnight runs

### Everything Connected
- Click a metric anomaly → see the config/code that produced it
- Click a config value → jump to where it's defined
- Click a training example → see its impact on the model

## Visual Design

### Color Palette

**Backgrounds:**
- Base: `#06090c` (near black)
- Surface: `#0d1117` (panels)
- Elevated: `#161b22` (cards, hovers)

**Primary Accent - Cyan:**
- Main: `#06b6d4`
- Bright: `#22d3ee`
- Dim: `rgba(6, 182, 212, 0.12)`
- Glow: `rgba(6, 182, 212, 0.4)`

**Status Colors:**
- Success: `#10b981` (green)
- Warning: `#f59e0b` (amber)
- Error: `#ef4444` (red)

**Chart Colors:**
- Chart 1: `#06b6d4` (cyan)
- Chart 2: `#8b5cf6` (purple)
- Chart 3: `#f59e0b` (amber)
- Chart 4: `#10b981` (green)
- Chart 5: `#ec4899` (pink)

**Text:**
- Primary: `#e6edf3`
- Secondary: `#8b9eb0`
- Muted: `#4a5d73`

### Typography
- **UI text:** Inter (clean, readable)
- **Data/metrics:** JetBrains Mono (monospace)
- **Density:** Slightly smaller than typical web apps (12px minimum) for data-dense interfaces

### Visual Identity
- Dark theme (standard for dev tools)
- Cyan accent (not owned by competitors)
- Data-dense but not cluttered
- Charts are first-class, not crammed into tiny panels
- Glowing effects for live/alert states
- Subtle animations for status indicators

## What Makes It NOT Look Like...

### VS Code / JetBrains
- Less emphasis on file tree (it's there, but not the star)
- Metrics/experiments as prominent as files
- Richer use of color for status
- Inline visualizations, not just text

### W&B / MLflow
- Code is integrated, not separate
- Tighter, more IDE-like density
- Keyboard-first interactions
- No "web app" feel (no excessive padding, breadcrumbs)

## Interaction Patterns

### Keyboard-First
Every action accessible via keyboard. Command palette (`⌘K`) for everything.

### Live Updates
- Pulsing dots on running experiments
- Animated chart points for latest data
- Glowing borders for alerts

### Drill-Down Navigation
Click anything to go deeper. Always clear path back.

### Contextual Actions
Right panel (Inspector) shows context-sensitive information and actions based on selection.
