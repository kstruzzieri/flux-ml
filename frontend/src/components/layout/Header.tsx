import { useCallback } from 'react'
import { BarChartIcon, ColumnsIcon, DatabaseIcon, CodeIcon } from '../ui/Icon'
import { ToggleMaximize } from '../../../wailsjs/go/main/App'

export type ViewId = 'experiments' | 'compare' | 'data' | 'code'

interface HeaderProps {
  version?: string
  activeView?: ViewId
  onViewChange?: (view: ViewId) => void
  runningCount?: number
  alertCount?: number
  onCommandPalette?: () => void
}

const NAV_ITEMS: { id: ViewId; label: string; icon: React.JSX.Element }[] = [
  { id: 'experiments', label: 'Experiments', icon: <BarChartIcon /> },
  { id: 'compare', label: 'Compare', icon: <ColumnsIcon /> },
  { id: 'data', label: 'Data', icon: <DatabaseIcon /> },
  { id: 'code', label: 'Code', icon: <CodeIcon /> },
]

function FluxIcon() {
  return (
    <svg className="titlebar__logo" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <filter id="titlebar-glow" x="-50%" y="-50%" width="200%" height="200%">
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
        filter="url(#titlebar-glow)"
      />

      {/* Harmlessness (amber) - diverges down */}
      <path
        d="M22 55 Q35 55 45 58 Q55 62 65 70 Q72 76 78 78"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        filter="url(#titlebar-glow)"
      />

      {/* Honesty (cyan) - stays middle */}
      <path
        d="M22 55 Q35 55 50 52 Q60 50 78 48"
        stroke="#06B6D4"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        filter="url(#titlebar-glow)"
      />

      {/* Starting point */}
      <circle cx="22" cy="55" r="4" fill="#F0F6FC" opacity="0.8" />

      {/* Endpoints */}
      <circle cx="78" cy="20" r="3" fill="#10B981" filter="url(#titlebar-glow)" />
      <circle cx="78" cy="78" r="3" fill="#F59E0B" filter="url(#titlebar-glow)" />
      <circle cx="78" cy="48" r="3" fill="#06B6D4" filter="url(#titlebar-glow)" />
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
  const handleDoubleClick = useCallback(() => {
    ToggleMaximize()
  }, [])

  return (
    <header className="titlebar" role="banner" onDoubleClick={handleDoubleClick}>
      {/* Traffic lights spacer (macOS) */}
      <div className="titlebar__traffic-lights" aria-hidden="true" />

      <div className="titlebar__left">
        <FluxIcon />
        <span className="titlebar__title">Flux</span>
      </div>

      <nav className="titlebar__nav" aria-label="Workspace navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`titlebar__tab ${item.id === activeView ? 'titlebar__tab--active' : ''}`}
            aria-current={item.id === activeView ? 'page' : undefined}
            onClick={() => onViewChange?.(item.id)}
          >
            <span className="titlebar__tab-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="titlebar__right">
        {alertCount > 0 && (
          <div className="titlebar__status titlebar__status--warning">
            <span className="titlebar__status-dot titlebar__status-dot--warning" />
            <span>
              {alertCount} {alertCount === 1 ? 'alert' : 'alerts'}
            </span>
          </div>
        )}

        {runningCount > 0 && (
          <div className="titlebar__status">
            <span className="titlebar__status-dot" />
            <span>
              {runningCount} {runningCount === 1 ? 'running' : 'running'}
            </span>
          </div>
        )}

        <button
          className="titlebar__cmd"
          onClick={onCommandPalette}
          aria-label="Open command palette"
        >
          <kbd className="titlebar__kbd">⌘K</kbd>
        </button>

        {version && <span className="titlebar__version">v{version}</span>}
      </div>
    </header>
  )
}
