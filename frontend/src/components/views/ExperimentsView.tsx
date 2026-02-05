import { CSSProperties } from 'react'
import {
  ExperimentsPanel,
  FilesPanel,
  MainPanel,
  InspectorPanel,
  ConfigPanel,
  OutputPanel,
} from '../layout/panels'
import { useResize, useResizeInverted, useResizeVerticalInverted } from '../../hooks'
import { LayoutPersistence } from '../../hooks/useLayoutPersistence'

const MIN_PANEL_SIZE = 100
const MIN_ROW_HEIGHT = 80

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

interface ExperimentsViewProps {
  layout: LayoutPersistence
}

export function ExperimentsView({ layout }: ExperimentsViewProps) {
  const leftResize = useResize({
    direction: 'vertical',
    initialSize: layout.leftWidth,
    minSize: MIN_PANEL_SIZE,
    onResizeEnd: layout.setLeftWidth,
  })

  const rightResize = useResizeInverted({
    direction: 'vertical',
    initialSize: layout.rightWidth,
    minSize: MIN_PANEL_SIZE,
    onResizeEnd: layout.setRightWidth,
  })

  const outputResize = useResizeVerticalInverted({
    initialSize: layout.outputHeight,
    minSize: MIN_PANEL_SIZE,
    onResizeEnd: layout.setOutputHeight,
  })

  const leftRowResize = useResize({
    direction: 'horizontal',
    initialSize: layout.leftTopHeight,
    minSize: MIN_ROW_HEIGHT,
    onResizeEnd: layout.setLeftTopHeight,
  })

  const rightRowResize = useResize({
    direction: 'horizontal',
    initialSize: layout.rightTopHeight,
    minSize: MIN_ROW_HEIGHT,
    onResizeEnd: layout.setRightTopHeight,
  })

  const contentStyle = {
    '--panel-left-width': layout.leftCollapsed ? '0px' : `${leftResize.size}px`,
    '--panel-right-width': layout.rightCollapsed ? '0px' : `${rightResize.size}px`,
    '--panel-output-height': layout.outputCollapsed ? '36px' : `${outputResize.size}px`,
    '--panel-left-top-height': `${leftRowResize.size}px`,
    '--panel-right-top-height': `${rightRowResize.size}px`,
  } as CSSProperties

  const leftColumnClasses = `content__left-column ${layout.leftCollapsed ? 'content__left-column--collapsed' : ''}`
  const rightColumnClasses = `content__right-column ${layout.rightCollapsed ? 'content__right-column--collapsed' : ''}`
  const outputPanelClasses = layout.outputCollapsed ? 'panel--collapsed' : ''

  return (
    <div className="content" data-testid="experiments-view" style={contentStyle}>
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

      {/* Left column */}
      <div className={leftColumnClasses} data-testid="left-column">
        <ExperimentsPanel />

        <div
          className="resize-handle resize-handle--horizontal resize-handle--left-row"
          data-testid="resize-handle-left-row"
          onMouseDown={leftRowResize.handleMouseDown}
        />

        <FilesPanel />

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

      <MainPanel />

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

      {!layout.rightCollapsed && (
        <div
          className="resize-handle resize-handle--vertical resize-handle--right"
          data-testid="resize-handle-right"
          onMouseDown={rightResize.handleMouseDown}
        />
      )}

      {/* Expand button when right is collapsed */}
      {layout.rightCollapsed && (
        <button
          className="collapse-btn collapse-btn--expand-right"
          data-testid="expand-right"
          onClick={() => layout.setRightCollapsed(false)}
          aria-label="Expand right panel"
        >
          <ChevronLeftIcon />
        </button>
      )}

      {/* Right column */}
      <div className={rightColumnClasses} data-testid="right-column">
        <InspectorPanel />

        <div
          className="resize-handle resize-handle--horizontal resize-handle--right-row"
          data-testid="resize-handle-right-row"
          onMouseDown={rightRowResize.handleMouseDown}
        />

        <ConfigPanel />

        <button
          className="collapse-btn collapse-btn--right-edge"
          data-testid="collapse-right"
          onClick={() => layout.setRightCollapsed(true)}
          aria-label="Collapse right panel"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  )
}
