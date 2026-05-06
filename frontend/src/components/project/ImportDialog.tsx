import { useState } from 'react'
import './ImportDialog.css'

interface ImportDialogProps {
  folderPath: string
  folderName: string
  onConfirm: (name: string, seedDemo: boolean) => void
  onCancel: () => void
  error?: string | null
  submitting?: boolean
}

export function ImportDialog({
  folderPath,
  folderName,
  onConfirm,
  onCancel,
  error = null,
  submitting = false,
}: ImportDialogProps) {
  const [name, setName] = useState(folderName)
  const [seedDemo, setSeedDemo] = useState(false)

  return (
    <div className="import-overlay">
      <div
        className="import-overlay__backdrop"
        onClick={() => {
          if (!submitting) onCancel()
        }}
      />
      <div className="import-dialog" role="dialog" aria-modal="true" aria-label="Import folder">
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
            disabled={submitting}
          />
        </div>

        <label className="import-dialog__toggle">
          <input
            type="checkbox"
            checked={seedDemo}
            onChange={(e) => setSeedDemo(e.target.checked)}
            aria-label="Add demo experiments to Flux"
            disabled={submitting}
          />
          <span>Add demo experiments to Flux</span>
        </label>

        {error && (
          <div className="import-dialog__error" role="alert">
            {error}
          </div>
        )}

        <div className="import-dialog__actions">
          <button
            className="button button--secondary button--md"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="button button--primary button--md"
            onClick={() => onConfirm(name.trim(), seedDemo)}
            disabled={!name.trim() || submitting}
          >
            {submitting ? 'Creating...' : 'Create & Open'}
          </button>
        </div>
      </div>
    </div>
  )
}
