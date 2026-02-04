import { useState } from 'react'

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

// Placeholder data - will be replaced with actual data selection
const MOCK_SAMPLE = {
  id: 1847,
  prompt: 'Explain quantum computing to a 10 year old in simple terms that they would understand.',
  chosen: {
    text: 'Imagine you have a magic coin that can be heads AND tails at the same time! Regular computers use bits that are like normal coins - they can only be heads (1) or tails (0). But quantum computers use "qubits" that are like magic coins...',
    score: 0.94,
    tokens: 847,
  },
  rejected: {
    text: 'Quantum computing is a type of computation that harnesses quantum mechanical phenomena such as superposition and entanglement. Unlike classical computers that use bits, quantum computers use quantum bits or qubits...',
    score: 0.67,
    tokens: 623,
  },
  metadata: {
    source: 'human-eval-batch-3',
    annotator: 'reviewer_12',
    confidence: 0.92,
    created: 'Jan 15, 2026',
  },
  isFlagged: true,
}

export function SampleInspectorPanel() {
  const [isFlagged, setIsFlagged] = useState(MOCK_SAMPLE.isFlagged)
  const scoreDelta = MOCK_SAMPLE.chosen.score - MOCK_SAMPLE.rejected.score
  const isAmbiguous = Math.abs(scoreDelta) < 0.1

  return (
    <div className="panel panel--sample-inspector">
      <div className="panel__header">
        <span className="panel__title">Sample Inspector</span>
        <span className="panel__badge">#{MOCK_SAMPLE.id.toLocaleString()}</span>
      </div>
      <div className="panel__content inspector-content">
        {/* Score Comparison Bar */}
        <div className="inspector-score-comparison">
          <div className="inspector-score-comparison__header">
            <span className="inspector-score-comparison__title">Score Comparison</span>
            <span
              className={`inspector-score-comparison__delta ${isAmbiguous ? 'inspector-score-comparison__delta--ambiguous' : 'inspector-score-comparison__delta--good'}`}
            >
              Δ {scoreDelta > 0 ? '+' : ''}
              {scoreDelta.toFixed(2)}
            </span>
          </div>
          <div className="inspector-score-bar">
            {/* Scale tick marks */}
            <div className="inspector-score-bar__scale">
              <div className="inspector-score-bar__tick" />
              <div className="inspector-score-bar__tick" />
              <div className="inspector-score-bar__tick" />
              <div className="inspector-score-bar__tick" />
              <div className="inspector-score-bar__tick" />
            </div>
            {/* Delta region between scores */}
            <div
              className={`inspector-score-bar__delta-region ${isAmbiguous ? 'inspector-score-bar__delta-region--ambiguous' : ''}`}
              style={{
                left: `${MOCK_SAMPLE.rejected.score * 100}%`,
                right: `${(1 - MOCK_SAMPLE.chosen.score) * 100}%`,
              }}
            />
            {/* Rejected marker */}
            <div
              className="inspector-score-marker"
              style={{ left: `${MOCK_SAMPLE.rejected.score * 100}%` }}
            >
              <div className="inspector-score-marker__dot inspector-score-marker__dot--rejected" />
              <span className="inspector-score-marker__label inspector-score-marker__label--rejected">
                {MOCK_SAMPLE.rejected.score.toFixed(2)}
              </span>
            </div>
            {/* Chosen marker */}
            <div
              className="inspector-score-marker"
              style={{ left: `${MOCK_SAMPLE.chosen.score * 100}%` }}
            >
              <div className="inspector-score-marker__dot inspector-score-marker__dot--chosen" />
              <span className="inspector-score-marker__label inspector-score-marker__label--chosen">
                {MOCK_SAMPLE.chosen.score.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="inspector-score-bar__labels">
            <span>0</span>
            <span>0.5</span>
            <span>1.0</span>
          </div>
        </div>

        {/* Prompt */}
        <div className="inspector-field">
          <div className="inspector-field__label">Prompt</div>
          <div className="inspector-field__content">{MOCK_SAMPLE.prompt}</div>
        </div>

        {/* Chosen Response Card */}
        <div className="inspector-response-card inspector-response-card--chosen">
          <div className="inspector-response-card__header inspector-response-card__header--chosen">
            <span className="inspector-response-card__icon">
              <CheckIcon />
            </span>
            <span className="inspector-response-card__label">Chosen</span>
            <span className="inspector-response-card__tokens">{MOCK_SAMPLE.chosen.tokens} tok</span>
            <span className="inspector-response-card__score">
              {MOCK_SAMPLE.chosen.score.toFixed(2)}
            </span>
          </div>
          <div className="inspector-response-card__body">{MOCK_SAMPLE.chosen.text}</div>
        </div>

        {/* Rejected Response Card */}
        <div className="inspector-response-card inspector-response-card--rejected">
          <div className="inspector-response-card__header inspector-response-card__header--rejected">
            <span className="inspector-response-card__icon">
              <XIcon />
            </span>
            <span className="inspector-response-card__label">Rejected</span>
            <span className="inspector-response-card__tokens">
              {MOCK_SAMPLE.rejected.tokens} tok
            </span>
            <span className="inspector-response-card__score">
              {MOCK_SAMPLE.rejected.score.toFixed(2)}
            </span>
          </div>
          <div className="inspector-response-card__body">{MOCK_SAMPLE.rejected.text}</div>
        </div>

        {/* Metadata Grid */}
        <div className="inspector-field">
          <div className="inspector-field__label">Metadata</div>
          <div className="inspector-metadata">
            <div className="inspector-metadata__item">
              <div className="inspector-metadata__label">Source</div>
              <div className="inspector-metadata__value">{MOCK_SAMPLE.metadata.source}</div>
            </div>
            <div className="inspector-metadata__item">
              <div className="inspector-metadata__label">Annotator</div>
              <div className="inspector-metadata__value">{MOCK_SAMPLE.metadata.annotator}</div>
            </div>
            <div className="inspector-metadata__item">
              <div className="inspector-metadata__label">Confidence</div>
              <div className="inspector-metadata__value">{MOCK_SAMPLE.metadata.confidence}</div>
            </div>
            <div className="inspector-metadata__item">
              <div className="inspector-metadata__label">Created</div>
              <div className="inspector-metadata__value">{MOCK_SAMPLE.metadata.created}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="inspector-actions">
        <button
          className={`inspector-action-btn ${isFlagged ? 'inspector-action-btn--active' : ''}`}
          onClick={() => setIsFlagged(!isFlagged)}
          title={isFlagged ? 'Remove flag' : 'Flag for review'}
        >
          <FlagIcon />
          {isFlagged ? 'Flagged' : 'Flag'}
        </button>
        <div className="inspector-actions__spacer" />
        <button className="inspector-action-btn" title="Manage tags">
          <TagIcon />
          Tags
        </button>
      </div>
    </div>
  )
}
