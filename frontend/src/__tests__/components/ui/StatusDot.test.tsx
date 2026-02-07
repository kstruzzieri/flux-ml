import { render, screen } from '@testing-library/react'
import { StatusDot } from '@components/ui/StatusDot/StatusDot'

describe('StatusDot', () => {
  it('renders with running status and correct class', () => {
    render(<StatusDot status="running" />)
    const dot = screen.getByRole('img', { name: 'Running' })
    expect(dot).toHaveClass('status-dot', 'status-dot--running')
  })

  it('renders with completed status and correct class', () => {
    render(<StatusDot status="completed" />)
    const dot = screen.getByRole('img', { name: 'Completed' })
    expect(dot).toHaveClass('status-dot', 'status-dot--completed')
  })

  it('renders with failed status and correct class', () => {
    render(<StatusDot status="failed" />)
    const dot = screen.getByRole('img', { name: 'Failed' })
    expect(dot).toHaveClass('status-dot', 'status-dot--failed')
  })

  it('renders with pending status and correct class', () => {
    render(<StatusDot status="pending" />)
    const dot = screen.getByRole('img', { name: 'Pending' })
    expect(dot).toHaveClass('status-dot', 'status-dot--pending')
  })

  it('applies pulse animation class only to running status', () => {
    const { rerender } = render(<StatusDot status="running" />)
    expect(screen.getByRole('img', { name: 'Running' })).toHaveClass('status-dot--pulse')

    rerender(<StatusDot status="completed" />)
    expect(screen.getByRole('img', { name: 'Completed' })).not.toHaveClass('status-dot--pulse')

    rerender(<StatusDot status="failed" />)
    expect(screen.getByRole('img', { name: 'Failed' })).not.toHaveClass('status-dot--pulse')

    rerender(<StatusDot status="pending" />)
    expect(screen.getByRole('img', { name: 'Pending' })).not.toHaveClass('status-dot--pulse')
  })

  it('accepts custom className', () => {
    render(<StatusDot status="running" className="my-custom" />)
    const dot = screen.getByRole('img', { name: 'Running' })
    expect(dot).toHaveClass('status-dot', 'my-custom')
  })

  it('renders small size when size is sm', () => {
    render(<StatusDot status="running" size="sm" />)
    const dot = screen.getByRole('img', { name: 'Running' })
    expect(dot).toHaveClass('status-dot--sm')
  })

  it('renders medium size by default', () => {
    render(<StatusDot status="running" />)
    const dot = screen.getByRole('img', { name: 'Running' })
    expect(dot).toHaveClass('status-dot--md')
  })
})
