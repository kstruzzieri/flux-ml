import { useCallback, useEffect, useState } from 'react'
import { Header, ViewId } from './Header'
import { ActivityBar } from './ActivityBar'
import { Content, AppMode } from './Content'
import { GetAppInfo, OpenProject, RemoveRecentProject } from '../../../wailsjs/go/main/App'
import { useKeyboardShortcuts, useLayoutPersistence } from '../../hooks'
import { useProjectStore } from '../../stores/projectStore'
import type { RecentProjectEntry } from '../project'

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
  const [compatMode, setCompatMode] = useState(false)
  const layout = useLayoutPersistence()

  const currentProject = useProjectStore((s) => s.currentProject)
  const hydrated = useProjectStore((s) => s.hydrated)
  const initialize = useProjectStore((s) => s.initialize)
  const recentProjects = useProjectStore((s) => s.recentProjects)
  const fetchRecentProjects = useProjectStore((s) => s.fetchRecentProjects)

  const [recentProjectErrors, setRecentProjectErrors] = useState<Record<string, string>>({})

  // TODO: These will be driven by actual experiment state
  const [runningCount] = useState(0)
  const [alertCount] = useState(0)

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    GetAppInfo()
      .then((info) => setAppInfo(info as AppInfo))
      .catch((err) => console.error('Failed to get app info:', err))
  }, [])

  useEffect(() => {
    if (currentProject) {
      setCompatMode(false)
    }
  }, [currentProject])

  const handleViewChange = useCallback((view: ViewId) => {
    setActiveView(view)
  }, [])

  const handleCommandPalette = useCallback(() => {
    // TODO: Open command palette modal
    console.log('Command palette triggered')
  }, [])

  // Handler stubs — implemented in future tasks
  const handleNewProject = useCallback(() => {
    // TODO: Task 8 — open New Project dialog
  }, [])

  const handleOpenFolder = useCallback(() => {
    // TODO: Task 11 — open folder dialog
  }, [])

  const handleOpenExisting = useCallback(() => {
    // TODO: Task 11 — open existing project dialog
  }, [])

  const handleOpenRecentProject = useCallback(async (path: string) => {
    try {
      await OpenProject(path)
      setRecentProjectErrors((prev) => {
        const next = { ...prev }
        delete next[path]
        return next
      })
    } catch (err) {
      setRecentProjectErrors((prev) => ({
        ...prev,
        [path]: err instanceof Error ? err.message : String(err),
      }))
    }
  }, [])

  const handleRemoveRecentProject = useCallback(
    async (path: string) => {
      try {
        await RemoveRecentProject(path)
        await fetchRecentProjects()
      } catch (err) {
        console.error('Failed to remove recent project:', err)
      }
    },
    [fetchRecentProjects]
  )

  // Used by WelcomeScreen (Task 5) and NoProjectBanner (Task 12)
  const handleEnterCompatMode = useCallback(() => {
    setCompatMode(true)
  }, [])

  // Derive app mode and disabled views (before hooks to maintain consistent hook call order)
  const appMode: AppMode = currentProject ? 'project' : compatMode ? 'no-project-compat' : 'welcome'

  const recentProjectEntries: RecentProjectEntry[] = recentProjects.map((p) => ({
    ...p,
    error: recentProjectErrors[p.path],
  }))

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
      <Content
        activeView={activeView}
        layout={layout}
        appMode={appMode}
        recentProjects={recentProjectEntries}
        onNewProject={handleNewProject}
        onOpenFolder={handleOpenFolder}
        onOpenExisting={handleOpenExisting}
        onBrowseExperiments={handleEnterCompatMode}
        onOpenRecentProject={handleOpenRecentProject}
        onRemoveRecentProject={handleRemoveRecentProject}
      />
    </div>
  )
}
