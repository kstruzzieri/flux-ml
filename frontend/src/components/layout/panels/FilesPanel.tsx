import { useProjectStore } from '@stores'

function basenameFromPath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || path
}

export function FilesPanel() {
  const currentProject = useProjectStore((s) => s.currentProject)
  const degraded = useProjectStore((s) => s.degraded)
  const configError = useProjectStore((s) => s.configError)
  const warnings = useProjectStore((s) => s.warnings)

  const pathLabel = currentProject ? basenameFromPath(currentProject.path) : 'No project'

  return (
    <div className="panel panel--files">
      <div className="panel__header">
        <span className="panel__title">Files</span>
        {currentProject && (
          <span className="panel__badge">{degraded ? 'Degraded' : currentProject.name}</span>
        )}
      </div>
      <div className="file-breadcrumb">
        <span className="file-breadcrumb__item">~</span>
        <span className="file-breadcrumb__sep">/</span>
        <span
          className="file-breadcrumb__item file-breadcrumb__item--current"
          title={currentProject?.path}
        >
          {pathLabel}
        </span>
      </div>
      <div className="panel__content">
        {!currentProject ? (
          <div className="panel__placeholder">Open a project to view files</div>
        ) : (
          <div className="files-panel__status">
            <div className="files-panel__header">
              <span className="files-panel__name">{currentProject.name}</span>
              <span className="files-panel__path">{currentProject.path}</span>
            </div>
            {degraded && configError && (
              <div className="files-panel__warning" role="alert">
                Opened in degraded mode: {configError}
              </div>
            )}
            {warnings.length > 0 && (
              <ul className="files-panel__warnings">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            <div className="files-panel__hint">
              File browser is not available yet for this project.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
