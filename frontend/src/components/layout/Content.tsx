import { ViewId } from './Header'
import { ExperimentsView, CompareView, DataView, CodeView } from '../views'
import { LayoutPersistence } from '../../hooks/useLayoutPersistence'
import {
  WelcomeScreen,
  DegradedModeBanner,
  NoProjectBanner,
  type RecentProjectEntry,
} from '../project'
import { useProjectStore } from '../../stores/projectStore'

export type AppMode = 'welcome' | 'project' | 'no-project-compat'

interface ContentProps {
  activeView: ViewId
  layout: LayoutPersistence
  appMode?: AppMode
  recentProjects?: RecentProjectEntry[]
  onNewProject?: () => void
  onOpenFolder?: () => void
  onOpenExisting?: () => void
  onBrowseExperiments?: () => void
  onOpenRecentProject?: (path: string) => void
  onRemoveRecentProject?: (path: string) => void
}

export function Content({
  activeView,
  layout,
  appMode,
  recentProjects = [],
  onNewProject = () => {},
  onOpenFolder = () => {},
  onOpenExisting = () => {},
  onBrowseExperiments = () => {},
  onOpenRecentProject = () => {},
  onRemoveRecentProject = () => {},
}: ContentProps) {
  const degraded = useProjectStore((s) => s.degraded)

  if (appMode === 'welcome') {
    return (
      <WelcomeScreen
        recentProjects={recentProjects}
        onNewProject={onNewProject}
        onOpenFolder={onOpenFolder}
        onOpenExisting={onOpenExisting}
        onBrowseExperiments={onBrowseExperiments}
        onOpenRecentProject={onOpenRecentProject}
        onRemoveRecentProject={onRemoveRecentProject}
      />
    )
  }

  let viewContent: React.ReactNode
  switch (activeView) {
    case 'experiments':
      viewContent = <ExperimentsView layout={layout} />
      break
    case 'compare':
      viewContent = <CompareView layout={layout} />
      break
    case 'data':
      viewContent = <DataView layout={layout} />
      break
    case 'code':
      viewContent = <CodeView layout={layout} />
      break
    default:
      viewContent = <ExperimentsView layout={layout} />
  }

  return (
    <>
      {degraded && appMode === 'project' && <DegradedModeBanner />}
      {appMode === 'no-project-compat' && <NoProjectBanner onOpenProject={onOpenExisting} />}
      {viewContent}
    </>
  )
}
