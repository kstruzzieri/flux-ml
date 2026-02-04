import { useState } from 'react'

interface EditorTab {
  id: string
  name: string
  modified: boolean
  extension: string
}

// Placeholder data - will be replaced with actual open files
const MOCK_TABS: EditorTab[] = [
  { id: '1', name: 'reward_model.py', modified: true, extension: 'py' },
  { id: '2', name: 'trainer.py', modified: false, extension: 'py' },
  { id: '3', name: 'config.yaml', modified: false, extension: 'yaml' },
]

// Placeholder code - will be replaced with actual file content
const MOCK_CODE = `import torch
import torch.nn as nn
from transformers import AutoModel

class RewardModel(nn.Module):
    """Reward model for RLHF training."""

    def __init__(self, base_model: str, hidden_size: int = 768):
        super().__init__()
        self.base = AutoModel.from_pretrained(base_model)
        self.head = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Linear(hidden_size // 2, 1)
        )

    def forward(self, input_ids, attention_mask):
        outputs = self.base(input_ids, attention_mask=attention_mask)
        hidden = outputs.last_hidden_state[:, -1, :]  # Last token
        reward = self.head(hidden)
        return reward.squeeze(-1)

    def compute_loss(self, chosen_rewards, rejected_rewards):
        """Bradley-Terry preference loss."""
        return -torch.log(torch.sigmoid(chosen_rewards - rejected_rewards)).mean()`

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// Python devicon (blue/yellow)
function PythonIcon() {
  return (
    <svg viewBox="0 0 128 128" className="editor-tab__icon--python">
      <path
        fill="#3776AB"
        d="M63.391 1.988c-4.222.02-8.252.379-11.8 1.007-10.45 1.846-12.346 5.71-12.346 12.837v9.411h24.693v3.137H29.977c-7.176 0-13.46 4.313-15.426 12.521-2.268 9.405-2.368 15.275 0 25.096 1.755 7.311 5.947 12.519 13.124 12.519h8.491V67.234c0-8.151 7.051-15.34 15.426-15.34h24.665c6.866 0 12.346-5.654 12.346-12.548V15.833c0-6.693-5.646-11.72-12.346-12.837-4.244-.706-8.645-1.027-12.866-1.008zM50.037 9.557c2.55 0 4.634 2.117 4.634 4.721 0 2.593-2.083 4.69-4.634 4.69-2.56 0-4.633-2.097-4.633-4.69-.001-2.604 2.073-4.721 4.633-4.721z"
      />
      <path
        fill="#FFD43B"
        d="M91.682 28.38v10.966c0 8.5-7.208 15.655-15.426 15.655H51.591c-6.756 0-12.346 5.783-12.346 12.549v23.515c0 6.691 5.818 10.628 12.346 12.547 7.816 2.297 15.312 2.713 24.665 0 6.216-1.801 12.346-5.423 12.346-12.547v-9.412H63.938v-3.138h37.012c7.176 0 9.852-5.005 12.348-12.519 2.578-7.735 2.467-15.174 0-25.096-1.774-7.145-5.161-12.521-12.348-12.521h-9.268zM77.809 87.927c2.561 0 4.634 2.097 4.634 4.692 0 2.602-2.074 4.719-4.634 4.719-2.55 0-4.633-2.117-4.633-4.719 0-2.595 2.083-4.692 4.633-4.692z"
      />
    </svg>
  )
}

// YAML devicon (red)
function YamlIcon() {
  return (
    <svg viewBox="0 0 128 128" className="editor-tab__icon--yaml">
      <path
        fill="#cb171e"
        d="M82.43 49.15h-25.27l-5.14 12.41H40.84l23.66-55.8h11.44l22.7 55.8H86.68l-4.25-12.41zm-4.2-11.14l-7.74-20.48-8.64 20.48h16.38zM30 73.09l15.9-18.3L30 36.49h13.72l9.2 10.95 9.13-10.95h13.52L59.6 54.79l16.12 18.3H61.86l-9.4-11.23-9.46 11.23H30zm68-36.6v36.6H85.55V36.49H98zm-12.45 55.8l15.9-18.3-15.9-18.3h13.72l9.2 10.95 9.13-10.95h13.51l-15.97 18.3 16.12 18.3h-13.86l-9.4-11.23-9.45 11.23h-13z"
      />
    </svg>
  )
}

// Markdown devicon (blue)
function MarkdownIcon() {
  return (
    <svg viewBox="0 0 128 128" className="editor-tab__icon--markdown">
      <path
        fill="#519aba"
        d="M11.95 24.35c-5.84 0-10.62 4.87-10.62 10.68v57.94c0 5.81 4.78 10.68 10.62 10.68h104.1c5.84 0 10.62-4.87 10.62-10.68V35.03c0-5.81-4.78-10.68-10.62-10.68H11.95zm-.01 9.54h104.11c.62 0 1.08.42 1.08 1.14v57.94c0 .72-.45 1.14-1.08 1.14H11.95c-.62 0-1.08-.42-1.08-1.14V35.03c0-.72.45-1.14 1.07-1.14z"
      />
      <path
        fill="#519aba"
        d="M20.72 84.1V43.9h11.7l11.7 14.78L55.81 43.9h11.7v40.2h-11.7V61.04l-11.69 14.78-11.7-14.78V84.1H20.72zm73.1 0L76.28 64.59h11.7V43.9h11.7v20.69h11.7L93.82 84.1z"
      />
    </svg>
  )
}

// Generic file icon for unknown extensions
function GenericFileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="editor-tab__icon--generic"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function FileIcon({ extension }: { extension?: string }) {
  switch (extension) {
    case 'py':
      return <PythonIcon />
    case 'yaml':
    case 'yml':
      return <YamlIcon />
    case 'md':
      return <MarkdownIcon />
    default:
      return <GenericFileIcon />
  }
}

export function CodeEditorPanel() {
  const [activeTabId, setActiveTabId] = useState('1')

  const lines = MOCK_CODE.split('\n')

  return (
    <div className="panel panel--code-editor">
      <div className="editor-tabs">
        {MOCK_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`editor-tab ${activeTabId === tab.id ? 'editor-tab--active' : ''}`}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span className="editor-tab__icon">
              <FileIcon extension={tab.extension} />
            </span>
            <span className="editor-tab__name">
              {tab.name}
              {tab.modified && <span className="editor-tab__modified" />}
            </span>
            <span className="editor-tab__close">
              <CloseIcon />
            </span>
          </button>
        ))}
      </div>
      <div className="editor-content">
        <div className="editor-gutter">
          {lines.map((_, i) => (
            <span key={i} className="editor-gutter__line">
              {i + 1}
            </span>
          ))}
        </div>
        <pre className="editor-code">
          <code>{MOCK_CODE}</code>
        </pre>
      </div>
    </div>
  )
}
