import { FolderIcon } from '@components/ui/Icon'
import './RecentProjectsList.css'

export interface RecentProjectEntry {
  path: string
  name: string
  error?: string
}

interface RecentProjectsListProps {
  projects: RecentProjectEntry[]
  onOpen: (path: string) => void
  onRemove: (path: string) => void
  excludePaths?: Set<string>
  itemRole?: string
}

function shortenPath(fullPath: string): string {
  return fullPath
    .replace(/^\/Users\/[^/]+/, '~')
    .replace(/^\/home\/[^/]+/, '~')
    .replace(/^[A-Z]:\\Users\\[^\\]+/i, '~')
}

export function RecentProjectsList({
  projects,
  onOpen,
  onRemove,
  excludePaths,
  itemRole,
}: RecentProjectsListProps) {
  const filtered = excludePaths ? projects.filter((p) => !excludePaths.has(p.path)) : projects

  if (filtered.length === 0) {
    return <p className="recent-projects__empty">No recent projects</p>
  }

  return (
    <ul className="recent-projects" role="list">
      {filtered.map((project) => (
        <li key={project.path} className="recent-projects__item">
          {project.error ? (
            <div className="recent-projects__error-row">
              <div className="recent-projects__info">
                <span className="recent-projects__name">{project.name}</span>
                <span className="recent-projects__error-msg">{project.error}</span>
              </div>
              <button
                className="recent-projects__remove-btn"
                onClick={() => onRemove(project.path)}
                aria-label="Remove from list"
                role={itemRole}
              >
                Remove from list
              </button>
            </div>
          ) : (
            <button
              className="recent-projects__row"
              onClick={() => onOpen(project.path)}
              role={itemRole}
            >
              <FolderIcon className="recent-projects__icon icon icon--md" aria-hidden="true" />
              <span className="recent-projects__info">
                <span className="recent-projects__name">{project.name}</span>
                <span className="recent-projects__path">{shortenPath(project.path)}</span>
              </span>
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
