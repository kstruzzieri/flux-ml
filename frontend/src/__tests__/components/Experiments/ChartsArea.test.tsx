import { render, screen, fireEvent } from '@testing-library/react'
import { ChartsArea } from '@components/Experiments/ChartsArea'

describe('ChartsArea', () => {
  it('renders three chart tabs', () => {
    render(<ChartsArea />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Reward Components')).toBeInTheDocument()
    expect(screen.getByText('Diagnostics')).toBeInTheDocument()
  })

  it('has Overview tab active by default', () => {
    render(<ChartsArea />)
    expect(screen.getByText('Overview').closest('button')).toHaveClass('chart-tab--active')
  })

  it('switches active tab on click', () => {
    render(<ChartsArea />)
    fireEvent.click(screen.getByText('Reward Components'))
    expect(screen.getByText('Reward Components').closest('button')).toHaveClass('chart-tab--active')
    expect(screen.getByText('Overview').closest('button')).not.toHaveClass('chart-tab--active')
  })

  it('shows placeholder content in chart body', () => {
    render(<ChartsArea />)
    expect(screen.getByText('Chart visualization coming soon')).toBeInTheDocument()
  })
})
