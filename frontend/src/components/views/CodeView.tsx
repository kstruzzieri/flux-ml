import { CSSProperties } from 'react'
import { FileTreePanel, CodeEditorPanel, OutputPanel } from '../layout/panels'
import { useResize, useResizeVerticalInverted } from '../../hooks'
import { LayoutPersistence } from '../../hooks/useLayoutPersistence'
import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon } from '../ui/Icon'

const MIN_PANEL_SIZE = 100

interface CodeViewProps {
  layout: LayoutPersistence
}

export function CodeView({ layout }: CodeViewProps) {
  const leftResize = useResize({
    direction: 'vertical',
    initialSize: layout.leftWidth,
    minSize: MIN_PANEL_SIZE,
    onResizeEnd: layout.setLeftWidth,
  })

  const outputResize = useResizeVerticalInverted({
    initialSize: layout.outputHeight,
    minSize: MIN_PANEL_SIZE,
    onResizeEnd: layout.setOutputHeight,
  })

  // Code view has no right column, so we use a 2-column layout
  const contentStyle = {
    '--panel-left-width': layout.leftCollapsed ? '0px' : `${leftResize.size}px`,
    '--panel-right-width': '0px',
    '--panel-output-height': layout.outputCollapsed ? '36px' : `${outputResize.size}px`,
  } as CSSProperties

  const leftColumnClasses = `content__left-column ${layout.leftCollapsed ? 'content__left-column--collapsed' : ''}`
  const outputPanelClasses = layout.outputCollapsed ? 'panel--collapsed' : ''

  return (
    <div className="content content--code" data-testid="code-view" style={contentStyle}>
      {/* Expand button when left is collapsed */}
      {layout.leftCollapsed && (
        <button
          className="collapse-btn collapse-btn--expand-left"
          data-testid="expand-left"
          onClick={() => layout.setLeftCollapsed(false)}
          aria-label="Expand left panel"
        >
          <ChevronRightIcon />
        </button>
      )}

      {/* Left column - File tree */}
      <div className={leftColumnClasses} data-testid="left-column">
        <FileTreePanel />

        <button
          className="collapse-btn collapse-btn--left-edge"
          data-testid="collapse-left"
          onClick={() => layout.setLeftCollapsed(true)}
          aria-label="Collapse left panel"
        >
          <ChevronLeftIcon />
        </button>
      </div>

      {!layout.leftCollapsed && (
        <div
          className="resize-handle resize-handle--vertical resize-handle--left"
          data-testid="resize-handle-left"
          onMouseDown={leftResize.handleMouseDown}
        />
      )}

      <div className="content__center">
        <CodeEditorPanel />

        {!layout.outputCollapsed && (
          <div
            className="resize-handle resize-handle--horizontal resize-handle--output"
            data-testid="resize-handle-output"
            onMouseDown={outputResize.handleMouseDown}
          />
        )}

        <div className="content__output-wrapper">
          <button
            className="collapse-btn collapse-btn--output-edge"
            data-testid="collapse-output"
            onClick={() => layout.setOutputCollapsed(!layout.outputCollapsed)}
            aria-label={layout.outputCollapsed ? 'Expand output panel' : 'Collapse output panel'}
          >
            {layout.outputCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
          <OutputPanel collapsed={layout.outputCollapsed} className={outputPanelClasses} />
        </div>
      </div>
    </div>
  )
}
