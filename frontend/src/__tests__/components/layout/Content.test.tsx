import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExperimentsView } from '@components/views/ExperimentsView'
import { DEFAULT_LAYOUT, LayoutPersistence } from '../../../hooks/useLayoutPersistence'

// Mock Wails bindings
jest.mock('../../../../wailsjs/go/main/App', () => ({
  GetLayout: jest.fn().mockResolvedValue({
    leftWidth: 280,
    rightWidth: 320,
    outputHeight: 180,
    leftTopHeight: 200,
    rightTopHeight: 200,
    leftCollapsed: false,
    rightCollapsed: false,
    outputCollapsed: false,
  }),
  SaveLayout: jest.fn().mockResolvedValue(undefined),
}))

// Create a mock layout object for testing
function createMockLayout(overrides = {}): LayoutPersistence {
  const state = { ...DEFAULT_LAYOUT, ...overrides }
  return {
    ...state,
    isLoaded: true,
    setLeftWidth: jest.fn(),
    setRightWidth: jest.fn(),
    setOutputHeight: jest.fn(),
    setLeftTopHeight: jest.fn(),
    setRightTopHeight: jest.fn(),
    setLeftCollapsed: jest.fn((collapsed: boolean) => {
      state.leftCollapsed = collapsed
    }),
    setRightCollapsed: jest.fn((collapsed: boolean) => {
      state.rightCollapsed = collapsed
    }),
    setOutputCollapsed: jest.fn((collapsed: boolean) => {
      state.outputCollapsed = collapsed
    }),
  }
}

