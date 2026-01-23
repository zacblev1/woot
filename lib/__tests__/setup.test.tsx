import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Test Setup', () => {
  it('vitest runs successfully', () => {
    expect(true).toBe(true)
  })

  it('renders React components', () => {
    render(<div data-testid="test">Hello</div>)
    expect(screen.getByTestId('test')).toBeInTheDocument()
  })

  it('jest-dom matchers work', () => {
    render(<button disabled>Click</button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
