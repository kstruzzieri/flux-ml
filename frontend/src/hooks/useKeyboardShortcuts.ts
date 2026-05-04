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
}

export function useKeyboardShortcuts({
  onViewChange,
  onCommandPalette,
  disabledViews,
  onNewProject,
  onOpenFolder,
  onOpenExisting,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isMod = event.metaKey || event.ctrlKey

      if (!isMod) return

      // Don't fire project shortcuts (N, O) when typing in form fields
      if (event.key === 'n' || event.key === 'o') {
        const target = event.target as HTMLElement
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return
        }
      }

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
      if (event.key === 'n' && !event.shiftKey && onNewProject) {
        event.preventDefault()
        onNewProject()
        return
      }

      // Open folder: Cmd/Ctrl + O
      if (event.key === 'o' && !event.shiftKey && onOpenFolder) {
        event.preventDefault()
        onOpenFolder()
        return
      }

      // Open existing project: Cmd/Ctrl + Shift + O
      if (event.key === 'O' && event.shiftKey && onOpenExisting) {
        event.preventDefault()
        onOpenExisting()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onViewChange, onCommandPalette, disabledViews, onNewProject, onOpenFolder, onOpenExisting])
}
