import { useState } from 'react'
import './ImportDialog.css'

interface ImportDialogProps {
  folderPath: string
  folderName: string
  onConfirm: (name: string, seedDemo: boolean) => void
  onCancel: () => void
}

export function ImportDialog({ folderPath, folderName, onConfirm, onCancel }: ImportDialogProps) {
  const [name, setName] = useState(folderName)
  const [seedDemo, setSeedDemo] = useState(false)

  return (
    <div className="import-overlay">
      <div className="import-overlay__backdrop" onClick={onCancel} />
      <div className="import-dialog" role="dialog" aria-label="Import folder">
        <p className="import-dialog__message">
          <code>{folderPath}</code> doesn't have a <code>flux.yaml</code>. Flux will create one.
        </p>

        <div className="import-dialog__field">
          <label htmlFor="import-name" className="import-dialog__label">
            Project Name
          </label>
          <input
            id="import-name"
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <label className="import-dialog__toggle">
          <input
            type="checkbox"
            checked={seedDemo}
            onChange={(e) => setSeedDemo(e.target.checked)}
            aria-label="Include starter experiments"
          />
          <span>Include starter experiments</span>
        </label>

        <div className="import-dialog__actions">
          <button className="button button--secondary button--md" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="button button--primary button--md"
            onClick={() => onConfirm(name, seedDemo)}
            disabled={!name.trim()}
          >
            Create &amp; Open
          </button>
        </div>
      </div>
    </div>
  )
}
