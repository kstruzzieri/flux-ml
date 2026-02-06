import { CSSProperties } from 'react'
import {
  ExperimentSelectionPanel,
  CompareMainPanel,
  AnalysisPanel,
  OutputPanel,
} from '../layout/panels'
import { useResize, useResizeInverted, useResizeVerticalInverted } from '../../hooks'
import { LayoutPersistence } from '../../hooks/useLayoutPersistence'
import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon } from '../ui/Icon'

const MIN_PANEL_SIZE = 100

interface CompareViewProps {
  layout: LayoutPersistence
}

export function CompareView({ layout }: CompareViewProps) {
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

  const contentStyle = {
    '--panel-left-width': layout.leftCollapsed ? '0px' : `${leftResize.size}px`,
    '--panel-right-width': layout.rightCollapsed ? '0px' : `${rightResize.size}px`,
    '--panel-output-height': layout.outputCollapsed ? '36px' : `${outputResize.size}px`,
  } as CSSProperties

  const leftColumnClasses = `content__left-column ${layout.leftCollapsed ? 'content__left-column--collapsed' : ''}`
  const rightColumnClasses = `content__right-column ${layout.rightCollapsed ? 'content__right-column--collapsed' : ''}`
  const outputPanelClasses = layout.outputCollapsed ? 'panel--collapsed' : ''

  return (
    <div className="content content--compare" data-testid="compare-view" style={contentStyle}>
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

      {/* Left column - Experiment selection */}
      <div className={leftColumnClasses} data-testid="left-column">
        <ExperimentSelectionPanel />

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

      <CompareMainPanel />

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

      {/* Right column - Analysis */}
      <div className={rightColumnClasses} data-testid="right-column">
        <AnalysisPanel />

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
