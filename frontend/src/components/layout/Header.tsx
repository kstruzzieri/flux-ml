export type ViewId = 'experiments' | 'compare' | 'data' | 'code'

interface HeaderProps {
  version?: string
  activeView?: ViewId
  onViewChange?: (view: ViewId) => void
  runningCount?: number
  alertCount?: number
  onCommandPalette?: () => void
}

const NAV_ITEMS: { id: ViewId; label: string }[] = [
  { id: 'experiments', label: 'Experiments' },
  { id: 'compare', label: 'Compare' },
  { id: 'data', label: 'Data' },
  { id: 'code', label: 'Code' },
]

function FluxIcon() {
  return (
    <svg className="header__logo" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <filter id="header-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect x="8" y="8" width="84" height="84" rx="18" fill="#0a0e14" />

      {/* Helpfulness (green) - trends up */}
      <path
        d="M22 55 Q35 55 45 50 Q55 45 65 30 Q72 22 78 20"
        stroke="#10B981"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        filter="url(#header-glow)"
      />

      {/* Harmlessness (amber) - diverges down */}
      <path
        d="M22 55 Q35 55 45 58 Q55 62 65 70 Q72 76 78 78"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        filter="url(#header-glow)"
      />

      {/* Honesty (cyan) - stays middle */}
      <path
        d="M22 55 Q35 55 50 52 Q60 50 78 48"
        stroke="#06B6D4"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        filter="url(#header-glow)"
      />

      {/* Starting point */}
      <circle cx="22" cy="55" r="4" fill="#F0F6FC" opacity="0.8" />

      {/* Endpoints */}
      <circle cx="78" cy="20" r="3" fill="#10B981" filter="url(#header-glow)" />
      <circle cx="78" cy="78" r="3" fill="#F59E0B" filter="url(#header-glow)" />
      <circle cx="78" cy="48" r="3" fill="#06B6D4" filter="url(#header-glow)" />
    </svg>
  )
}

export function Header({
  version,
  activeView = 'experiments',
  onViewChange,
  runningCount = 0,
  alertCount = 0,
  onCommandPalette,
}: HeaderProps) {
  return (
    <header className="header" role="banner">
      <div className="header__brand">
        <FluxIcon />
        <span className="header__title">Flux</span>
      </div>

      <nav className="header__nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`header__nav-item ${item.id === activeView ? 'header__nav-item--active' : ''}`}
            aria-current={item.id === activeView ? 'page' : undefined}
            onClick={() => onViewChange?.(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="header__spacer" />

      {alertCount > 0 && (
        <div className="header__status header__status--warning">
          <span className="header__status-dot header__status-dot--warning" />
          <span>
            {alertCount} {alertCount === 1 ? 'alert' : 'alerts'}
          </span>
        </div>
      )}

      {runningCount > 0 && (
        <div className="header__status">
          <span className="header__status-dot" />
          <span>
            {runningCount} {runningCount === 1 ? 'running' : 'running'}
          </span>
        </div>
      )}

      <button
        className="header__command-palette"
        onClick={onCommandPalette}
        aria-label="Open command palette"
      >
        <kbd className="header__kbd">⌘K</kbd>
      </button>

      {version && <span className="header__version">v{version}</span>}
    </header>
  )
}
