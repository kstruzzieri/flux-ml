import { useState } from 'react'

interface DataSample {
  id: number
  prompt: string
  chosenTokens: number
  rejectedTokens: number
  delta: number
  tags: string[]
  issue?: string
}

// Placeholder data - will be replaced with actual data from backend
const MOCK_SAMPLES: DataSample[] = [
  {
    id: 1847,
    prompt:
      'Explain quantum computing to a 10 year old in simple terms that they would understand.',
    chosenTokens: 847,
    rejectedTokens: 623,
    delta: 36,
    tags: ['science', 'eli5'],
  },
  {
    id: 1848,
    prompt: 'Write a short poem about the feeling of rain on a summer afternoon.',
    chosenTokens: 234,
    rejectedTokens: 189,
    delta: 24,
    tags: ['creative'],
  },
  {
    id: 1849,
    prompt:
      "Help me debug this Python code that's throwing a KeyError when accessing a dictionary.",
    chosenTokens: 512,
    rejectedTokens: 445,
    delta: 15,
    tags: ['coding', 'python'],
  },
  {
    id: 1850,
    prompt:
      'What are the main differences between classical and operant conditioning in psychology?',
    chosenTokens: 678,
    rejectedTokens: 723,
    delta: -6,
    tags: ['science', 'psychology'],
    issue: 'Ambiguous margin',
  },
  {
    id: 1851,
    prompt:
      "I completely agree with everything you're saying and think you're absolutely right about this topic.",
    chosenTokens: 156,
    rejectedTokens: 892,
    delta: 0,
    tags: ['sycophancy'],
    issue: 'Sycophancy test',
  },
  {
    id: 1852,
    prompt:
      'Summarize the key points of the French Revolution and its impact on European politics.',
    chosenTokens: 1247,
    rejectedTokens: 834,
    delta: 50,
    tags: ['history'],
  },
]

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function DataBrowserPanel() {
  const [selectedId, setSelectedId] = useState<number | null>(1847)
  const totalSamples = 45231

  return (
    <div className="panel panel--data-browser">
      {/* Header with search and filters */}
      <div className="data-header">
        <div className="data-header__title">
          preference-data-v2
          <span className="data-header__count">{totalSamples.toLocaleString()} samples</span>
        </div>
        <div className="data-header__spacer" />
        <div className="data-search">
          <SearchIcon />
          <input type="text" className="data-search__input" placeholder="Search prompts..." />
        </div>
        <div className="data-filters">
          <button className="data-filter">
            Category
            <ChevronDownIcon />
          </button>
          <button className="data-filter">
            Length
            <ChevronDownIcon />
          </button>
          <button className="data-filter">
            Issues
            <ChevronDownIcon />
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Prompt</th>
              <th>Chosen</th>
              <th>Rejected</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_SAMPLES.map((sample) => (
              <tr
                key={sample.id}
                className={`
                  ${selectedId === sample.id ? 'data-table__row--selected' : ''}
                  ${sample.issue ? 'data-table__row--has-issue' : ''}
                `}
                onClick={() => setSelectedId(sample.id)}
              >
                <td className="data-table__id">{sample.id.toLocaleString()}</td>
                <td className="data-table__prompt">
                  <div className="data-table__prompt-text">{sample.prompt}</div>
                </td>
                <td>
                  <div className="data-table__response">
                    <span className="data-table__response-icon data-table__response-icon--chosen">
                      <CheckIcon />
                    </span>
                    <span className="data-table__tokens">{sample.chosenTokens} tok</span>
                  </div>
                </td>
                <td>
                  <div className="data-table__response">
                    <span className="data-table__response-icon data-table__response-icon--rejected">
                      <XIcon />
                    </span>
                    <span className="data-table__tokens">{sample.rejectedTokens} tok</span>
                    {sample.delta !== 0 && (
                      <span
                        className={`data-table__delta ${sample.delta > 0 ? 'data-table__delta--positive' : 'data-table__delta--negative'}`}
                      >
                        {sample.delta > 0 ? '+' : ''}
                        {sample.delta}%
                      </span>
                    )}
                    {sample.issue?.includes('margin') && (
                      <span className="data-table__margin-warning">⚠ Δ&lt;0.1</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="data-table__tags">
                    {sample.tags.map((tag) => (
                      <span key={tag} className="data-table__tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  {sample.issue && (
                    <div className="data-table__issue">
                      <span>⚠</span> {sample.issue}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="data-pagination">
        <span className="data-pagination__info">
          Showing 1,847 - 1,852 of {totalSamples.toLocaleString()}
        </span>
        <div className="data-pagination__controls">
          <button className="data-pagination__btn">← Prev</button>
          <button className="data-pagination__btn">1</button>
          <button className="data-pagination__btn">...</button>
          <button className="data-pagination__btn data-pagination__btn--active">308</button>
          <button className="data-pagination__btn">309</button>
          <button className="data-pagination__btn">...</button>
          <button className="data-pagination__btn">7,539</button>
          <button className="data-pagination__btn">Next →</button>
        </div>
      </div>
    </div>
  )
}
