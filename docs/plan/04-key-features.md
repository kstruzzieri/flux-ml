# Flux Key Features

## Tier 1: Core Differentiators

### 1. Reward Component Visualization
Real-time visualization of reward model behavior during training.

**What it shows:**
- Individual reward components (helpfulness, harmlessness, honesty)
- Divergence detection when components separate unexpectedly
- Anomaly highlighting with step markers
- Comparison against baseline runs

**Why it matters:**
Reward hacking often manifests as one component improving at the expense of others. Seeing them separately (not just aggregate reward) catches problems early.

### 2. Reward Hack Auto-Detection
Built-in pattern detection for common reward model pathologies.

**Patterns detected:**
- **Length Gaming:** Correlation between reward and response length
- **Sycophancy:** Excessive agreement with user premise
- **Reward Collapse:** Variance approaching zero
- **KL Divergence Drift:** Policy straying too far from base model

**How it works:**
- Continuous monitoring during training
- Statistical analysis of metrics and outputs
- Alerts with evidence (correlation values, examples)
- Suggested actions (adjust config, review examples)

### 3. Experiment Comparison (Intelligent)
Beyond basic side-by-side comparison — Flux provides actionable insights that existing tools don't.

**Core Features:**
- Overlaid metric trajectories on same axes
- Automatic config diff highlighting
- One-click "set as baseline"
- Temporal alignment (compare at same step, final, or wall time)

**Statistical Significance (Industry Gap):**
- Automatic significance testing (paired t-test, McNemar's)
- Confidence intervals on all metrics (95% CI)
- P-values displayed inline ("p<0.05", "n.s.")
- "Is this difference real?" — not just "is A > B"

**Reward Hack Comparison:**
- Flag experiments showing hacking patterns (length gaming, sycophancy)
- Compare hack metrics across experiments (length-reward correlation)
- Winner recommendation factors in hack risk
- Visual indicators on experiments with detected issues

**Causal Attribution (Unique):**
- "Which config change likely caused this metric difference?"
- Correlation analysis between config diff and metric delta
- Impact ranking: "learning_rate (85%), warmup_steps (42%)"
- Helps researchers understand *why*, not just *what*

**Integrated Notes:**
- Comparison notes attached to the comparison itself
- Auto-captured metadata (date, step alignment, snapshot ID)
- Shareable comparison snapshots
- No more external docs/Notion for comparison conclusions

**Recommended Winner:**
- Automated recommendation with reasoning
- Factors: statistical significance, reward hack risk, practical significance
- Confidence level displayed
- Actionable next steps suggested

### 4. Click-to-Source Navigation
Every value links back to its source.

**Examples:**
- Click config value → opens config file at that line
- Click metric anomaly → shows training examples that caused it
- Click model name → opens model definition code

### 5. Unified Workspace
Code and experiments in one environment.

**Benefits:**
- No context switching to browser for metrics
- Edit config → see impact → fix code → all in one place
- File changes automatically associated with experiments

## Tier 2: Important Features

### 6. Structured Training Output
Training logs parsed into queryable format.

**Instead of:** Raw text scrolling by
**You get:** Structured entries you can filter, search, link

### 7. Event Sourcing
All experiment activity stored as immutable events.

**Enables:**
- "Time travel" debugging - replay what happened
- Understanding *how* a model evolved, not just endpoints
- Comparison of trajectories, not just final metrics

### 8. SQLite + Parquet Architecture
- SQLite for live data (random access, real-time updates)
- Parquet export for analysis (researcher-friendly format)
- Works offline, no server required

### 9. Keyboard-First Interface
Every action accessible via keyboard.

**Key shortcuts:**
- `⌘K` - Command palette
- `⌘⇧R` - Launch experiment
- `⌘⇧.` - Stop experiment
- `⌘⇧C` - Compare experiments

## Tier 3: Nice-to-Have

### 10. GPU Monitoring
System stats when training locally or on remote GPUs.

### 11. Environment Management
Detect and switch between conda/venv/pyenv environments.

### 12. TensorBoard Integration
Launch TensorBoard, deep link to specific experiments.

## Not Building (Explicit Scope Cut)

| Feature | Reason |
|---------|--------|
| MLflow/W&B adapters | Future version |
| Full notebook interface | Out of scope |
| Distributed training orchestration | Let users use Ray/Horovod |
| Model serving | Not a research IDE concern |
| Plugin marketplace | Adds complexity |
| GPU job submission (Vast.ai) | Future version |
| DAP debugging | Not differentiating |
