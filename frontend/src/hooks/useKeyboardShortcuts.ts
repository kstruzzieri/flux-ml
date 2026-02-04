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
}

export function useKeyboardShortcuts({
  onViewChange,
  onCommandPalette,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isMod = event.metaKey || event.ctrlKey

      if (!isMod) return

      // View switching: Cmd/Ctrl + 1-4
      if (event.key in VIEW_SHORTCUTS && onViewChange) {
        event.preventDefault()
        onViewChange(VIEW_SHORTCUTS[event.key])
        return
      }

      // Command palette: Cmd/Ctrl + K
      if (event.key === 'k' && onCommandPalette) {
        event.preventDefault()
        onCommandPalette()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onViewChange, onCommandPalette])
}
