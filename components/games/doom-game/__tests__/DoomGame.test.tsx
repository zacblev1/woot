import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DoomGame } from '../DoomGame'

describe('DoomGame', () => {
  it('renders the menu with controls and exits on Escape', () => {
    const onExit = vi.fn()
    render(<DoomGame onExit={onExit} />)
    expect(screen.getByText('DOOM')).toBeInTheDocument()
    expect(screen.getByText(/SPACE SHOOT/)).toBeInTheDocument()
    expect(screen.getByText(/the old codes still work/)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onExit).toHaveBeenCalled()
  })

  it('starts on Enter', () => {
    render(<DoomGame onExit={() => {}} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(screen.queryByText(/RIP AND TEAR/)).not.toBeInTheDocument()
    // HUD appears once playing
    expect(screen.getByText(/AMMO 50/)).toBeInTheDocument()
  })
})