describe('ExperimentsView', () => {
  beforeEach(() => {
    // Clear localStorage to reset layout state between tests
    localStorage.clear()
    jest.clearAllMocks()
  })

  // Drag handles provide the visual affordance and interaction target for resizing.
  // Without visible handles, users wouldn't know panels are resizable.
  it('renders drag handles between resizable panels', () => {
    const layout = createMockLayout()
    render(<ExperimentsView layout={layout} />)

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
    const layout = createMockLayout()
    render(<ExperimentsView layout={layout} />)

    const handle = screen.getByTestId('resize-handle-left')
    const content = screen.getByTestId('experiments-view')

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
    const layout = createMockLayout()
    render(<ExperimentsView layout={layout} />)

    const handle = screen.getByTestId('resize-handle-left')
    const content = screen.getByTestId('experiments-view')

    // Try to drag below minimum (100px)
    fireEvent.mouseDown(handle, { clientX: 280 })
    fireEvent.mouseMove(document, { clientX: 50 })
    fireEvent.mouseUp(document)

    // Should clamp to minimum
    expect(content.style.getPropertyValue('--panel-left-width')).toBe('100px')
  })

  // Cursor feedback indicates the drag operation is active and shows the
  // resize direction, following standard desktop UI conventions.
  it('shows resize cursor while dragging', () => {
    const layout = createMockLayout()
    render(<ExperimentsView layout={layout} />)

    const handle = screen.getByTestId('resize-handle-left')

    fireEvent.mouseDown(handle, { clientX: 280 })

    expect(document.body).toHaveClass('resizing-col')

    fireEvent.mouseUp(document)

    expect(document.body).not.toHaveClass('resizing-col')
  })

  // Hover state prepares the user for interaction, indicating that
  // the handle is interactive before they click.
  it('has col-resize cursor on vertical handle hover', () => {
    const layout = createMockLayout()
    render(<ExperimentsView layout={layout} />)

    const handle = screen.getByTestId('resize-handle-left')

    expect(handle).toHaveClass('resize-handle--vertical')
    // CSS will apply cursor: col-resize
  })

  // Users need to resize the right panel independently of the left.
  // Each column should have its own resize handle and state.
  it('updates right column width when handle is dragged', () => {
    const layout = createMockLayout()
    render(<ExperimentsView layout={layout} />)

    const handle = screen.getByTestId('resize-handle-right')
    const content = screen.getByTestId('experiments-view')

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
    const layout = createMockLayout()
    render(<ExperimentsView layout={layout} />)

    const handle = screen.getByTestId('resize-handle-output')
    const content = screen.getByTestId('experiments-view')

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
    const layout = createMockLayout()
    render(<ExperimentsView layout={layout} />)

    const handle = screen.getByTestId('resize-handle-output')

    expect(handle).toHaveClass('resize-handle--horizontal')
    // CSS will apply cursor: row-resize
  })

  // Left column row divider allows resizing Experiments vs Files panels.
  // Users may want more space for experiments list or file tree.
  it('updates left top panel height when row handle is dragged', () => {
    const layout = createMockLayout()
    render(<ExperimentsView layout={layout} />)

    const handle = screen.getByTestId('resize-handle-left-row')
    const content = screen.getByTestId('experiments-view')

    // Simulate drag (moving down increases top panel height)
    fireEvent.mouseDown(handle, { clientY: 200 })
    fireEvent.mouseMove(document, { clientY: 300 })
    fireEvent.mouseUp(document)

    // Check that CSS variable was updated (default is 500px + 100px drag)
    expect(content.style.getPropertyValue('--panel-left-top-height')).toBe('600px')
  })

  // Right column row divider allows resizing Inspector vs Config panels.
  // Users may want more space for inspection details or configuration.
  it('updates right top panel height when row handle is dragged', () => {
    const layout = createMockLayout()
    render(<ExperimentsView layout={layout} />)

    const handle = screen.getByTestId('resize-handle-right-row')
    const content = screen.getByTestId('experiments-view')

    // Simulate drag (moving down increases top panel height)
    fireEvent.mouseDown(handle, { clientY: 200 })
    fireEvent.mouseMove(document, { clientY: 350 })
    fireEvent.mouseUp(document)

    // Check that CSS variable was updated (default is 450px + 150px drag)
    expect(content.style.getPropertyValue('--panel-right-top-height')).toBe('600px')
  })

  // ========================================
  // Panel Collapse/Expand Tests (Issue #8)
  // ========================================

  // Users need a visible control to collapse the left panel.
  // The button should be accessible in the column area.
  it('renders collapse button for left column', () => {
    const layout = createMockLayout()
    render(<ExperimentsView layout={layout} />)

    expect(screen.getByTestId('collapse-left')).toBeInTheDocument()
  })

  // When collapsed, the experiments and files panels should be hidden,
  // leaving only the activity bar visible for navigation.
  it('collapses left column when collapse button is clicked', async () => {
    const user = userEvent.setup()
    const layout = createMockLayout()
    const { rerender } = render(<ExperimentsView layout={layout} />)

    await user.click(screen.getByTestId('collapse-left'))

    // Rerender with updated layout state
    const updatedLayout = createMockLayout({ leftCollapsed: true })
    rerender(<ExperimentsView layout={updatedLayout} />)

    expect(screen.getByTestId('left-column')).toHaveClass('content__left-column--collapsed')
  })

  // When collapsed, users need a way to restore the panels.
  // An expand button should appear in place of the collapse button.
  it('shows expand button when left column is collapsed', () => {
    const layout = createMockLayout({ leftCollapsed: true })
    render(<ExperimentsView layout={layout} />)

    expect(screen.getByTestId('expand-left')).toBeInTheDocument()
  })

  // The right column (Inspector/Config) should collapse to just a thin
  // handle on the edge, maximizing space for main content.
  it('collapses right column when collapse button is clicked', async () => {
    const user = userEvent.setup()
    const layout = createMockLayout()
    const { rerender } = render(<ExperimentsView layout={layout} />)

    await user.click(screen.getByTestId('collapse-right'))

    // Rerender with updated layout state
    const updatedLayout = createMockLayout({ rightCollapsed: true })
    rerender(<ExperimentsView layout={updatedLayout} />)

    expect(screen.getByTestId('right-column')).toHaveClass('content__right-column--collapsed')
  })

  // The output panel should show only its tab bar when collapsed,
  // preserving tab access while hiding the terminal content.
  it('collapses bottom panel to tabs only', async () => {
    const user = userEvent.setup()
    const layout = createMockLayout()
    const { rerender } = render(<ExperimentsView layout={layout} />)

    await user.click(screen.getByTestId('collapse-output'))

    // Rerender with updated layout state
    const updatedLayout = createMockLayout({ outputCollapsed: true })
    rerender(<ExperimentsView layout={updatedLayout} />)

    expect(screen.getByTestId('output-panel')).toHaveClass('panel--collapsed')
  })

  // Users should be able to toggle between collapsed and expanded states
  // with repeated clicks on the collapse/expand buttons.
  it('expands left column when expand button is clicked', async () => {
    const user = userEvent.setup()
    // Start collapsed
    const layout = createMockLayout({ leftCollapsed: true })
    const { rerender } = render(<ExperimentsView layout={layout} />)

    expect(screen.getByTestId('left-column')).toHaveClass('content__left-column--collapsed')

    await user.click(screen.getByTestId('expand-left'))

    // Rerender with updated layout state
    const updatedLayout = createMockLayout({ leftCollapsed: false })
    rerender(<ExperimentsView layout={updatedLayout} />)

    expect(screen.getByTestId('left-column')).not.toHaveClass('content__left-column--collapsed')
  })
})
