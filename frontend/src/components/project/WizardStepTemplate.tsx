import type { TemplateId } from './wizardReducer'

interface TemplateOption {
  id: TemplateId
  name: string
  description: string
  available: true
}

interface TemplateComingSoon {
  id: string
  name: string
  description: string
  available: false
}

type TemplateCard = TemplateOption | TemplateComingSoon

const TEMPLATES: TemplateCard[] = [
  {
    id: 'reward-model',
    name: 'Reward Model',
    description: 'PPO/DPO training loop, reward components, evaluation scripts',
    available: true,
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Empty project with src/, configs/, data/',
    available: true,
  },
  {
    id: 'classification',
    name: 'Classification',
    description: 'Image and text labeling pipelines',
    available: false,
  },
  {
    id: 'fine-tuning',
    name: 'Fine-tuning (SFT)',
    description: 'Supervised SFT training workflows',
    available: false,
  },
]

interface WizardStepTemplateProps {
  selectedTemplate: TemplateId | null
  onSelectTemplate: (template: TemplateId) => void
}

export function WizardStepTemplate({
  selectedTemplate,
  onSelectTemplate,
}: WizardStepTemplateProps) {
  return (
    <div className="wizard-step">
      <h2 className="wizard-step__heading">What kind of project?</h2>
      <div className="wizard-templates">
        {TEMPLATES.map((tmpl) => {
          if (!tmpl.available) {
            return (
              <div key={tmpl.id} className="wizard-template wizard-template--disabled">
                <span className="wizard-template__name">{tmpl.name}</span>
                <span className="wizard-template__desc">{tmpl.description}</span>
                <span className="wizard-template__badge">Coming soon</span>
              </div>
            )
          }
          const isSelected = selectedTemplate === tmpl.id
          return (
            <button
              key={tmpl.id}
              className={`wizard-template ${isSelected ? 'wizard-template--selected' : ''}`}
              onClick={() => onSelectTemplate(tmpl.id)}
              aria-pressed={isSelected}
            >
              <span className="wizard-template__name">{tmpl.name}</span>
              <span className="wizard-template__desc">{tmpl.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
