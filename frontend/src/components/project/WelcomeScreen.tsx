import { RecentProjectsList, type RecentProjectEntry } from './RecentProjectsList'
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
        {/* Left Column — Branding + Actions */}
        <div className="welcome__left">
          <div className="welcome__branding">
            <span className="welcome__logo-text">Flux</span>
            <span className="welcome__tagline">The ML development environment</span>
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
        </div>

        {/* Right Column — Recent Projects */}
        <div className="welcome__right">
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
