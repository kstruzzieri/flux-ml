import { ViewId } from './Header'
import { ExperimentsView, CompareView, DataView, CodeView } from '../views'
import { LayoutPersistence } from '../../hooks/useLayoutPersistence'
import { WelcomeScreen, type RecentProjectEntry } from '../project'

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

  switch (activeView) {
    case 'experiments':
      return <ExperimentsView layout={layout} />
    case 'compare':
      return <CompareView layout={layout} />
    case 'data':
      return <DataView layout={layout} />
    case 'code':
      return <CodeView layout={layout} />
    default:
      return <ExperimentsView layout={layout} />
  }
}
