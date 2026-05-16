import { render, screen } from '@testing-library/react'
import { RewardHackStatusCard } from '@components/Experiments/RewardHackStatusCard'
import type { DetectionStatus } from '@components/Experiments/RewardHackStatusCard'

const allClear: DetectionStatus[] = [
  { pattern: 'Length Gaming', status: 'clear', confidence: null },
  { pattern: 'Sycophancy', status: 'clear', confidence: null },
  { pattern: 'KL Drift', status: 'clear', confidence: null },
  { pattern: 'Reward Collapse', status: 'clear', confidence: null },
]

const withWarning: DetectionStatus[] = [
  { pattern: 'Length Gaming', status: 'clear', confidence: null },
  { pattern: 'Sycophancy', status: 'elevated', confidence: 0.68 },
  { pattern: 'KL Drift', status: 'monitoring', confidence: null },
  { pattern: 'Reward Collapse', status: 'clear', confidence: null },
]

describe('RewardHackStatusCard', () => {
  it('renders the card title', () => {
    render(<RewardHackStatusCard detections={allClear} />)
    expect(screen.getByText('Reward Hack Detection')).toBeInTheDocument()
  })

  it('renders all 4 detection pattern names', () => {
    render(<RewardHackStatusCard detections={allClear} />)
    expect(screen.getByText('Length Gaming')).toBeInTheDocument()
    expect(screen.getByText('Sycophancy')).toBeInTheDocument()
    expect(screen.getByText('KL Drift')).toBeInTheDocument()
    expect(screen.getByText('Reward Collapse')).toBeInTheDocument()
  })

  it('shows "No signal" label for clear status', () => {
    render(<RewardHackStatusCard detections={allClear} />)
    const labels = screen.getAllByText('No signal')
    expect(labels.length).toBe(4)
  })

  it('shows correct status labels for elevated and monitoring', () => {
    render(<RewardHackStatusCard detections={withWarning} />)
    expect(screen.getByText('Elevated')).toBeInTheDocument()
    expect(screen.getByText('Monitoring')).toBeInTheDocument()
  })

  it('renders confidence value when present', () => {
    render(<RewardHackStatusCard detections={withWarning} />)
    expect(screen.getByText('0.68')).toBeInTheDocument()
  })

  it('labels confidence as a heuristic score', () => {
    render(<RewardHackStatusCard detections={withWarning} />)
    expect(screen.getByLabelText('Sycophancy heuristic score')).toHaveAttribute(
      'title',
      'Heuristic score, not a calibrated probability'
    )
  })

  it('renders em dash for confidence when null', () => {
    render(<RewardHackStatusCard detections={allClear} />)
    const dashes = screen.getAllByTestId('detection-confidence')
    expect(dashes[0]).toHaveTextContent('\u2014')
  })

  it('applies healthy border when all patterns are clear', () => {
    const { container } = render(<RewardHackStatusCard detections={allClear} />)
    expect(container.firstChild).toHaveClass('metric-card--healthy')
  })

  it('applies warning border when any pattern is elevated', () => {
    const { container } = render(<RewardHackStatusCard detections={withWarning} />)
    expect(container.firstChild).toHaveClass('metric-card--warning')
  })

  it('applies critical border when any pattern is detected', () => {
    const detected: DetectionStatus[] = [
      { pattern: 'Length Gaming', status: 'detected', confidence: 0.92 },
      { pattern: 'Sycophancy', status: 'clear', confidence: null },
      { pattern: 'KL Drift', status: 'clear', confidence: null },
      { pattern: 'Reward Collapse', status: 'clear', confidence: null },
    ]
    const { container } = render(<RewardHackStatusCard detections={detected} />)
    expect(container.firstChild).toHaveClass('metric-card--critical')
  })

  it('shows summary footer with count of non-clear patterns', () => {
    render(<RewardHackStatusCard detections={withWarning} />)
    expect(screen.getByTestId('hack-summary')).toHaveTextContent('2 patterns under observation')
  })

  it('shows "All clear" summary when no patterns active', () => {
    render(<RewardHackStatusCard detections={allClear} />)
    expect(screen.getByTestId('hack-summary')).toHaveTextContent('All clear')
  })

  it('renders health dot for each detection row', () => {
    render(<RewardHackStatusCard detections={withWarning} />)
    const rows = screen.getAllByTestId('detection-row')
    expect(rows).toHaveLength(4)
  })

  it('displays step number when provided', () => {
    render(<RewardHackStatusCard detections={allClear} step={12400} />)
    expect(screen.getByText('Step 12,400')).toBeInTheDocument()
  })
})
