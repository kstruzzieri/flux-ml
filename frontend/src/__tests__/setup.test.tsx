import { render, screen } from '@testing-library/react'

describe('Test Setup', () => {
  it('runs TypeScript tests', () => {
    const add = (a: number, b: number): number => a + b
    expect(add(1, 2)).toBe(3)
  })

  it('supports React Testing Library', () => {
    render(<div>Hello</div>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('supports jest-dom matchers', () => {
    render(<button disabled>Click me</button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
