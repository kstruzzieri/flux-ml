import { render, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CloseIcon,
  AlertTriangleIcon,
  SettingsIcon,
  BarChartIcon,
  ColumnsIcon,
  DatabaseIcon,
  CodeIcon,
  FilePlusIcon,
  FolderPlusIcon,
  PythonIcon,
  YamlIcon,
  MarkdownIcon,
  TextFileIcon,
  GenericFileIcon,
  FolderIcon,
  FolderOpenIcon,
  FileIcon,
} from '../../components/ui/Icon'

describe('Icon', () => {
  describe('lucide-react UI icons', () => {
    it('renders all UI icons as SVG elements', () => {
      const uiIcons = [
        { Component: ChevronLeftIcon, name: 'chevron-left' },
        { Component: ChevronRightIcon, name: 'chevron-right' },
        { Component: ChevronUpIcon, name: 'chevron-up' },
        { Component: ChevronDownIcon, name: 'chevron-down' },
        { Component: CloseIcon, name: 'close' },
        { Component: AlertTriangleIcon, name: 'alert-triangle' },
        { Component: SettingsIcon, name: 'settings' },
        { Component: BarChartIcon, name: 'bar-chart' },
        { Component: ColumnsIcon, name: 'columns' },
        { Component: DatabaseIcon, name: 'database' },
        { Component: CodeIcon, name: 'code' },
        { Component: FilePlusIcon, name: 'file-plus' },
        { Component: FolderPlusIcon, name: 'folder-plus' },
      ]

      uiIcons.forEach(({ Component, name }) => {
        const { unmount } = render(<Component data-testid={`icon-${name}`} />)
        const el = screen.getByTestId(`icon-${name}`)
        expect(el).toBeInTheDocument()
        expect(el.tagName.toLowerCase()).toBe('svg')
        unmount()
      })
    })

    it('accepts size prop', () => {
      render(<ChevronRightIcon size={16} data-testid="icon" />)
      const svg = screen.getByTestId('icon')
      expect(svg).toHaveAttribute('width', '16')
      expect(svg).toHaveAttribute('height', '16')
    })

    it('accepts className prop', () => {
      render(<ChevronRightIcon className="custom-class" data-testid="icon" />)
      expect(screen.getByTestId('icon')).toHaveClass('custom-class')
    })

    it('defaults color to currentColor', () => {
      render(<ChevronRightIcon data-testid="icon" />)
      expect(screen.getByTestId('icon')).toHaveAttribute('stroke', 'currentColor')
    })
  })

  describe('devicons-react file type icons', () => {
    it('renders language icons as SVG elements', () => {
      const fileIcons = [
        { Component: PythonIcon, name: 'python' },
        { Component: YamlIcon, name: 'yaml' },
        { Component: MarkdownIcon, name: 'markdown' },
      ]

      fileIcons.forEach(({ Component }) => {
        const { container, unmount } = render(<Component size={18} />)
        const svg = container.querySelector('svg')
        expect(svg).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('custom icons', () => {
    it('renders custom file icons as SVG elements', () => {
      const customIcons = [
        { Component: TextFileIcon, name: 'text-file' },
        { Component: GenericFileIcon, name: 'generic-file' },
        { Component: FolderIcon, name: 'folder' },
        { Component: FolderOpenIcon, name: 'folder-open' },
      ]

      customIcons.forEach(({ Component, name }) => {
        const { unmount } = render(<Component data-testid={`icon-${name}`} />)
        const el = screen.getByTestId(`icon-${name}`)
        expect(el).toBeInTheDocument()
        expect(el.tagName.toLowerCase()).toBe('svg')
        unmount()
      })
    })

    it('folder icon has folder class', () => {
      render(<FolderIcon data-testid="icon" />)
      expect(screen.getByTestId('icon')).toHaveClass('icon--folder')
    })

    it('folder open icon has folder-open class', () => {
      render(<FolderOpenIcon data-testid="icon" />)
      expect(screen.getByTestId('icon')).toHaveClass('icon--folder-open')
    })
  })

  describe('FileIcon extension mapping', () => {
    it('selects correct icon by extension', () => {
      const { rerender } = render(<FileIcon extension="py" data-testid="file-icon" />)
      expect(screen.getByTestId('file-icon')).toHaveClass('icon--python')

      rerender(<FileIcon extension="yaml" data-testid="file-icon" />)
      expect(screen.getByTestId('file-icon')).toHaveClass('icon--yaml')

      rerender(<FileIcon extension="yml" data-testid="file-icon" />)
      expect(screen.getByTestId('file-icon')).toHaveClass('icon--yaml')

      rerender(<FileIcon extension="md" data-testid="file-icon" />)
      expect(screen.getByTestId('file-icon')).toHaveClass('icon--markdown')

      rerender(<FileIcon extension="txt" data-testid="file-icon" />)
      expect(screen.getByTestId('file-icon')).toHaveClass('icon--text-file')

      rerender(<FileIcon extension="unknown" data-testid="file-icon" />)
      expect(screen.getByTestId('file-icon')).toHaveClass('icon--generic-file')
    })

    it('maps additional language extensions', () => {
      const { rerender } = render(<FileIcon extension="js" data-testid="file-icon" />)
      expect(screen.getByTestId('file-icon')).toHaveClass('icon--javascript')

      rerender(<FileIcon extension="ts" data-testid="file-icon" />)
      expect(screen.getByTestId('file-icon')).toHaveClass('icon--typescript')

      rerender(<FileIcon extension="go" data-testid="file-icon" />)
      expect(screen.getByTestId('file-icon')).toHaveClass('icon--go')

      rerender(<FileIcon extension="rs" data-testid="file-icon" />)
      expect(screen.getByTestId('file-icon')).toHaveClass('icon--rust')

      rerender(<FileIcon extension="json" data-testid="file-icon" />)
      expect(screen.getByTestId('file-icon')).toHaveClass('icon--json')

      rerender(<FileIcon extension="sh" data-testid="file-icon" />)
      expect(screen.getByTestId('file-icon')).toHaveClass('icon--bash')
    })
  })

  describe('CSS tokens', () => {
    it('icon CSS uses design tokens for sizing', () => {
      const cssContent = fs.readFileSync(
        path.join(__dirname, '../../components/ui/Icon/Icon.css'),
        'utf-8'
      )

      expect(cssContent).toContain('--icon-size-sm')
      expect(cssContent).toContain('--icon-size-md')
      expect(cssContent).toContain('--icon-size-lg')
    })

    it('folder icons use color tokens', () => {
      const cssContent = fs.readFileSync(
        path.join(__dirname, '../../components/ui/Icon/Icon.css'),
        'utf-8'
      )

      expect(cssContent).toContain('--color-icon-folder')
      expect(cssContent).toContain('--color-icon-folder-open')
    })
  })
})
