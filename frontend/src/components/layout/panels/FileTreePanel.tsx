import { useState } from 'react'
import {
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  FilePlusIcon,
  FolderPlusIcon,
  FileIcon,
} from '../../ui/Icon'

interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  children?: FileNode[]
  extension?: string
}

// Placeholder data - will be replaced with actual data from filesystem
const MOCK_FILE_TREE: FileNode[] = [
  {
    id: '1',
    name: 'src',
    type: 'folder',
    children: [
      {
        id: '2',
        name: 'models',
        type: 'folder',
        children: [
          { id: '3', name: 'reward_model.py', type: 'file', extension: 'py' },
          { id: '4', name: 'base_model.py', type: 'file', extension: 'py' },
        ],
      },
      {
        id: '5',
        name: 'training',
        type: 'folder',
        children: [
          { id: '6', name: 'trainer.py', type: 'file', extension: 'py' },
          { id: '7', name: 'config.yaml', type: 'file', extension: 'yaml' },
        ],
      },
      { id: '8', name: 'main.py', type: 'file', extension: 'py' },
    ],
  },
  { id: '9', name: 'requirements.txt', type: 'file', extension: 'txt' },
  { id: '10', name: 'README.md', type: 'file', extension: 'md' },
]

interface FileTreeItemProps {
  node: FileNode
  depth: number
  selectedId: string | null
  expandedIds: Set<string>
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}

function FileTreeItem({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
}: FileTreeItemProps) {
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id

  const handleClick = () => {
    if (node.type === 'folder') {
      onToggle(node.id)
    }
    onSelect(node.id)
  }

  return (
    <>
      <button
        className={`file-tree-item ${isSelected ? 'file-tree-item--selected' : ''}`}
        onClick={handleClick}
      >
        {/* Indent guides - one vertical line per depth level */}
        {Array.from({ length: depth }, (_, i) => (
          <span
            key={i}
            className="file-tree-item__indent-guide"
            style={{ left: `${28 + i * 20}px` }}
          />
        ))}
        <span className="file-tree-item__indent" style={{ width: `${12 + depth * 20}px` }} />
        {node.type === 'folder' ? (
          <span
            className={`file-tree-item__chevron ${isExpanded ? 'file-tree-item__chevron--open' : ''}`}
          >
            <ChevronRightIcon />
          </span>
        ) : (
          <span className="file-tree-item__chevron-spacer" />
        )}
        <span className="file-tree-item__icon">
          {node.type === 'folder' ? (
            isExpanded ? (
              <FolderOpenIcon />
            ) : (
              <FolderIcon />
            )
          ) : (
            <FileIcon extension={node.extension} />
          )}
        </span>
        <span className="file-tree-item__name">{node.name}</span>
      </button>
      {node.type === 'folder' && isExpanded && node.children && (
        <>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </>
      )}
    </>
  )
}

export function FileTreePanel() {
  const [selectedId, setSelectedId] = useState<string | null>('3')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['1', '2']))

  const toggleFolder = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="panel panel--file-tree">
      <div className="panel__header">
        <span className="panel__title">Explorer</span>
        <div className="panel__actions">
          <button className="panel__action" title="New File">
            <FilePlusIcon />
          </button>
          <button className="panel__action" title="New Folder">
            <FolderPlusIcon />
          </button>
        </div>
      </div>
      <div className="panel__content file-tree">
        {MOCK_FILE_TREE.map((node) => (
          <FileTreeItem
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onSelect={setSelectedId}
            onToggle={toggleFolder}
          />
        ))}
      </div>
    </div>
  )
}
