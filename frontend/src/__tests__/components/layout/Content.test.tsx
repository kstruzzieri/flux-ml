import { render, screen, fireEvent } from '@testing-library/react'
import { Content } from '@components/layout/Content'

describe('Content', () => {
  // Drag handles provide the visual affordance and interaction target for resizing.
  // Without visible handles, users wouldn't know panels are resizable.
  it('renders drag handles between resizable panels', () => {
    render(<Content />)

    // Vertical handle between left column and main content
    expect(screen.getByTestId('resize-handle-left')).toBeInTheDocument()
    // Vertical handle between main content and right column
    expect(screen.getByTestId('resize-handle-right')).toBeInTheDocument()
    // Horizontal handle above output panel
    expect(screen.getByTestId('resize-handle-output')).toBeInTheDocument()
    // Horizontal handle between Experiments and Files
    expect(screen.getByTestId('resize-handle-left-row')).toBeInTheDocument()
    // Horizontal handle between Inspector and Config
    expect(screen.getByTestId('resize-handle-right-row')).toBeInTheDocument()
  })

  // Users resize panels by dragging handles. The panel width should update
  // in real-time as the user drags, providing immediate visual feedback.
  it('updates left column width when handle is dragged', () => {
    render(<Content />)

    const handle = screen.getByTestId('resize-handle-left')
    const content = screen.getByTestId('content')

    // Simulate drag
    fireEvent.mouseDown(handle, { clientX: 280 })
    fireEvent.mouseMove(document, { clientX: 350 })
    fireEvent.mouseUp(document)

    // Check that CSS variable was updated
    expect(content.style.getPropertyValue('--panel-left-width')).toBe('350px')
  })

  // Minimum widths prevent panels from becoming too small to be useful.
  // Without constraints, users could accidentally hide important content.
  it('enforces minimum width when dragging left handle', () => {
    render(<Content />)

    const handle = screen.getByTestId('resize-handle-left')
    const content = screen.getByTestId('content')

    // Try to drag below minimum (200px)
    fireEvent.mouseDown(handle, { clientX: 280 })
    fireEvent.mouseMove(document, { clientX: 100 })
    fireEvent.mouseUp(document)

    // Should clamp to minimum
    expect(content.style.getPropertyValue('--panel-left-width')).toBe('200px')
  })

  // Cursor feedback indicates the drag operation is active and shows the
  // resize direction, following standard desktop UI conventions.
  it('shows resize cursor while dragging', () => {
    render(<Content />)

    const handle = screen.getByTestId('resize-handle-left')

    fireEvent.mouseDown(handle, { clientX: 280 })

    expect(document.body).toHaveClass('resizing-col')

    fireEvent.mouseUp(document)

    expect(document.body).not.toHaveClass('resizing-col')
  })

  // Hover state prepares the user for interaction, indicating that
  // the handle is interactive before they click.
  it('has col-resize cursor on vertical handle hover', () => {
    render(<Content />)

    const handle = screen.getByTestId('resize-handle-left')

    expect(handle).toHaveClass('resize-handle--vertical')
    // CSS will apply cursor: col-resize
  })

  // Users need to resize the right panel independently of the left.
  // Each column should have its own resize handle and state.
  it('updates right column width when handle is dragged', () => {
    render(<Content />)

    const handle = screen.getByTestId('resize-handle-right')
    const content = screen.getByTestId('content')

    // Simulate drag (moving left makes the right panel wider)
    fireEvent.mouseDown(handle, { clientX: 1000 })
    fireEvent.mouseMove(document, { clientX: 900 })
    fireEvent.mouseUp(document)

    // Check that CSS variable was updated (default is 320px, dragging left adds 100px)
    expect(content.style.getPropertyValue('--panel-right-width')).toBe('420px')
  })

  // The output panel resizes vertically, separate from column widths.
  // This allows users to see more or less of training output as needed.
  it('updates output panel height when handle is dragged', () => {
    render(<Content />)

    const handle = screen.getByTestId('resize-handle-output')
    const content = screen.getByTestId('content')

    // Simulate drag (moving up makes output taller)
    fireEvent.mouseDown(handle, { clientY: 600 })
    fireEvent.mouseMove(document, { clientY: 500 })
    fireEvent.mouseUp(document)

    // Check that CSS variable was updated
    expect(content.style.getPropertyValue('--panel-output-height')).toBe('280px')
  })

  // Horizontal handles need different cursor feedback than vertical handles.
  // This follows platform conventions for resize direction indication.
  it('has row-resize cursor on horizontal handle hover', () => {
    render(<Content />)

    const handle = screen.getByTestId('resize-handle-output')

    expect(handle).toHaveClass('resize-handle--horizontal')
    // CSS will apply cursor: row-resize
  })

  // Left column row divider allows resizing Experiments vs Files panels.
  // Users may want more space for experiments list or file tree.
  it('updates left top panel height when row handle is dragged', () => {
    render(<Content />)

    const handle = screen.getByTestId('resize-handle-left-row')
    const content = screen.getByTestId('content')

    // Simulate drag (moving down increases top panel height)
    fireEvent.mouseDown(handle, { clientY: 200 })
    fireEvent.mouseMove(document, { clientY: 300 })
    fireEvent.mouseUp(document)

    // Check that CSS variable was updated (default is 200px + 100px drag)
    expect(content.style.getPropertyValue('--panel-left-top-height')).toBe('300px')
  })

  // Right column row divider allows resizing Inspector vs Config panels.
  // Users may want more space for inspection details or configuration.
  it('updates right top panel height when row handle is dragged', () => {
    render(<Content />)

    const handle = screen.getByTestId('resize-handle-right-row')
    const content = screen.getByTestId('content')

    // Simulate drag (moving down increases top panel height)
    fireEvent.mouseDown(handle, { clientY: 200 })
    fireEvent.mouseMove(document, { clientY: 350 })
    fireEvent.mouseUp(document)

    // Check that CSS variable was updated (default is 200px + 150px drag)
    expect(content.style.getPropertyValue('--panel-right-top-height')).toBe('350px')
  })
})
