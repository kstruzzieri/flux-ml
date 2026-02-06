import { useState } from 'react'
import { CloseIcon, FileIcon } from '../../ui/Icon'

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
