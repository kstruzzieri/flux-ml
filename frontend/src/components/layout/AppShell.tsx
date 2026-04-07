import { useCallback, useEffect, useState } from 'react'
import { Header, ViewId } from './Header'
import { ActivityBar } from './ActivityBar'
import { Content, AppMode } from './Content'
import { GetAppInfo } from '../../../wailsjs/go/main/App'
import { useKeyboardShortcuts, useLayoutPersistence } from '../../hooks'
import { useProjectStore } from '../../stores/projectStore'

interface AppInfo {
  name: string
  version: string
}

const ALL_VIEWS = new Set<ViewId>(['experiments', 'compare', 'data', 'code'])
const NO_PROJECT_COMPAT_DISABLED = new Set<ViewId>(['compare', 'data', 'code'])
const EMPTY_DISABLED = new Set<ViewId>()

export function AppShell() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [activeView, setActiveView] = useState<ViewId>('experiments')
  const layout = useLayoutPersistence()

  const currentProject = useProjectStore((s) => s.currentProject)
  const hydrated = useProjectStore((s) => s.hydrated)
  const initialize = useProjectStore((s) => s.initialize)

  // TODO: These will be driven by actual experiment state
  const [runningCount] = useState(0)
  const [alertCount] = useState(0)

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    Promise.resolve(GetAppInfo())
      .then((info) => setAppInfo(info as AppInfo))
      .catch((err) => console.error('Failed to get app info:', err))
  }, [])

  const handleViewChange = useCallback((view: ViewId) => {
    setActiveView(view)
  }, [])

  const handleCommandPalette = useCallback(() => {
    // TODO: Open command palette modal
    console.log('Command palette triggered')
  }, [])

  // Derive app mode and disabled views (before hooks to maintain consistent hook call order)
  const appMode: AppMode = hydrated ? (currentProject ? 'project' : 'welcome') : 'welcome'

  const disabledViews: Set<ViewId> =
    !hydrated || appMode === 'welcome'
      ? ALL_VIEWS
      : appMode === 'no-project-compat'
        ? NO_PROJECT_COMPAT_DISABLED
        : EMPTY_DISABLED

  // Must be called unconditionally (no conditional hooks)
  useKeyboardShortcuts({
    onViewChange: handleViewChange,
    onCommandPalette: handleCommandPalette,
    disabledViews,
  })

  // Bootstrap gate: show nothing until hydration is complete
  if (!hydrated) {
    return <div className="app-shell" data-testid="app-bootstrap" />
  }

  return (
    <div className="app-shell">
      <Header
        version={appInfo?.version}
        activeView={activeView}
        onViewChange={handleViewChange}
        runningCount={runningCount}
        alertCount={alertCount}
        onCommandPalette={handleCommandPalette}
        disabledViews={disabledViews}
      />
      <ActivityBar
        activeItem={activeView}
        onItemClick={handleViewChange}
        disabledItems={disabledViews}
      />
      <Content activeView={activeView} layout={layout} appMode={appMode} />
    </div>
  )
}
