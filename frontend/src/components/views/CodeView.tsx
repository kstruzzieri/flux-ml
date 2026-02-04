import { CSSProperties } from 'react'
import { FileTreePanel, CodeEditorPanel, OutputPanel } from '../layout/panels'
import { useResize, useResizeVerticalInverted } from '../../hooks'
import { LayoutPersistence } from '../../hooks/useLayoutPersistence'

const MIN_PANEL_SIZE = 100

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

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
    '--panel-left-width': layout.leftCollapsed ? '24px' : `${leftResize.size}px`,
    '--panel-right-width': '0px',
    '--panel-output-height': layout.outputCollapsed ? '36px' : `${outputResize.size}px`,
  } as CSSProperties

  const leftColumnClasses = `content__left-column ${layout.leftCollapsed ? 'content__left-column--collapsed' : ''}`
  const outputPanelClasses = layout.outputCollapsed ? 'panel--collapsed' : ''

  return (
    <div className="content content--code" data-testid="code-view" style={contentStyle}>
      {/* Left column - File tree */}
      <div className={leftColumnClasses} data-testid="left-column">
        {layout.leftCollapsed ? (
          <button
            className="collapse-btn collapse-btn--edge"
            data-testid="expand-left"
            onClick={() => layout.setLeftCollapsed(false)}
            aria-label="Expand left panel"
          >
            <ChevronRightIcon />
          </button>
        ) : (
          <>
            <FileTreePanel />

            <button
              className="collapse-btn collapse-btn--left-edge"
              data-testid="collapse-left"
              onClick={() => layout.setLeftCollapsed(true)}
              aria-label="Collapse left panel"
            >
              <ChevronLeftIcon />
            </button>
          </>
        )}
      </div>

      {!layout.leftCollapsed && (
        <div
          className="resize-handle resize-handle--vertical resize-handle--left"
          data-testid="resize-handle-left"
          onMouseDown={leftResize.handleMouseDown}
        />
      )}

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
  )
}
