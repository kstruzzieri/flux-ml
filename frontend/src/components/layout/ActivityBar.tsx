import type { ViewId } from './Header'
import {
  BarChartIcon,
  ColumnsIcon,
  DatabaseIcon,
  CodeIcon,
  AlertTriangleIcon,
  SettingsIcon,
} from '../ui/Icon'

const ACTIVITY_ITEMS: { id: ViewId; label: string; icon: JSX.Element }[] = [
  {
    id: 'experiments',
    label: 'Experiments',
    icon: <BarChartIcon />,
  },
  {
    id: 'compare',
    label: 'Compare',
    icon: <ColumnsIcon />,
  },
  {
    id: 'data',
    label: 'Data',
    icon: <DatabaseIcon />,
  },
  {
    id: 'code',
    label: 'Code',
    icon: <CodeIcon />,
  },
]

const BOTTOM_ITEMS = [
  {
    id: 'alerts',
    label: 'Alerts',
    icon: <AlertTriangleIcon />,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon />,
  },
] as const

interface ActivityBarProps {
  activeItem?: ViewId
  onItemClick?: (id: ViewId) => void
}

export function ActivityBar({ activeItem = 'experiments', onItemClick }: ActivityBarProps) {
  return (
    <aside className="activity-bar" role="navigation" aria-label="Activity bar">
      {ACTIVITY_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`activity-bar__btn ${item.id === activeItem ? 'activity-bar__btn--active' : ''}`}
          title={item.label}
          aria-label={item.label}
          aria-current={item.id === activeItem ? 'page' : undefined}
          data-testid={`activity-${item.id}`}
          onClick={() => onItemClick?.(item.id)}
        >
          {item.icon}
        </button>
      ))}

      <div className="activity-bar__divider" />

      {/* Alerts button - not a navigation view */}
      <button
        className="activity-bar__btn"
        title={BOTTOM_ITEMS[0].label}
        aria-label={BOTTOM_ITEMS[0].label}
      >
        {BOTTOM_ITEMS[0].icon}
      </button>

      <div className="activity-bar__spacer" />

      {/* Settings button - not a navigation view */}
      <button
        className="activity-bar__btn"
        title={BOTTOM_ITEMS[1].label}
        aria-label={BOTTOM_ITEMS[1].label}
      >
        {BOTTOM_ITEMS[1].icon}
      </button>
    </aside>
  )
}
