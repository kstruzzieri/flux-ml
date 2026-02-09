import { render, screen } from '@testing-library/react'
import { RewardComponentsCard } from '@components/Experiments/RewardComponentsCard'

describe('RewardComponentsCard', () => {
  const balancedComponents = [
    { component: 'helpfulness', value: 0.82, step: 100 },
    { component: 'harmlessness', value: 0.74, step: 100 },
    { component: 'honesty', value: 0.79, step: 100 },
  ]

  it('renders all three component labels', () => {
    render(<RewardComponentsCard components={balancedComponents} />)
    expect(screen.getByText('Helpfulness')).toBeInTheDocument()
    expect(screen.getByText('Harmlessness')).toBeInTheDocument()
    expect(screen.getByText('Honesty')).toBeInTheDocument()
  })

  it('renders component values', () => {
    render(<RewardComponentsCard components={balancedComponents} />)
    expect(screen.getByText('0.82')).toBeInTheDocument()
    expect(screen.getByText('0.74')).toBeInTheDocument()
    expect(screen.getByText('0.79')).toBeInTheDocument()
  })

  it('displays step number', () => {
    render(<RewardComponentsCard components={balancedComponents} />)
    expect(screen.getByText('Step 100')).toBeInTheDocument()
  })

  it('applies healthy class when components are balanced', () => {
    const { container } = render(<RewardComponentsCard components={balancedComponents} />)
    expect(container.firstChild).toHaveClass('metric-card--healthy')
  })

  it('applies warning class when components diverge', () => {
    const diverged = [
      { component: 'helpfulness', value: 0.8, step: 100 },
      { component: 'harmlessness', value: 0.3, step: 100 },
      { component: 'honesty', value: 0.7, step: 100 },
    ]
    const { container } = render(<RewardComponentsCard components={diverged} />)
    expect(container.firstChild).toHaveClass('metric-card--warning')
  })

  it('renders bar elements for each component', () => {
    render(<RewardComponentsCard components={balancedComponents} />)
    const bars = screen.getAllByTestId('reward-bar')
    expect(bars).toHaveLength(3)
  })

  it('renders empty state when no components', () => {
    render(<RewardComponentsCard components={[]} />)
    expect(screen.getByText('No reward signal data')).toBeInTheDocument()
  })
})
