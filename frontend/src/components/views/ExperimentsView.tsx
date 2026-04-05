import { CSSProperties, useRef } from 'react'
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
import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon } from '../ui/Icon'

const MIN_PANEL_SIZE = 100
const MIN_ROW_HEIGHT = 80
// Reserve space for the bottom panel header + some content
const MIN_BOTTOM_PANEL_HEIGHT = 120

interface ExperimentsViewProps {
  layout: LayoutPersistence
}

export function ExperimentsView({ layout }: ExperimentsViewProps) {
  const leftColumnRef = useRef<HTMLDivElement>(null)
  const rightColumnRef = useRef<HTMLDivElement>(null)

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
    containerRef: leftColumnRef,
    reserveSpace: MIN_BOTTOM_PANEL_HEIGHT,
  })

  const rightRowResize = useResize({
    direction: 'horizontal',
    initialSize: layout.rightTopHeight,
    minSize: MIN_ROW_HEIGHT,
    onResizeEnd: layout.setRightTopHeight,
    containerRef: rightColumnRef,
    reserveSpace: MIN_BOTTOM_PANEL_HEIGHT,
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
      {/* Left column */}
      <div ref={leftColumnRef} className={leftColumnClasses} data-testid="left-column">
        <ExperimentsPanel />

        <div
          className="resize-handle resize-handle--horizontal resize-handle--left-row"
          data-testid="resize-handle-left-row"
          onMouseDown={leftRowResize.handleMouseDown}
        />

        <FilesPanel />
      </div>

      {/* Left ↔ Center resize handle with embedded collapse/expand button */}
      {layout.leftCollapsed ? (
        <div
          className="resize-handle resize-handle--vertical resize-handle--left resize-handle--collapsed"
          data-testid="resize-handle-left"
        >
          <button
            className="collapse-btn"
            data-testid="expand-left"
            onClick={() => layout.setLeftCollapsed(false)}
            aria-label="Expand left panel"
          >
            <ChevronRightIcon />
          </button>
        </div>
      ) : (
        <div
          className="resize-handle resize-handle--vertical resize-handle--left"
          data-testid="resize-handle-left"
          onMouseDown={leftResize.handleMouseDown}
        >
          <button
            className="collapse-btn"
            data-testid="collapse-left"
            onClick={(e) => {
              e.stopPropagation()
              layout.setLeftCollapsed(true)
            }}
            aria-label="Collapse left panel"
          >
            <ChevronLeftIcon />
          </button>
        </div>
      )}

      <div className="content__center">
        <MainPanel />

        {/* Main ↔ Output resize handle with embedded collapse/expand button */}
        {layout.outputCollapsed ? (
          <div
            className="resize-handle resize-handle--horizontal resize-handle--output resize-handle--collapsed"
            data-testid="resize-handle-output"
          >
            <button
              className="collapse-btn"
              data-testid="collapse-output"
              onClick={() => layout.setOutputCollapsed(false)}
              aria-label="Expand output panel"
            >
              <ChevronUpIcon />
            </button>
          </div>
        ) : (
          <div
            className="resize-handle resize-handle--horizontal resize-handle--output"
            data-testid="resize-handle-output"
            onMouseDown={outputResize.handleMouseDown}
          >
            <button
              className="collapse-btn"
              data-testid="collapse-output"
              onClick={(e) => {
                e.stopPropagation()
                layout.setOutputCollapsed(true)
              }}
              aria-label="Collapse output panel"
            >
              <ChevronDownIcon />
            </button>
          </div>
        )}

        <div className="content__output-wrapper">
          <OutputPanel collapsed={layout.outputCollapsed} className={outputPanelClasses} />
        </div>
      </div>

      {/* Center ↔ Right resize handle with embedded collapse/expand button */}
      {layout.rightCollapsed ? (
        <div
          className="resize-handle resize-handle--vertical resize-handle--right resize-handle--collapsed"
          data-testid="resize-handle-right"
        >
          <button
            className="collapse-btn"
            data-testid="expand-right"
            onClick={() => layout.setRightCollapsed(false)}
            aria-label="Expand right panel"
          >
            <ChevronLeftIcon />
          </button>
        </div>
      ) : (
        <div
          className="resize-handle resize-handle--vertical resize-handle--right"
          data-testid="resize-handle-right"
          onMouseDown={rightResize.handleMouseDown}
        >
          <button
            className="collapse-btn"
            data-testid="collapse-right"
            onClick={(e) => {
              e.stopPropagation()
              layout.setRightCollapsed(true)
            }}
            aria-label="Collapse right panel"
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}

      {/* Right column */}
      <div ref={rightColumnRef} className={rightColumnClasses} data-testid="right-column">
        <InspectorPanel />

        <div
          className="resize-handle resize-handle--horizontal resize-handle--right-row"
          data-testid="resize-handle-right-row"
          onMouseDown={rightRowResize.handleMouseDown}
        />

        <ConfigPanel />
      </div>
    </div>
  )
}
