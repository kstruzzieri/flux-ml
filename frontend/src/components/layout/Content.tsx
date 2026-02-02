import { CSSProperties } from 'react'
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

export function Content() {
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
    '--panel-left-width': `${leftResize.size}px`,
    '--panel-right-width': `${rightResize.size}px`,
    '--panel-output-height': `${outputResize.size}px`,
    '--panel-left-top-height': `${leftRowResize.size}px`,
    '--panel-right-top-height': `${rightRowResize.size}px`,
  } as CSSProperties

  return (
    <div className="content" data-testid="content" style={contentStyle}>
      {/* Left column */}
      <div className="content__left-column">
        <ExperimentsPanel />

        {/* Left row resize handle (between Experiments and Files) */}
        <div
          className="resize-handle resize-handle--horizontal resize-handle--left-row"
          data-testid="resize-handle-left-row"
          onMouseDown={leftRowResize.handleMouseDown}
        />

        <FilesPanel />
      </div>

      {/* Left column resize handle */}
      <div
        className="resize-handle resize-handle--vertical resize-handle--left"
        data-testid="resize-handle-left"
        onMouseDown={leftResize.handleMouseDown}
      />

      <MainPanel />

      {/* Output resize handle */}
      <div
        className="resize-handle resize-handle--horizontal resize-handle--output"
        data-testid="resize-handle-output"
        onMouseDown={outputResize.handleMouseDown}
      />

      <OutputPanel />

      {/* Right column resize handle */}
      <div
        className="resize-handle resize-handle--vertical resize-handle--right"
        data-testid="resize-handle-right"
        onMouseDown={rightResize.handleMouseDown}
      />

      {/* Right column */}
      <div className="content__right-column">
        <InspectorPanel />

        {/* Right row resize handle (between Inspector and Config) */}
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
