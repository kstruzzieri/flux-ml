interface WizardStepDetailsProps {
  projectName: string
  location: string
  seedDemo: boolean
  onNameChange: (name: string) => void
  onLocationChange: (location: string, manual: boolean) => void
  onIncludeStarterChange: (include: boolean) => void
  onBrowseLocation: () => void
}

export function WizardStepDetails({
  projectName,
  location,
  seedDemo,
  onNameChange,
  onLocationChange,
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
          Location
        </label>
        <div className="wizard-field__row">
          <input
            id="wizard-location"
            type="text"
            className="input"
            value={location}
            onChange={(e) => onLocationChange(e.target.value, true)}
          />
          <button
            className="button button--secondary button--md"
            onClick={onBrowseLocation}
            type="button"
          >
            Browse...
          </button>
        </div>
      </div>

      <div className="wizard-field wizard-field--toggle">
        <label className="wizard-toggle">
          <input
            type="checkbox"
            checked={seedDemo}
            onChange={(e) => onIncludeStarterChange(e.target.checked)}
            aria-label="Include starter experiments"
          />
          <span className="wizard-toggle__label">Include starter experiments</span>
          <span className="wizard-toggle__desc">
            Populates charts with sample training runs matching your project type.
          </span>
        </label>
      </div>
    </div>
  )
}
