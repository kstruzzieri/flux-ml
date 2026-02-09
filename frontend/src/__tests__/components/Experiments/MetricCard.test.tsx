import { render, screen } from '@testing-library/react'
import { MetricCard } from '@components/Experiments/MetricCard'
import type { Point } from '@utils/downsample'

const SAMPLE_SPARKLINE: Point[] = [
  { step: 0, value: 0.391 },
  { step: 100, value: 0.38 },
  { step: 200, value: 0.36 },
  { step: 300, value: 0.35 },
  { step: 400, value: 0.342 },
]

describe('MetricCard', () => {
  it('renders label and formatted value', () => {
    render(
      <MetricCard label="Loss" value={0.2341} metricName="loss" trend="down" health="healthy" />
    )
    expect(screen.getByText('Loss')).toBeInTheDocument()
    expect(screen.getByText('0.2341')).toBeInTheDocument()
  })

  it('renders em dash for null value', () => {
    render(
      <MetricCard label="Loss" value={null} metricName="loss" trend="insufficient" health="none" />
    )
    expect(screen.getByText('\u2014')).toBeInTheDocument()
  })

  it('renders down arrow for decreasing trend', () => {
    render(<MetricCard label="Loss" value={0.5} metricName="loss" trend="down" health="healthy" />)
    expect(screen.getByTestId('trend-indicator')).toHaveTextContent('↓')
  })

  it('renders up arrow for increasing trend', () => {
    render(
      <MetricCard label="Reward" value={0.8} metricName="reward" trend="up" health="healthy" />
    )
    expect(screen.getByTestId('trend-indicator')).toHaveTextContent('↑')
  })

  it('renders flat indicator for flat trend', () => {
    render(<MetricCard label="KL" value={0.05} metricName="kl" trend="flat" health="healthy" />)
    expect(screen.getByTestId('trend-indicator')).toHaveTextContent('→')
  })

  it('does not render trend indicator when data is insufficient', () => {
    render(
      <MetricCard label="Loss" value={0.5} metricName="loss" trend="insufficient" health="none" />
    )
    expect(screen.queryByTestId('trend-indicator')).not.toBeInTheDocument()
  })

  it('applies healthy health class', () => {
    const { container } = render(
      <MetricCard label="Loss" value={0.5} metricName="loss" trend="down" health="healthy" />
    )
    expect(container.firstChild).toHaveClass('metric-card--healthy')
  })

  it('applies warning health class', () => {
    const { container } = render(
      <MetricCard label="Loss" value={0.5} metricName="loss" trend="flat" health="warning" />
    )
    expect(container.firstChild).toHaveClass('metric-card--warning')
  })

  it('applies critical health class', () => {
    const { container } = render(
      <MetricCard label="Loss" value={0.5} metricName="loss" trend="up" health="critical" />
    )
    expect(container.firstChild).toHaveClass('metric-card--critical')
  })

  it('has no health modifier class when health is none', () => {
    const { container } = render(
      <MetricCard label="LR" value={0.0003} metricName="learning_rate" trend="flat" health="none" />
    )
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('metric-card')
    expect(card).not.toHaveClass('metric-card--healthy')
    expect(card).not.toHaveClass('metric-card--warning')
    expect(card).not.toHaveClass('metric-card--critical')
  })

  it('renders inline sparkline SVG when sparklinePoints are provided', () => {
    render(
      <MetricCard
        label="Loss"
        value={0.342}
        metricName="loss"
        trend="down"
        health="healthy"
        sparklinePoints={SAMPLE_SPARKLINE}
      />
    )
    expect(screen.getByTestId('metric-sparkline')).toBeInTheDocument()
  })

  it('does not render sparkline when sparklinePoints is undefined', () => {
    render(
      <MetricCard label="Loss" value={0.342} metricName="loss" trend="down" health="healthy" />
    )
    expect(screen.queryByTestId('metric-sparkline')).not.toBeInTheDocument()
  })

  it('renders trend percentage when sparklinePoints are provided', () => {
    // 0.342 from 0.391 = (0.342 - 0.391) / 0.391 = -12.5%
    render(
      <MetricCard
        label="Loss"
        value={0.342}
        metricName="loss"
        trend="down"
        health="healthy"
        sparklinePoints={SAMPLE_SPARKLINE}
      />
    )
    const trendEl = screen.getByTestId('trend-indicator')
    expect(trendEl).toHaveTextContent(/-\d+\.?\d*%/)
  })

  it('renders subtitle showing start value', () => {
    render(
      <MetricCard
        label="Loss"
        value={0.342}
        metricName="loss"
        trend="down"
        health="healthy"
        sparklinePoints={SAMPLE_SPARKLINE}
      />
    )
    expect(screen.getByTestId('metric-subtitle')).toHaveTextContent('from 0.3910 at start')
  })

  it('does not render subtitle when sparklinePoints is undefined', () => {
    render(
      <MetricCard label="Loss" value={0.342} metricName="loss" trend="down" health="healthy" />
    )
    expect(screen.queryByTestId('metric-subtitle')).not.toBeInTheDocument()
  })

  it('formats subtitle start value using metric-specific formatting', () => {
    const klPoints: Point[] = [
      { step: 0, value: 0.000012 },
      { step: 100, value: 0.000014 },
      { step: 200, value: 0.000016 },
      { step: 300, value: 0.000018 },
      { step: 400, value: 0.00002 },
    ]
    render(
      <MetricCard
        label="KL Divergence"
        value={0.00002}
        metricName="kl"
        trend="up"
        health="warning"
        sparklinePoints={klPoints}
      />
    )
    expect(screen.getByTestId('metric-subtitle')).toHaveTextContent('from 0.000012 at start')
  })
})
