export function FilesPanel() {
  return (
    <div className="panel panel--files">
      <div className="panel__header">
        <span className="panel__title">Files</span>
      </div>
      <div className="file-breadcrumb">
        <span className="file-breadcrumb__item">~</span>
        <span className="file-breadcrumb__sep">/</span>
        <span className="file-breadcrumb__item file-breadcrumb__item--current">No project</span>
      </div>
      <div className="panel__content">
        <div className="panel__placeholder">Open a project to view files</div>
      </div>
    </div>
  )
}
