import { TEMPLATE_LABELS } from './wizardReducer'
import type { TemplateId } from './wizardReducer'

interface WizardSummaryRailProps {
  template: TemplateId | null
  projectName: string
  location: string
  seedDemo: boolean
}

export function WizardSummaryRail({
  template,
  projectName,
  location,
  seedDemo,
}: WizardSummaryRailProps) {
  return (
    <aside className="wizard-rail" aria-label="Project summary">
      <h3 className="wizard-rail__title">Summary</h3>
      <div className="wizard-rail__item">
        <span className="wizard-rail__label">Template</span>
        <span className="wizard-rail__value">{template ? TEMPLATE_LABELS[template] : '—'}</span>
      </div>
      {projectName && (
        <div className="wizard-rail__item">
          <span className="wizard-rail__label">Name</span>
          <span className="wizard-rail__value">{projectName}</span>
        </div>
      )}
      {location && (
        <div className="wizard-rail__item">
          <span className="wizard-rail__label">Path</span>
          <span className="wizard-rail__value wizard-rail__value--mono">{location}</span>
        </div>
      )}
      <div className="wizard-rail__item">
        <span className="wizard-rail__label">Starter data</span>
        <span className="wizard-rail__value">{seedDemo ? 'Yes' : 'No'}</span>
      </div>
    </aside>
  )
}
