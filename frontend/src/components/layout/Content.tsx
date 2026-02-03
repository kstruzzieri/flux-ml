import { CSSProperties } from 'react'
import {
  ExperimentsPanel,
  FilesPanel,
  MainPanel,
  InspectorPanel,
  ConfigPanel,
  OutputPanel,
} from './panels'
import {
  useResize,
  useResizeInverted,
  useResizeVerticalInverted,
  useLayoutPersistence,
} from '../../hooks'

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

export function Content() {
  // Layout persistence - restores sizes and collapsed states from localStorage
  const layout = useLayoutPersistence()

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

  // Row dividers within columns
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
    '--panel-left-width': layout.leftCollapsed ? '24px' : `${leftResize.size}px`,
    '--panel-right-width': layout.rightCollapsed ? '24px' : `${rightResize.size}px`,
    '--panel-output-height': layout.outputCollapsed ? '36px' : `${outputResize.size}px`,
    '--panel-left-top-height': `${leftRowResize.size}px`,
    '--panel-right-top-height': `${rightRowResize.size}px`,
  } as CSSProperties

  const leftColumnClasses = `content__left-column ${layout.leftCollapsed ? 'content__left-column--collapsed' : ''}`
  const rightColumnClasses = `content__right-column ${layout.rightCollapsed ? 'content__right-column--collapsed' : ''}`
  const outputPanelClasses = layout.outputCollapsed ? 'panel--collapsed' : ''

  return (
    <div className="content" data-testid="content" style={contentStyle}>
      {/* Left column */}
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
            <ExperimentsPanel />

            {/* Left row resize handle (between Experiments and Files) */}
            <div
              className="resize-handle resize-handle--horizontal resize-handle--left-row"
              data-testid="resize-handle-left-row"
              onMouseDown={leftRowResize.handleMouseDown}
            />

            <FilesPanel />

            {/* Collapse button on inner edge */}
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

      {/* Left column resize handle */}
      {!layout.leftCollapsed && (
        <div
          className="resize-handle resize-handle--vertical resize-handle--left"
          data-testid="resize-handle-left"
          onMouseDown={leftResize.handleMouseDown}
        />
      )}

      <MainPanel />

      {/* Output resize handle */}
      {!layout.outputCollapsed && (
        <div
          className="resize-handle resize-handle--horizontal resize-handle--output"
          data-testid="resize-handle-output"
          onMouseDown={outputResize.handleMouseDown}
        />
      )}

      {/* Output panel wrapper for collapse button positioning */}
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

      {/* Right column resize handle */}
      {!layout.rightCollapsed && (
        <div
          className="resize-handle resize-handle--vertical resize-handle--right"
          data-testid="resize-handle-right"
          onMouseDown={rightResize.handleMouseDown}
        />
      )}

      {/* Right column */}
      <div className={rightColumnClasses} data-testid="right-column">
        {layout.rightCollapsed ? (
          <button
            className="collapse-btn collapse-btn--edge"
            data-testid="expand-right"
            onClick={() => layout.setRightCollapsed(false)}
            aria-label="Expand right panel"
          >
            <ChevronLeftIcon />
          </button>
        ) : (
          <>
            <InspectorPanel />

            {/* Right row resize handle (between Inspector and Config) */}
            <div
              className="resize-handle resize-handle--horizontal resize-handle--right-row"
              data-testid="resize-handle-right-row"
              onMouseDown={rightRowResize.handleMouseDown}
            />

            <ConfigPanel />

            {/* Collapse button on inner edge */}
            <button
              className="collapse-btn collapse-btn--right-edge"
              data-testid="collapse-right"
              onClick={() => layout.setRightCollapsed(true)}
              aria-label="Collapse right panel"
            >
              <ChevronRightIcon />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
