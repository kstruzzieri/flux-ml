import { CSSProperties, useState } from 'react'
import {
  ExperimentsPanel,
  FilesPanel,
  MainPanel,
  InspectorPanel,
  ConfigPanel,
  OutputPanel,
} from './panels'
import { useResize, useResizeInverted, useResizeVerticalInverted } from '../../hooks'

const MIN_LEFT_WIDTH = 200
const MIN_RIGHT_WIDTH = 200
const MIN_OUTPUT_HEIGHT = 100
const MIN_ROW_HEIGHT = 120
const DEFAULT_LEFT_WIDTH = 280
const DEFAULT_RIGHT_WIDTH = 320
const DEFAULT_OUTPUT_HEIGHT = 180
const DEFAULT_LEFT_TOP_HEIGHT = 200
const DEFAULT_RIGHT_TOP_HEIGHT = 200
const MAX_LEFT_WIDTH = 500
const MAX_RIGHT_WIDTH = 500
const MAX_OUTPUT_HEIGHT = 400
const MAX_ROW_HEIGHT = 500

function CollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export function Content() {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [outputCollapsed, setOutputCollapsed] = useState(false)

  const leftResize = useResize({
    direction: 'vertical',
    initialSize: DEFAULT_LEFT_WIDTH,
    minSize: MIN_LEFT_WIDTH,
    maxSize: MAX_LEFT_WIDTH,
  })

  const rightResize = useResizeInverted({
    direction: 'vertical',
    initialSize: DEFAULT_RIGHT_WIDTH,
    minSize: MIN_RIGHT_WIDTH,
    maxSize: MAX_RIGHT_WIDTH,
  })

  const outputResize = useResizeVerticalInverted({
    initialSize: DEFAULT_OUTPUT_HEIGHT,
    minSize: MIN_OUTPUT_HEIGHT,
    maxSize: MAX_OUTPUT_HEIGHT,
  })

  // Row dividers within columns
  const leftRowResize = useResize({
    direction: 'horizontal',
    initialSize: DEFAULT_LEFT_TOP_HEIGHT,
    minSize: MIN_ROW_HEIGHT,
    maxSize: MAX_ROW_HEIGHT,
  })

  const rightRowResize = useResize({
    direction: 'horizontal',
    initialSize: DEFAULT_RIGHT_TOP_HEIGHT,
    minSize: MIN_ROW_HEIGHT,
    maxSize: MAX_ROW_HEIGHT,
  })

  const contentStyle = {
    '--panel-left-width': leftCollapsed ? '0px' : `${leftResize.size}px`,
    '--panel-right-width': rightCollapsed ? '0px' : `${rightResize.size}px`,
    '--panel-output-height': outputCollapsed ? '36px' : `${outputResize.size}px`,
    '--panel-left-top-height': `${leftRowResize.size}px`,
    '--panel-right-top-height': `${rightRowResize.size}px`,
  } as CSSProperties

  const leftColumnClasses = `content__left-column ${leftCollapsed ? 'content__left-column--collapsed' : ''}`
  const rightColumnClasses = `content__right-column ${rightCollapsed ? 'content__right-column--collapsed' : ''}`
  const outputPanelClasses = outputCollapsed ? 'panel--collapsed' : ''

  return (
    <div className="content" data-testid="content" style={contentStyle}>
      {/* Left column */}
      <div className={leftColumnClasses} data-testid="left-column">
        {!leftCollapsed && (
          <>
            <ExperimentsPanel />

            {/* Left row resize handle (between Experiments and Files) */}
            <div
              className="resize-handle resize-handle--horizontal resize-handle--left-row"
              data-testid="resize-handle-left-row"
              onMouseDown={leftRowResize.handleMouseDown}
            />

            <FilesPanel />
          </>
        )}

        {/* Collapse/Expand button for left column */}
        {leftCollapsed ? (
          <button
            className="collapse-btn collapse-btn--expand-left"
            data-testid="expand-left"
            onClick={() => setLeftCollapsed(false)}
            aria-label="Expand left panel"
          >
            <ExpandIcon />
          </button>
        ) : (
          <button
            className="collapse-btn collapse-btn--collapse-left"
            data-testid="collapse-left"
            onClick={() => setLeftCollapsed(true)}
            aria-label="Collapse left panel"
          >
            <CollapseIcon />
          </button>
        )}
      </div>

      {/* Left column resize handle */}
      {!leftCollapsed && (
        <div
          className="resize-handle resize-handle--vertical resize-handle--left"
          data-testid="resize-handle-left"
          onMouseDown={leftResize.handleMouseDown}
        />
      )}

      <MainPanel />

      {/* Output resize handle */}
      {!outputCollapsed && (
        <div
          className="resize-handle resize-handle--horizontal resize-handle--output"
          data-testid="resize-handle-output"
          onMouseDown={outputResize.handleMouseDown}
        />
      )}

      <OutputPanel
        collapsed={outputCollapsed}
        onToggleCollapse={() => setOutputCollapsed(!outputCollapsed)}
        className={outputPanelClasses}
      />

      {/* Right column resize handle */}
      {!rightCollapsed && (
        <div
          className="resize-handle resize-handle--vertical resize-handle--right"
          data-testid="resize-handle-right"
          onMouseDown={rightResize.handleMouseDown}
        />
      )}

      {/* Right column */}
      <div className={rightColumnClasses} data-testid="right-column">
        {!rightCollapsed && (
          <>
            <InspectorPanel />

            {/* Right row resize handle (between Inspector and Config) */}
            <div
              className="resize-handle resize-handle--horizontal resize-handle--right-row"
              data-testid="resize-handle-right-row"
              onMouseDown={rightRowResize.handleMouseDown}
            />

            <ConfigPanel />
          </>
        )}

        {/* Collapse/Expand button for right column */}
        {rightCollapsed ? (
          <button
            className="collapse-btn collapse-btn--expand-right"
            data-testid="expand-right"
            onClick={() => setRightCollapsed(false)}
            aria-label="Expand right panel"
          >
            <CollapseIcon />
          </button>
        ) : (
          <button
            className="collapse-btn collapse-btn--collapse-right"
            data-testid="collapse-right"
            onClick={() => setRightCollapsed(true)}
            aria-label="Collapse right panel"
          >
            <ExpandIcon />
          </button>
        )}
      </div>
    </div>
  )
}
