import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SnakeGame } from '../SnakeGame'

describe('SnakeGame', () => {
  it('renders the menu with controls and exits on Escape', () => {
    const onExit = vi.fn()
    render(<SnakeGame onExit={onExit} />)
    expect(screen.getByText('SNAKE')).toBeInTheDocument()
    expect(screen.getByText(/ARROW KEYS OR WASD/)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onExit).toHaveBeenCalled()
  })

  it('starts on Enter', () => {
    render(<SnakeGame onExit={() => {}} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    // menu overlay is gone once playing
    expect(screen.queryByText(/ARROW KEYS OR WASD/)).not.toBeInTheDocument()
  })
})
