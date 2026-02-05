import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, Card, Badge, Input } from '@components/ui'

describe('Button', () => {
  // Buttons must be visible and interactive as the primary action element.
  it('renders with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  // Primary variant is the default call-to-action style with cyan accent.
  it('applies primary variant by default', () => {
    render(<Button>Primary</Button>)
    expect(screen.getByRole('button')).toHaveClass('button--primary')
  })

  // Secondary variant provides a subtle alternative for less prominent actions.
  it('applies secondary variant when specified', () => {
    render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('button--secondary')
  })

  // Danger variant signals destructive actions like delete or cancel.
  it('applies danger variant when specified', () => {
    render(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button')).toHaveClass('button--danger')
  })

  // Size variants allow buttons to fit different UI contexts (toolbars vs forms).
  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('button--sm')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('button--lg')
  })

  // Medium is the default size, used when no size prop is specified.
  it('applies medium size by default', () => {
    render(<Button>Default</Button>)
    expect(screen.getByRole('button')).toHaveClass('button--md')
  })

  // Disabled state prevents interaction and applies visual indication.
  it('handles disabled state', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  // Click handler enables button functionality.
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  // Disabled buttons must not trigger actions even if clicked.
  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    render(
      <Button onClick={handleClick} disabled>
        Click
      </Button>
    )
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  // Buttons should support standard button types for form submissions.
  it('supports button type attribute', () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  // Default type should be "button" to prevent accidental form submissions.
  it('defaults to type button', () => {
    render(<Button>Default</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})

describe('Card', () => {
  // Cards are container components that must render their children.
  it('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  // Accent bar provides visual hierarchy and categorization.
  it('applies accent bar with custom color', () => {
    render(<Card accentColor="var(--color-success)">Content</Card>)
    const card = screen.getByText('Content').closest('.card')
    expect(card).toHaveClass('card--accent')
  })

  // Alert variant signals important information requiring attention.
  it('applies alert variant', () => {
    render(<Card alert>Alert content</Card>)
    const card = screen.getByText('Alert content').closest('.card')
    expect(card).toHaveClass('card--alert')
  })

  // Hoverable cards indicate interactivity for clickable cards.
  it('applies hoverable styling', () => {
    render(<Card hoverable>Hover me</Card>)
    const card = screen.getByText('Hover me').closest('.card')
    expect(card).toHaveClass('card--hoverable')
  })

  // Cards should have the base card class for styling.
  it('has base card class', () => {
    render(<Card>Base card</Card>)
    const card = screen.getByText('Base card').closest('.card')
    expect(card).toHaveClass('card')
  })

  // Cards can accept additional className for composition.
  it('accepts custom className', () => {
    render(<Card className="custom-class">Custom</Card>)
    const card = screen.getByText('Custom').closest('.card')
    expect(card).toHaveClass('card', 'custom-class')
  })
})

describe('Badge', () => {
  // Badges display short labels or status indicators.
  it('renders with children', () => {
    render(<Badge>Label</Badge>)
    expect(screen.getByText('Label')).toBeInTheDocument()
  })

  // Default variant uses the primary accent color (cyan).
  it('applies default variant by default', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toHaveClass('badge--default')
  })

  // Success variant for positive states like "completed" or "active".
  it('applies success variant', () => {
    render(<Badge variant="success">Success</Badge>)
    expect(screen.getByText('Success')).toHaveClass('badge--success')
  })

  // Warning variant for caution states requiring attention.
  it('applies warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>)
    expect(screen.getByText('Warning')).toHaveClass('badge--warning')
  })

  // Error variant for failure states or critical issues.
  it('applies error variant', () => {
    render(<Badge variant="error">Error</Badge>)
    expect(screen.getByText('Error')).toHaveClass('badge--error')
  })

  // Muted variant for de-emphasized or secondary information.
  it('applies muted variant', () => {
    render(<Badge variant="muted">Muted</Badge>)
    expect(screen.getByText('Muted')).toHaveClass('badge--muted')
  })

  // Badges should have the base badge class for styling.
  it('has base badge class', () => {
    render(<Badge>Base</Badge>)
    expect(screen.getByText('Base')).toHaveClass('badge')
  })
})

describe('Input', () => {
  // Input placeholder provides hint text for expected input.
  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  // Icon slot allows adding visual context (search, user, etc.).
  it('renders with icon', () => {
    render(<Input icon={<span data-testid="icon">icon</span>} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByRole('textbox').closest('.input-wrapper')).toHaveClass(
      'input-wrapper--with-icon'
    )
  })

  // Error state provides visual feedback for invalid input.
  it('applies error styling', () => {
    render(<Input error />)
    expect(screen.getByRole('textbox')).toHaveClass('input--error')
  })

  // onChange handler enables controlled input behavior.
  it('calls onChange with value', async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} />)
    await user.type(screen.getByRole('textbox'), 'test')
    expect(handleChange).toHaveBeenLastCalledWith('test')
  })

  // Controlled value enables form state management.
  it('displays controlled value', () => {
    render(<Input value="controlled" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toHaveValue('controlled')
  })

  // Input should have the base input class for styling.
  it('has base input class', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toHaveClass('input')
  })

  // Disabled state prevents interaction.
  it('handles disabled state', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  // Input should support standard text input types.
  it('supports type attribute', () => {
    render(<Input type="password" />)
    // Password type doesn't use textbox role
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password')
  })
})
