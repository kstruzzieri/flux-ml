import { useCallback, useEffect, useMemo, useState } from 'react'
import { Header, ViewId } from './Header'
import { ActivityBar } from './ActivityBar'
import { Content, AppMode } from './Content'
import {
  GetAppInfo,
  OpenProject,
  RemoveRecentProject,
  OpenFolderDialog,
  IsFluxProject,
  OpenFolderAsProject,
} from '../../../wailsjs/go/main/App'
import { useKeyboardShortcuts, useLayoutPersistence } from '../../hooks'
import { useProjectStore } from '../../stores/projectStore'
import {
  ProjectSwitcher,
  type RecentProjectEntry,
  NewProjectWizard,
  ImportDialog,
} from '../project'

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
  const degraded = useProjectStore((s) => s.degraded)
  const closeProject = useProjectStore((s) => s.closeProject)

  const [recentProjectErrors, setRecentProjectErrors] = useState<Record<string, string>>({})
  const [showWizard, setShowWizard] = useState(false)
  const [importState, setImportState] = useState<{ path: string; name: string } | null>(null)

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
  }, [])

  const handleNewProject = useCallback(() => {
    setShowWizard(true)
  }, [])

  const handleWizardClose = useCallback(() => {
    setShowWizard(false)
  }, [])

  const handleWizardCreated = useCallback(() => {
    setShowWizard(false)
  }, [])

  const handleOpenFolder = useCallback(async () => {
    try {
      const dir = await OpenFolderDialog()
      if (!dir) return
      const isFlux = await IsFluxProject(dir)
      if (isFlux) {
        await OpenProject(dir)
      } else {
        const basename = dir.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'project'
        setImportState({ path: dir, name: basename })
      }
    } catch (err) {
      console.error('Open folder failed:', err)
    }
  }, [])

  const handleOpenExisting = useCallback(async () => {
    try {
      const dir = await OpenFolderDialog()
      if (!dir) return
      const isFlux = await IsFluxProject(dir)
      if (isFlux) {
        await OpenProject(dir)
      } else {
        // TODO: Surface as toast when toast system is available
        console.warn(`No flux.yaml found in ${dir}. Use "Open Folder" to import.`)
      }
    } catch (err) {
      console.error('Open existing failed:', err)
    }
  }, [])

  const handleImportConfirm = useCallback(
    async (name: string, seedDemo: boolean) => {
      if (!importState) return
      try {
        await OpenFolderAsProject(importState.path, name, seedDemo)
        setImportState(null)
      } catch (err) {
        console.error('Import failed:', err)
      }
    },
    [importState]
  )

  const handleImportCancel = useCallback(() => {
    setImportState(null)
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

  const handleCloseProject = useCallback(async () => {
    await closeProject()
  }, [closeProject])

  // Used by WelcomeScreen (Task 5) and NoProjectBanner (Task 12)
  const handleEnterCompatMode = useCallback(() => {
    setCompatMode(true)
  }, [])

  // Derive app mode and disabled views (before hooks to maintain consistent hook call order)
  const appMode: AppMode = currentProject ? 'project' : compatMode ? 'no-project-compat' : 'welcome'

  const recentProjectEntries: RecentProjectEntry[] = useMemo(
    () => recentProjects.map((p) => ({ ...p, error: recentProjectErrors[p.path] })),
    [recentProjects, recentProjectErrors]
  )

  const disabledViews: Set<ViewId> =
    !hydrated || appMode === 'welcome'
      ? ALL_VIEWS
      : appMode === 'no-project-compat'
        ? NO_PROJECT_COMPAT_DISABLED
        : EMPTY_DISABLED

  // Reset activeView if the current view becomes disabled (e.g. project close, compat mode)
  useEffect(() => {
    if (disabledViews.has(activeView)) {
      setActiveView('experiments')
    }
  }, [disabledViews, activeView])

  // Must be called unconditionally (no conditional hooks)
  useKeyboardShortcuts({
    onViewChange: handleViewChange,
    onCommandPalette: handleCommandPalette,
    disabledViews,
    onNewProject: handleNewProject,
    onOpenFolder: handleOpenFolder,
    onOpenExisting: handleOpenExisting,
  })

  // Bootstrap gate: show nothing until hydration is complete
  if (!hydrated) {
    return <div className="app-shell" data-testid="app-bootstrap" />
  }

  return (
    <>
      <div className="app-shell">
        <Header
          version={appInfo?.version}
          activeView={activeView}
          onViewChange={handleViewChange}
          runningCount={runningCount}
          alertCount={alertCount}
          onCommandPalette={handleCommandPalette}
          disabledViews={disabledViews}
          projectSwitcher={
            currentProject ? (
              <ProjectSwitcher
                projectName={currentProject.name}
                projectPath={currentProject.path}
                degraded={degraded}
                recentProjects={recentProjectEntries}
                onNewProject={handleNewProject}
                onOpenFolder={handleOpenFolder}
                onOpenExisting={handleOpenExisting}
                onCloseProject={handleCloseProject}
                onSwitchProject={handleOpenRecentProject}
                onRemoveRecentProject={handleRemoveRecentProject}
              />
            ) : undefined
          }
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
      {showWizard && (
        <NewProjectWizard onClose={handleWizardClose} onCreated={handleWizardCreated} />
      )}
      {importState && (
        <ImportDialog
          folderPath={importState.path}
          folderName={importState.name}
          onConfirm={handleImportConfirm}
          onCancel={handleImportCancel}
        />
      )}
    </>
  )
}
