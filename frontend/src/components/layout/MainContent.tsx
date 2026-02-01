export function MainContent() {
  return (
    <main className="main-content" role="main">
      <div className="main-content__body">
        <div className="main-content__placeholder">
          <div className="main-content__placeholder-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
          </div>
          <span className="main-content__placeholder-text">
            Select an experiment to view metrics
          </span>
        </div>
      </div>
    </main>
  )
}
