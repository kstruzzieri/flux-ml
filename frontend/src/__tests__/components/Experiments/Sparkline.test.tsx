import { render } from '@testing-library/react'
import { Sparkline } from '@components/Experiments/Sparkline'

describe('Sparkline', () => {
  it('renders SVG polyline with correct points', () => {
    const data = [
      { step: 0, value: 1.0 },
      { step: 1, value: 2.0 },
      { step: 2, value: 1.5 },
    ]
    const { container } = render(<Sparkline data={data} color="#06b6d4" />)
    const polyline = container.querySelector('polyline')
    expect(polyline).toBeInTheDocument()
    const points = polyline!.getAttribute('points')!.split(' ')
    expect(points).toHaveLength(3)
  })

  it('renders circle for single data point', () => {
    const data = [{ step: 0, value: 5.0 }]
    const { container } = render(<Sparkline data={data} color="#06b6d4" />)
    expect(container.querySelector('circle')).toBeInTheDocument()
    expect(container.querySelector('polyline')).not.toBeInTheDocument()
  })

  it('renders nothing when data is empty', () => {
    const { container } = render(<Sparkline data={[]} color="#06b6d4" />)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders gradient fill when showFill is true', () => {
    const data = [
      { step: 0, value: 1.0 },
      { step: 1, value: 2.0 },
      { step: 2, value: 1.5 },
    ]
    const { container } = render(<Sparkline data={data} color="#06b6d4" showFill={true} />)
    expect(container.querySelector('linearGradient')).toBeInTheDocument()
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBeGreaterThanOrEqual(1)
  })

  it('omits gradient fill when showFill is false', () => {
    const data = [
      { step: 0, value: 1.0 },
      { step: 1, value: 2.0 },
      { step: 2, value: 1.5 },
    ]
    const { container } = render(<Sparkline data={data} color="#06b6d4" showFill={false} />)
    expect(container.querySelector('linearGradient')).not.toBeInTheDocument()
  })
})
