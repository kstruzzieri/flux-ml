import { RecentProjectsList, type RecentProjectEntry } from './RecentProjectsList'
import logoDark from '../../../../assets/branding/logo-dark.svg'
import './WelcomeScreen.css'

interface WelcomeScreenProps {
  recentProjects: RecentProjectEntry[]
  onNewProject: () => void
  onOpenFolder: () => void
  onOpenExisting: () => void
  onBrowseExperiments: () => void
  onOpenRecentProject: (path: string) => void
  onRemoveRecentProject: (path: string) => void
}

export function WelcomeScreen({
  recentProjects,
  onNewProject,
  onOpenFolder,
  onOpenExisting,
  onBrowseExperiments,
  onOpenRecentProject,
  onRemoveRecentProject,
}: WelcomeScreenProps) {
  return (
    <div className="welcome" data-testid="welcome-screen">
      <div className="welcome__container">
        <div className="welcome__brand">
          <img className="welcome__logo" src={logoDark} alt="Flux" />
          <p className="welcome__subcopy">Write code. Watch it learn.</p>
        </div>

        <div className="welcome__actions">
          <button className="welcome__action-btn" onClick={onNewProject}>
            <span className="welcome__action-label">New Project...</span>
            <kbd className="welcome__kbd">⌘N</kbd>
          </button>
          <button className="welcome__action-btn" onClick={onOpenFolder}>
            <span className="welcome__action-label">Open Folder...</span>
            <kbd className="welcome__kbd">⌘O</kbd>
          </button>
          <button className="welcome__action-btn" onClick={onOpenExisting}>
            <span className="welcome__action-label">Open Existing Project...</span>
            <kbd className="welcome__kbd">⇧⌘O</kbd>
          </button>
        </div>

        <button className="welcome__compat-link" onClick={onBrowseExperiments}>
          Browse Existing Experiments
        </button>

        <div className="welcome__recent">
          <h2 className="welcome__section-header">Recent Projects</h2>
          <RecentProjectsList
            projects={recentProjects}
            onOpen={onOpenRecentProject}
            onRemove={onRemoveRecentProject}
          />
        </div>
      </div>
    </div>
  )
}
