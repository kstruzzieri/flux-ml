import { useEffect } from 'react'
import type { ViewId } from '../components/layout/Header'

const VIEW_SHORTCUTS: Record<string, ViewId> = {
  '1': 'experiments',
  '2': 'compare',
  '3': 'data',
  '4': 'code',
}

interface UseKeyboardShortcutsOptions {
  onViewChange?: (view: ViewId) => void
  onCommandPalette?: () => void
  disabledViews?: Set<ViewId>
  onNewProject?: () => void
  onOpenFolder?: () => void
  onOpenExisting?: () => void
  projectActionsDisabled?: boolean
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

export function useKeyboardShortcuts({
  onViewChange,
  onCommandPalette,
  disabledViews,
  onNewProject,
  onOpenFolder,
  onOpenExisting,
  projectActionsDisabled,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isMod = event.metaKey || event.ctrlKey
      const normalizedKey = event.key.toLowerCase()

      if (!isMod) return

      // Don't fire app shortcuts while typing or when a modal owns the interaction.
      if (isEditableTarget(event.target) || projectActionsDisabled) return

      // View switching: Cmd/Ctrl + 1-4
      if (event.key in VIEW_SHORTCUTS && onViewChange) {
        const view = VIEW_SHORTCUTS[event.key]
        if (disabledViews?.has(view)) return
        event.preventDefault()
        onViewChange(view)
        return
      }

      // Command palette: Cmd/Ctrl + K
      if (event.key === 'k' && onCommandPalette) {
        event.preventDefault()
        onCommandPalette()
        return
      }

      // New project: Cmd/Ctrl + N
      if (normalizedKey === 'n' && !event.shiftKey && onNewProject) {
        event.preventDefault()
        onNewProject()
        return
      }

      // Open folder: Cmd/Ctrl + O
      if (normalizedKey === 'o' && !event.shiftKey && onOpenFolder) {
        event.preventDefault()
        onOpenFolder()
        return
      }

      // Open existing project: Cmd/Ctrl + Shift + O
      if (normalizedKey === 'o' && event.shiftKey && onOpenExisting) {
        event.preventDefault()
        onOpenExisting()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    onViewChange,
    onCommandPalette,
    disabledViews,
    onNewProject,
    onOpenFolder,
    onOpenExisting,
    projectActionsDisabled,
  ])
}
