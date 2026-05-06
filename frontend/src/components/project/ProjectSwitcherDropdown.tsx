import { useEffect, useRef, useState } from 'react'
import { RecentProjectsList, type RecentProjectEntry } from './RecentProjectsList'

interface ProjectSwitcherDropdownProps {
  anchorRef: React.RefObject<HTMLDivElement | null>
  recentProjects: RecentProjectEntry[]
  currentProjectPath?: string
  onNewProject: () => void
  onOpenFolder: () => void
  onOpenExisting: () => void
  onCloseProject: () => void
  onSwitchProject: (path: string) => void
  onRemoveRecentProject: (path: string) => void
  onClose: () => void
}

export function ProjectSwitcherDropdown({
  anchorRef,
  recentProjects,
  currentProjectPath,
  onNewProject,
  onOpenFolder,
  onOpenExisting,
  onCloseProject,
  onSwitchProject,
  onRemoveRecentProject,
  onClose,
}: ProjectSwitcherDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [focusIndex, setFocusIndex] = useState(-1)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [anchorRef, onClose])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
      if (!items?.length) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = focusIndex < items.length - 1 ? focusIndex + 1 : 0
        setFocusIndex(next)
        items[next].focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = focusIndex > 0 ? focusIndex - 1 : items.length - 1
        setFocusIndex(prev)
        items[prev].focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        setFocusIndex(0)
        items[0].focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        setFocusIndex(items.length - 1)
        items[items.length - 1].focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, focusIndex])

  useEffect(() => {
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    if (items?.length) {
      setFocusIndex(0)
      items[0].focus()
    }
  }, [])

  const filteredRecents = recentProjects.filter((p) => p.path !== currentProjectPath)

  function handleAction(action: () => void) {
    action()
    onClose()
  }

  return (
    <div className="project-dropdown" role="menu" ref={menuRef}>
      <button
        className="project-dropdown__item"
        role="menuitem"
        onClick={() => handleAction(onNewProject)}
      >
        <span>New Project...</span>
        <kbd className="project-dropdown__kbd">⌘N</kbd>
      </button>
      <button
        className="project-dropdown__item"
        role="menuitem"
        onClick={() => handleAction(onOpenFolder)}
      >
        <span>Open Folder...</span>
        <kbd className="project-dropdown__kbd">⌘O</kbd>
      </button>
      <button
        className="project-dropdown__item"
        role="menuitem"
        onClick={() => handleAction(onOpenExisting)}
      >
        <span>Open Existing Project...</span>
        <kbd className="project-dropdown__kbd">⇧⌘O</kbd>
      </button>

      {filteredRecents.length > 0 && (
        <>
          <div className="project-dropdown__divider" role="separator" />
          <div className="project-dropdown__section-header">Recent Projects</div>
          <RecentProjectsList
            projects={filteredRecents}
            onOpen={(path) => handleAction(() => onSwitchProject(path))}
            onRemove={(path) => handleAction(() => onRemoveRecentProject(path))}
            itemRole="menuitem"
          />
        </>
      )}

      <div className="project-dropdown__divider" role="separator" />
      <button
        className="project-dropdown__item project-dropdown__item--danger"
        role="menuitem"
        onClick={() => handleAction(onCloseProject)}
      >
        Close Project
      </button>
    </div>
  )
}
