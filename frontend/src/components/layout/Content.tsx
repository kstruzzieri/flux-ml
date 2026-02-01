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
const DEFAULT_LEFT_WIDTH = 280
const DEFAULT_RIGHT_WIDTH = 320
const DEFAULT_OUTPUT_HEIGHT = 180
const MAX_LEFT_WIDTH = 500
const MAX_RIGHT_WIDTH = 500
const MAX_OUTPUT_HEIGHT = 400

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

  const contentStyle = {
    '--panel-left-width': `${leftResize.size}px`,
    '--panel-right-width': `${rightResize.size}px`,
    '--panel-output-height': `${outputResize.size}px`,
  } as CSSProperties

  return (
    <div className="content" data-testid="content" style={contentStyle}>
      <ExperimentsPanel />
      <FilesPanel />

      {/* Left resize handle */}
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

      {/* Right resize handle */}
      <div
        className="resize-handle resize-handle--vertical resize-handle--right"
        data-testid="resize-handle-right"
        onMouseDown={rightResize.handleMouseDown}
      />

      <InspectorPanel />
      <ConfigPanel />
    </div>
  )
}
