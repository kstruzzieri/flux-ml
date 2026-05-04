import './NoProjectBanner.css'

interface NoProjectBannerProps {
  onOpenProject: () => void
}

export function NoProjectBanner({ onOpenProject }: NoProjectBannerProps) {
  return (
    <div className="no-project-banner" role="status">
      <span className="no-project-banner__message">
        Browsing experiments without a project. Some views are disabled.
      </span>
      <button className="no-project-banner__action" onClick={onOpenProject}>
        Open a project
      </button>
    </div>
  )
}
