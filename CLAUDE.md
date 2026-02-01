# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flux is an ML development environment built with Wails (Go + React/Vite). It focuses on reward model development workflows, providing real-time visualization of training metrics, reward component analysis, and automated detection of reward hacking patterns.

**Tagline:** "The ML development environment" / "Write code. Watch it learn."

## Architecture

- **Framework:** Wails (Go backend + React frontend via system webview)
- **Frontend:** React + Vite + TypeScript
- **Backend:** Go
- **Database:** SQLite (embedded, for experiment data)
- **Charts:** uPlot (lightweight, Canvas-based)

### Performance Targets
- Binary size: ~15MB
- Core RAM: ~200-450MB
- Cold start: < 2-4 seconds
- Idle CPU: Near 0% (event-driven, no polling)

## Project Structure

```
flux-ml/
├── main.go                  # Application entry point
├── app.go                   # Wails application logic
├── wails.json               # Wails configuration
├── internal/                # Go backend packages
│   ├── experiment/          # Experiment management
│   ├── metrics/             # Metrics storage and streaming
│   ├── alerts/              # Reward hack detection
│   └── filesystem/          # File operations
├── frontend/                # React + Vite frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── stores/          # State management
│   │   └── hooks/           # Custom hooks
│   └── wailsjs/             # Generated Wails bindings
├── docs/                    # Documentation
│   └── plan/                # Design and planning docs
└── .claude/                 # Claude Code configuration
```

## Key Concepts

### Experiments
Core data model representing an ML training run with:
- Configuration (hyperparameters, model settings)
- Metrics (loss, reward, KL divergence)
- Reward components (helpfulness, harmlessness, honesty)
- Alerts (detected anomalies)

### Reward Hack Detection
Automated pattern detection for common reward model pathologies:
- Length gaming (correlation between reward and response length)
- Sycophancy (excessive agreement)
- KL divergence drift
- Reward collapse

### Design Principles
- **Dashboard-first:** Experiments view is primary, code editor is secondary
- **No modes:** Unified workspace, fluid navigation between views
- **Everything connected:** Click any value to trace to its source

## Development Guidelines

- All values must be dynamically derived - no hard-coded, fallback, or placeholder data
- Keep solutions simple and focused - avoid over-engineering
- Use event-driven patterns - no polling
- Lazy load data (directory children on expand, metrics on demand)
- Heavy computation in Go backend, frontend receives pre-computed results

## Agents

Project-specific agents in `.claude/agents/`:

**Coding:**
- `frontend-developer` - React/TypeScript UI
- `backend-developer` - Go backend
- `typescript-pro` - TypeScript expertise
- `golang-pro` - Go expertise
- `react-specialist` - React patterns
- `code-reviewer` - Code quality
- `debugger` - Issue diagnosis

**AI/ML:**
- `ai-engineer` - AI system design
- `ml-engineer` - ML model lifecycle
- `mlops-engineer` - ML infrastructure
- `data-scientist` - Statistical analysis
- `llm-architect` - LLM architecture

**Specialized:**
- `ui-designer` - Interface design
- `performance-engineer` - Optimization
- `architect-reviewer` - Architecture review
- `accessibility-tester` - WCAG compliance
- `dx-optimizer` - Developer experience

**Development**
- Test Driven Development (TDD)
- GitHub repo: flux-ml
- Release branch: main
- Default branch: develop
- Create all feature branches from develop
- Branch naming: feature/<issue_#>_<issue_description>
- Create a test document in docs/tdd for each feature/issue
- Include the following sections (see existing examples in docs/tdd): issue summary, acceptance criteria, rationale, failing test, expected output, test summary, passing tests results, implementation summary