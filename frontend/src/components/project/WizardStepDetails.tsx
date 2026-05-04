interface WizardStepDetailsProps {
  projectName: string
  projectsDir: string
  location: string
  seedDemo: boolean
  onNameChange: (name: string) => void
  onProjectsDirChange: (dir: string) => void
  onIncludeStarterChange: (include: boolean) => void
  onBrowseLocation: () => void
}

export function WizardStepDetails({
  projectName,
  projectsDir,
  location,
  seedDemo,
  onNameChange,
  onProjectsDirChange,
  onIncludeStarterChange,
  onBrowseLocation,
}: WizardStepDetailsProps) {
  return (
    <div className="wizard-step">
      <h2 className="wizard-step__heading">Project details</h2>

      <div className="wizard-field">
        <label htmlFor="wizard-name" className="wizard-field__label">
          Project Name
        </label>
        <input
          id="wizard-name"
          type="text"
          className="input"
          value={projectName}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus
        />
      </div>

      <div className="wizard-field">
        <label htmlFor="wizard-location" className="wizard-field__label">
          Projects Folder
        </label>
        <div className="wizard-field__row">
          <input
            id="wizard-location"
            type="text"
            className="input"
            value={projectsDir}
            onChange={(e) => onProjectsDirChange(e.target.value)}
          />
          <button
            className="button button--secondary button--md"
            onClick={onBrowseLocation}
            type="button"
          >
            Browse...
          </button>
        </div>
        {location && (
          <div className="wizard-field__hint">
            Project path: <code>{location}</code>
          </div>
        )}
      </div>

      <div className="wizard-field wizard-field--toggle">
        <label className="wizard-toggle">
          <input
            type="checkbox"
            checked={seedDemo}
            onChange={(e) => onIncludeStarterChange(e.target.checked)}
            aria-label="Add demo experiments to Flux"
          />
          <span className="wizard-toggle__label">Add demo experiments to Flux</span>
          <span className="wizard-toggle__desc">
            Seeds Flux's local database with sample runs for this project.
          </span>
        </label>
      </div>
    </div>
  )
}
