import { TEMPLATE_LABELS } from './wizardReducer'
import type { TemplateId } from './wizardReducer'

interface WizardStepReviewProps {
  template: TemplateId
  projectName: string
  location: string
  seedDemo: boolean
}

export function WizardStepReview({
  template,
  projectName,
  location,
  seedDemo,
}: WizardStepReviewProps) {
  return (
    <div className="wizard-step">
      <h2 className="wizard-step__heading">Review &amp; Create</h2>
      <dl className="wizard-review">
        <div className="wizard-review__row">
          <dt className="wizard-review__label">Template</dt>
          <dd className="wizard-review__value">{TEMPLATE_LABELS[template]}</dd>
        </div>
        <div className="wizard-review__row">
          <dt className="wizard-review__label">Project Name</dt>
          <dd className="wizard-review__value">{projectName}</dd>
        </div>
        <div className="wizard-review__row">
          <dt className="wizard-review__label">Location</dt>
          <dd className="wizard-review__value wizard-review__value--mono">{location}</dd>
        </div>
        <div className="wizard-review__row">
          <dt className="wizard-review__label">Starter Experiments</dt>
          <dd className="wizard-review__value">{seedDemo ? 'Yes' : 'No'}</dd>
        </div>
      </dl>
    </div>
  )
}
