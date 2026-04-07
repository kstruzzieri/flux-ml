export interface RecentProjectEntry {
  path: string
  name: string
  error?: string
}

interface RecentProjectsListProps {
  projects: RecentProjectEntry[]
  onOpen: (path: string) => void
  onRemove: (path: string) => void
}

function shortenPath(fullPath: string): string {
  return fullPath
    .replace(/^\/Users\/[^/]+/, '~')
    .replace(/^\/home\/[^/]+/, '~')
    .replace(/^C:\\Users\\[^\\]+/, '~')
}

export function RecentProjectsList({ projects, onOpen }: RecentProjectsListProps) {
  if (projects.length === 0) {
    return <p className="recent-projects__empty">No recent projects</p>
  }

  return (
    <ul className="recent-projects">
      {projects.map((project) => (
        <li key={project.path} className="recent-projects__item">
          <button className="recent-projects__row" onClick={() => onOpen(project.path)}>
            <span className="recent-projects__name">{project.name}</span>
            <span className="recent-projects__path">{shortenPath(project.path)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
