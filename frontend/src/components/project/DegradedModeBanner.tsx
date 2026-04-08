import { useState } from 'react'
import './DegradedModeBanner.css'

export function DegradedModeBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="degraded-banner" role="alert">
      <span className="degraded-banner__message">
        flux.yaml has errors. Some features are disabled.
      </span>
      <button
        className="degraded-banner__dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
