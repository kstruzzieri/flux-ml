import { render, screen } from '@testing-library/react'
import { MetricCard } from '@components/Experiments/MetricCard'

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
})
