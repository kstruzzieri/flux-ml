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
import { useExperimentStore } from '../../stores/experimentStore'
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

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  if (err == null) return fallback
  return String(err)
}

function clearPaths(
  errors: Record<string, string>,
  paths: Array<string | undefined>
): Record<string, string> {
  const next = { ...errors }
  let changed = false
  for (const path of paths) {
    if (path && next[path]) {
      delete next[path]
      changed = true
    }
  }
  return changed ? next : errors
}

export function AppShell() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [activeView, setActiveView] = useState<ViewId>('experiments')
  const [compatMode, setCompatMode] = useState(false)
  const layout = useLayoutPersistence()

  const currentProject = useProjectStore((s) => s.currentProject)
  const hydrated = useProjectStore((s) => s.hydrated)
  const initialize = useProjectStore((s) => s.initialize)
  const recentProjects = useProjectStore((s) => s.recentProjects)
  const fetchStatus = useProjectStore((s) => s.fetchStatus)
  const fetchRecentProjects = useProjectStore((s) => s.fetchRecentProjects)
  const degraded = useProjectStore((s) => s.degraded)
  const closeProject = useProjectStore((s) => s.closeProject)
  const fetchExperiments = useExperimentStore((s) => s.fetchExperiments)

  const [recentProjectErrors, setRecentProjectErrors] = useState<Record<string, string>>({})
  const [showWizard, setShowWizard] = useState(false)
  const [importState, setImportState] = useState<{ path: string; name: string } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSubmitting, setImportSubmitting] = useState(false)
  const [shellError, setShellError] = useState<string | null>(null)

  // TODO: These will be driven by actual experiment state
  const [runningCount] = useState(0)
  const [alertCount] = useState(0)
  const hasOpenModal = showWizard || importState !== null

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

  const refreshWorkspaceData = useCallback(async () => {
    await Promise.all([fetchStatus(), fetchRecentProjects(), fetchExperiments()])
  }, [fetchStatus, fetchRecentProjects, fetchExperiments])

  const handleNewProject = useCallback(() => {
    if (hasOpenModal) return
    setShellError(null)
    setShowWizard(true)
  }, [hasOpenModal])

  const handleWizardClose = useCallback(() => {
    setShowWizard(false)
  }, [])

  const handleWizardCreated = useCallback(() => {
    setShellError(null)
    setShowWizard(false)
    void refreshWorkspaceData()
  }, [refreshWorkspaceData])

  const handleOpenFolder = useCallback(async () => {
    if (hasOpenModal) return
    setShellError(null)
    try {
      const dir = await OpenFolderDialog()
      if (!dir) return

      const isFlux = await IsFluxProject(dir)
      if (isFlux) {
        const proj = await OpenProject(dir)
        setShellError(null)
        setRecentProjectErrors((prev) => clearPaths(prev, [dir, proj.path]))
        await refreshWorkspaceData()
      } else {
        const basename = dir.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'project'
        setImportError(null)
        setImportSubmitting(false)
        setImportState({ path: dir, name: basename })
      }
    } catch (err) {
      setShellError(getErrorMessage(err, 'Failed to open folder.'))
      console.error('Open folder failed:', err)
    }
  }, [hasOpenModal, refreshWorkspaceData])

  const handleOpenExisting = useCallback(async () => {
    if (hasOpenModal) return
    setShellError(null)
    try {
      const dir = await OpenFolderDialog()
      if (!dir) return

      const isFlux = await IsFluxProject(dir)
      if (isFlux) {
        const proj = await OpenProject(dir)
        setShellError(null)
        setRecentProjectErrors((prev) => clearPaths(prev, [dir, proj.path]))
        await refreshWorkspaceData()
      } else {
        setShellError(
          'No flux.yaml found in this directory. Use "Open Folder" to import a directory as a new project.'
        )
      }
    } catch (err) {
      setShellError(getErrorMessage(err, 'Failed to open existing project.'))
      console.error('Open existing failed:', err)
    }
  }, [hasOpenModal, refreshWorkspaceData])

  const handleImportConfirm = useCallback(
    async (name: string, seedDemo: boolean) => {
      if (!importState || importSubmitting) return
      setImportSubmitting(true)
      setImportError(null)
      try {
        const proj = await OpenFolderAsProject(importState.path, name, seedDemo)
        setShellError(null)
        setRecentProjectErrors((prev) => clearPaths(prev, [importState.path, proj.path]))
        await refreshWorkspaceData()
        setImportSubmitting(false)
        setImportError(null)
        setImportState(null)
      } catch (err) {
        setImportSubmitting(false)
        setImportError(getErrorMessage(err, 'Failed to import folder.'))
        console.error('Import failed:', err)
      }
    },
    [importState, importSubmitting, refreshWorkspaceData]
  )

  const handleImportCancel = useCallback(() => {
    if (importSubmitting) return
    setImportError(null)
    setImportState(null)
  }, [importSubmitting])

  const handleOpenRecentProject = useCallback(
    async (path: string) => {
      try {
        const proj = await OpenProject(path)
        setRecentProjectErrors((prev) => clearPaths(prev, [path, proj.path]))
        await refreshWorkspaceData()
      } catch (err) {
        setRecentProjectErrors((prev) => ({
          ...prev,
          [path]: err instanceof Error ? err.message : String(err),
        }))
      }
    },
    [refreshWorkspaceData]
  )

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
    projectActionsDisabled: hasOpenModal,
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
      {shellError && (
        <div className="app-shell__notice app-shell__notice--error" role="alert">
          <span className="app-shell__notice-message">{shellError}</span>
          <button
            type="button"
            className="app-shell__notice-dismiss"
            onClick={() => setShellError(null)}
            aria-label="Dismiss message"
          >
            Dismiss
          </button>
        </div>
      )}
      {showWizard && (
        <NewProjectWizard onClose={handleWizardClose} onCreated={handleWizardCreated} />
      )}
      {importState && (
        <ImportDialog
          folderPath={importState.path}
          folderName={importState.name}
          onConfirm={handleImportConfirm}
          onCancel={handleImportCancel}
          error={importError}
          submitting={importSubmitting}
        />
      )}
    </>
  )
}
