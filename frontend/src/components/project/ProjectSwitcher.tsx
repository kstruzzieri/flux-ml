import { useState, useCallback, useRef } from 'react'
import { ProjectSwitcherDropdown } from './ProjectSwitcherDropdown'
import type { RecentProjectEntry } from './RecentProjectsList'
import './ProjectSwitcher.css'

interface ProjectSwitcherProps {
  projectName: string
  projectPath?: string
  degraded: boolean
  recentProjects: RecentProjectEntry[]
  onNewProject: () => void
  onOpenFolder: () => void
  onOpenExisting: () => void
  onCloseProject: () => void
  onSwitchProject: (path: string) => void
  onRemoveRecentProject: (path: string) => void
}

export function ProjectSwitcher({
  projectName,
  projectPath,
  degraded,
  recentProjects,
  onNewProject,
  onOpenFolder,
  onOpenExisting,
  onCloseProject,
  onSwitchProject,
  onRemoveRecentProject,
}: ProjectSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <div className="project-switcher" ref={containerRef}>
      <button
        className="project-switcher__pill"
        onClick={handleToggle}
        aria-label="Project menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span
          className={`project-switcher__dot ${degraded ? 'project-switcher__dot--degraded' : 'project-switcher__dot--healthy'}`}
          data-testid="project-status-dot"
        />
        <span className="project-switcher__name">{projectName}</span>
        <span className="project-switcher__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <ProjectSwitcherDropdown
          anchorRef={containerRef}
          recentProjects={recentProjects}
          currentProjectPath={projectPath}
          onNewProject={onNewProject}
          onOpenFolder={onOpenFolder}
          onOpenExisting={onOpenExisting}
          onCloseProject={onCloseProject}
          onSwitchProject={onSwitchProject}
          onRemoveRecentProject={onRemoveRecentProject}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
